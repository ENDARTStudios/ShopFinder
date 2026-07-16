/**
 * @workspace/application/bus — Command Bus & Query Bus
 *
 * Per Rec of 05 feedback: CommandBus wraps handlers in UnitOfWork + Pipeline.
 * Handlers never open transactions directly.
 *
 * Flow:
 *   CommandBus.execute(command, ctx)
 *     → Pipeline (validation → auth → idempotency → logging → metrics)
 *       → UnitOfWork.transaction(async (repos) => {
 *           handler.handle(payload, ctx, repos)
 *           → repository.save(aggregate) → collectEvents()
 *           → UoW persists outbox + commits
 *         })
 */

import type {
  CommandHandler,
  QueryHandler,
  RequestContext,
  CommandResult,
  QueryResult,
  ApplicationError
} from "./types";
import { AppErrors, ok, fail } from "./types";
import type { Pipeline, MiddlewareResult } from "./pipeline";
import {
  createPipeline,
  validationMiddleware,
  authorizationMiddleware,
  loggingMiddleware,
  metricsMiddleware
} from "./pipeline";
import type { ZodSchema } from "zod";
import type { PrismaUnitOfWork, PrismaRepositoryFactory } from "@workspace/database";

// ── Command Bus ─────────────────────────────────────────────

export class CommandBus {
  private readonly handlers = new Map<string, CommandHandler<any, any>>();
  private readonly schemas = new Map<string, ZodSchema<any>>();
  private readonly authFns = new Map<
    string,
    ((payload: any, ctx: RequestContext) => boolean) | undefined
  >();

  constructor(
    private readonly uow: PrismaUnitOfWork,
    private readonly logger?: { info: (msg: string, ctx?: Record<string, unknown>) => void },
    private readonly metrics?: {
      recordOperation: (p: { operation: string; durationMs: number; ok: boolean }) => void;
    }
  ) {}

  register<TPayload, TResult>(
    type: string,
    handler: CommandHandler<TPayload, TResult>,
    schema: ZodSchema<TPayload>,
    authorize?: (payload: TPayload, ctx: RequestContext) => boolean
  ): void {
    this.handlers.set(type, handler);
    this.schemas.set(type, schema);
    this.authFns.set(type, authorize);
  }

  async execute<TPayload, TResult>(
    type: string,
    payload: TPayload,
    ctx: RequestContext
  ): Promise<CommandResult<TResult>> {
    const handler = this.handlers.get(type);
    if (!handler) return fail(AppErrors.internal(`No handler registered for command: ${type}`));

    const schema = this.schemas.get(type);
    const authFn = this.authFns.get(type);

    // Build pipeline
    const pipeline = createPipeline<TPayload, TResult>();
    if (schema) pipeline.use(validationMiddleware<TPayload, TResult>(schema));
    pipeline.use(authorizationMiddleware<TPayload, TResult>(authFn));
    pipeline.use(loggingMiddleware(this.logger));
    pipeline.use(metricsMiddleware(this.metrics));

    // Execute within UnitOfWork transaction
    const result = await pipeline.execute(payload, ctx, async () => {
      try {
        return await this.uow.transaction(async (repos, tx) => {
          // Pass tx (TransactionClient) + repositories to the handler.
          // tx is the SAME transaction client used by all repositories.
          // Handlers can use ctx.tx for operations without a dedicated repository.
          const handlerCtx = { ...ctx, tx, repositories: repos };
          const handlerResult = await handler.handle(payload, handlerCtx);
          if (handlerResult.ok) {
            return { ok: true, value: handlerResult.value };
          }
          // Throw to rollback the transaction on error
          throw new HandlerError(handlerResult.error);
        });
      } catch (error) {
        if (error instanceof HandlerError) {
          return { ok: false, error: error.error };
        }
        return {
          ok: false,
          error: AppErrors.internal((error as Error).message)
        };
      }
    });

    if (result.ok && result.value !== undefined) {
      return ok(result.value) as CommandResult<TResult>;
    }
    return fail(result.error ?? AppErrors.internal("Unknown error")) as CommandResult<TResult>;
  }
}

// ── Query Bus ───────────────────────────────────────────────

export class QueryBus {
  private readonly handlers = new Map<string, QueryHandler<any, any>>();
  private readonly schemas = new Map<string, ZodSchema<any>>();
  private readonly authFns = new Map<
    string,
    ((payload: any, ctx: RequestContext) => boolean) | undefined
  >();

  constructor(
    private readonly logger?: { info: (msg: string, ctx?: Record<string, unknown>) => void },
    private readonly metrics?: {
      recordOperation: (p: { operation: string; durationMs: number; ok: boolean }) => void;
    }
  ) {}

  register<TPayload, TResult>(
    type: string,
    handler: QueryHandler<TPayload, TResult>,
    schema: ZodSchema<TPayload>,
    authorize?: (payload: TPayload, ctx: RequestContext) => boolean
  ): void {
    this.handlers.set(type, handler);
    this.schemas.set(type, schema);
    this.authFns.set(type, authorize);
  }

  async execute<TPayload, TResult>(
    type: string,
    payload: TPayload,
    ctx: RequestContext
  ): Promise<QueryResult<TResult>> {
    const handler = this.handlers.get(type);
    if (!handler) return fail(AppErrors.internal(`No handler registered for query: ${type}`));

    const schema = this.schemas.get(type);
    const authFn = this.authFns.get(type);

    const pipeline = createPipeline<TPayload, TResult>();
    if (schema) pipeline.use(validationMiddleware<TPayload, TResult>(schema));
    pipeline.use(authorizationMiddleware<TPayload, TResult>(authFn));
    pipeline.use(loggingMiddleware(this.logger));
    pipeline.use(metricsMiddleware(this.metrics));

    // Queries don't need a transaction — read-only
    const result = await pipeline.execute(payload, ctx, async () => {
      try {
        const handlerResult = await handler.handle(payload, ctx);
        if (handlerResult.ok) {
          return { ok: true, value: handlerResult.value };
        }
        return { ok: false, error: handlerResult.error };
      } catch (error) {
        return {
          ok: false,
          error: AppErrors.internal((error as Error).message)
        };
      }
    });

    if (result.ok && result.value !== undefined) {
      return ok(result.value) as QueryResult<TResult>;
    }
    return fail(result.error ?? AppErrors.internal("Unknown error")) as QueryResult<TResult>;
  }
}

// ── Handler Error (for transaction rollback) ────────────────

class HandlerError extends Error {
  constructor(public readonly error: ApplicationError) {
    super(error.message);
    this.name = "HandlerError";
  }
}
