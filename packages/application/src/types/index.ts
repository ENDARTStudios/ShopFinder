/**
 * @workspace/application/types — CQRS base types
 *
 * Formal Command/Query separation. Every operation in the application layer
 * is either a Command (write, returns result) or a Query (read, returns DTO).
 *
 * Per Rec 2 of 05 feedback: formalize the CQRS flow:
 *   Command → CommandHandler → Repository → Aggregate
 *   Query → QueryHandler → QueryService → DTO
 */

import type { ZodSchema } from "zod";

// ── Command ─────────────────────────────────────────────────

export interface Command {
  readonly type: string;
  readonly payload: unknown;
}

export interface CommandDefinition<TPayload, TResult> {
  readonly type: string;
  readonly schema: ZodSchema<TPayload>;
  readonly authorize?: (payload: TPayload, context: AuthContext) => boolean;
}

export type CommandResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ApplicationError };

// ── Query ───────────────────────────────────────────────────

export interface Query {
  readonly type: string;
  readonly payload: unknown;
}

export interface QueryDefinition<TPayload, TResult> {
  readonly type: string;
  readonly schema: ZodSchema<TPayload>;
  readonly authorize?: (payload: TPayload, context: AuthContext) => boolean;
}

export type QueryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ApplicationError };

// ── Handler interfaces ──────────────────────────────────────

export interface CommandHandler<TPayload, TResult> {
  readonly type: string;
  handle(payload: TPayload, context: RequestContext): Promise<CommandResult<TResult>>;
}

export interface QueryHandler<TPayload, TResult> {
  readonly type: string;
  handle(payload: TPayload, context: RequestContext): Promise<QueryResult<TResult>>;
}

// ── Auth Context ────────────────────────────────────────────

export interface AuthContext {
  readonly userId?: string;
  readonly customerId?: string;
  readonly storeId: string;
  readonly roles: ReadonlyArray<string>;
  readonly permissions: ReadonlyArray<string>;
  readonly isAuthenticated: boolean;
}

// ── Request Context ─────────────────────────────────────────

export interface RequestContext {
  readonly auth: AuthContext;
  readonly requestId: string;
  readonly idempotencyKey?: string;
  readonly locale: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * HandlerContext — passed to CommandHandlers inside a UnitOfWork transaction.
 * Per Epic 1.1.1: includes `tx` (Prisma TransactionClient) so handlers can
 * perform operations that don't have a dedicated repository (e.g. User creation).
 *
 * The `tx` is the SAME transaction client used by all repositories in the registry.
 * Everything commits or rolls back together.
 */
export interface HandlerContext extends RequestContext {
  readonly tx: unknown; // Prisma.TransactionClient — typed as unknown to avoid Prisma dep in application
  readonly repositories: unknown; // RepositoryRegistry — typed as unknown to avoid circular dep
}

// ── Errors ──────────────────────────────────────────────────

export interface ApplicationError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly statusCode: number;
}

export const AppErrors = {
  validation: (message: string, details?: Record<string, unknown>): ApplicationError => ({
    code: "VALIDATION_ERROR",
    message,
    details,
    statusCode: 400
  }),
  unauthorized: (message = "Unauthorized"): ApplicationError => ({
    code: "UNAUTHORIZED",
    message,
    statusCode: 401
  }),
  forbidden: (message = "Forbidden"): ApplicationError => ({
    code: "FORBIDDEN",
    message,
    statusCode: 403
  }),
  notFound: (resource: string, id: string): ApplicationError => ({
    code: "NOT_FOUND",
    message: `${resource} not found: ${id}`,
    statusCode: 404
  }),
  conflict: (message: string): ApplicationError => ({
    code: "CONFLICT",
    message,
    statusCode: 409
  }),
  internal: (message: string): ApplicationError => ({
    code: "INTERNAL_ERROR",
    message,
    statusCode: 500
  })
} as const;

// ── Helpers ─────────────────────────────────────────────────

export function ok<T>(value: T): CommandResult<T> | QueryResult<T> {
  return { ok: true, value };
}

export function fail<T>(error: ApplicationError): CommandResult<T> | QueryResult<T> {
  return { ok: false, error };
}
