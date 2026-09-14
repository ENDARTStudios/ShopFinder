/**
 * @workspace/application/pipeline/middlewares — Built-in middlewares
 */

import type { Middleware, MiddlewareResult, NextFn } from "./pipeline";
import type { RequestContext, ApplicationError } from "../types";
import { AppErrors } from "../types";
import type { ZodSchema } from "zod";

// ── Validation Middleware ───────────────────────────────────

export function validationMiddleware<TPayload, TResult>(
  schema: ZodSchema<TPayload>
): Middleware<TPayload, TResult> {
  return {
    name: "validation",
    async execute(payload: unknown, _ctx: RequestContext, next: NextFn<TResult>) {
      const result = schema.safeParse(payload);
      if (!result.success) {
        const details: Record<string, unknown> = {};
        for (const issue of result.error.issues) {
          details[issue.path.join(".")] = issue.message;
        }
        return {
          ok: false,
          error: AppErrors.validation("Validation failed", details)
        };
      }
      return next();
    }
  };
}

// ── Authorization Middleware ────────────────────────────────

export function authorizationMiddleware<TPayload, TResult>(
  authorize?: (payload: TPayload, context: RequestContext) => boolean
): Middleware<TPayload, TResult> {
  return {
    name: "authorization",
    async execute(payload: TPayload, ctx: RequestContext, next: NextFn<TResult>) {
      if (!authorize) return next();
      const allowed = authorize(payload, ctx);
      if (!allowed) {
        return {
          ok: false,
          error: ctx.auth.isAuthenticated
            ? AppErrors.forbidden("You do not have permission to perform this action")
            : AppErrors.unauthorized()
        };
      }
      return next();
    }
  };
}

// ── Logging Middleware ──────────────────────────────────────

export function loggingMiddleware<TPayload, TResult>(logger?: {
  info: (msg: string, ctx?: Record<string, unknown>) => void;
}): Middleware<TPayload, TResult> {
  const log = logger ?? console;
  return {
    name: "logging",
    async execute(payload: TPayload, ctx: RequestContext, next: NextFn<TResult>) {
      const start = Date.now();
      log.info(`[app] ${ctx.requestId} command started`, {
        type: (payload as { type?: string })?.type
      });
      const result = await next();
      const durationMs = Date.now() - start;
      log.info(`[app] ${ctx.requestId} command finished`, { durationMs, ok: result.ok });
      return result;
    }
  };
}

// ── Metrics Middleware ──────────────────────────────────────

export function metricsMiddleware<TPayload, TResult>(metrics?: {
  recordOperation: (p: { operation: string; durationMs: number; ok: boolean }) => void;
}): Middleware<TPayload, TResult> {
  return {
    name: "metrics",
    async execute(payload: TPayload, _ctx: RequestContext, next: NextFn<TResult>) {
      const start = Date.now();
      const result = await next();
      const durationMs = Date.now() - start;
      metrics?.recordOperation({
        operation: (payload as { type?: string })?.type ?? "unknown",
        durationMs,
        ok: result.ok
      });
      return result;
    }
  };
}

// ── Idempotency Middleware ──────────────────────────────────

export function idempotencyMiddleware<TPayload, TResult>(
  checkKey?: (key: string) => Promise<MiddlewareResult<TResult> | null>,
  storeKey?: (key: string, result: MiddlewareResult<TResult>) => Promise<void>
): Middleware<TPayload, TResult> {
  return {
    name: "idempotency",
    async execute(_payload: TPayload, ctx: RequestContext, next: NextFn<TResult>) {
      if (!ctx.idempotencyKey || !checkKey) return next();

      const cached = await checkKey(ctx.idempotencyKey);
      if (cached) return cached;

      const result = await next();

      if (storeKey && ctx.idempotencyKey) {
        await storeKey(ctx.idempotencyKey, result);
      }
      return result;
    }
  };
}
