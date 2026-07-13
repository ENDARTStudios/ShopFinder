/**
 * @workspace/application — Application Layer (CQRS)
 */
import type { ZodSchema } from "zod";

export interface AuthContext {
  readonly userId?: string;
  readonly customerId?: string;
  readonly storeId: string;
  readonly roles: ReadonlyArray<string>;
  readonly permissions: ReadonlyArray<string>;
  readonly isAuthenticated: boolean;
}

export interface RequestContext {
  readonly auth: AuthContext;
  readonly requestId: string;
  readonly idempotencyKey?: string;
  readonly locale: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

export interface HandlerContext extends RequestContext {
  readonly tx: unknown;
  readonly repositories: unknown;
}

export type CommandResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ApplicationError };
export type QueryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ApplicationError };

export interface CommandHandler<TPayload, TResult> {
  readonly type: string;
  handle(payload: TPayload, ctx: HandlerContext): Promise<CommandResult<TResult>>;
}
export interface QueryHandler<TPayload, TResult> {
  readonly type: string;
  handle(payload: TPayload, ctx: RequestContext): Promise<QueryResult<TResult>>;
}

export interface ApplicationError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly statusCode: number;
}

export const AppErrors = {
  validation: (m: string, d?: Record<string, unknown>): ApplicationError => ({
    code: "VALIDATION_ERROR",
    message: m,
    details: d,
    statusCode: 400
  }),
  unauthorized: (m = "Unauthorized"): ApplicationError => ({
    code: "UNAUTHORIZED",
    message: m,
    statusCode: 401
  }),
  forbidden: (m = "Forbidden"): ApplicationError => ({
    code: "FORBIDDEN",
    message: m,
    statusCode: 403
  }),
  notFound: (r: string, id: string): ApplicationError => ({
    code: "NOT_FOUND",
    message: `${r} not found: ${id}`,
    statusCode: 404
  }),
  conflict: (m: string): ApplicationError => ({ code: "CONFLICT", message: m, statusCode: 409 }),
  internal: (m: string): ApplicationError => ({
    code: "INTERNAL_ERROR",
    message: m,
    statusCode: 500
  })
};

export function ok<T>(value: T): CommandResult<T> {
  return { ok: true, value };
}
export function fail<T>(error: ApplicationError): CommandResult<T> {
  return { ok: false, error };
}

export type Role = "customer" | "admin" | "supplier" | "support";
export type Permission =
  | "catalog.read"
  | "catalog.write"
  | "catalog.delete"
  | "customer.read"
  | "customer.read.self"
  | "customer.write"
  | "order.read"
  | "order.read.self"
  | "order.write"
  | "order.cancel"
  | "payment.read"
  | "payment.write"
  | "payment.refund"
  | "supplier.read"
  | "supplier.write"
  | "supplier.connect"
  | "admin.access"
  | "admin.users"
  | "admin.settings";

const ROLE_PERMS: Record<Role, Permission[]> = {
  customer: ["catalog.read", "customer.read.self", "order.read.self"],
  support: ["catalog.read", "customer.read", "order.read", "order.cancel", "payment.read"],
  supplier: ["catalog.read", "supplier.read", "order.read"],
  admin: [
    "catalog.read",
    "catalog.write",
    "catalog.delete",
    "customer.read",
    "customer.write",
    "order.read",
    "order.write",
    "order.cancel",
    "payment.read",
    "payment.write",
    "payment.refund",
    "supplier.read",
    "supplier.write",
    "supplier.connect",
    "admin.access",
    "admin.users",
    "admin.settings"
  ]
};

export function resolvePermissions(roles: string[]): Permission[] {
  const perms = new Set<Permission>();
  for (const r of roles) {
    if (r in ROLE_PERMS) for (const p of ROLE_PERMS[r as Role]) perms.add(p);
  }
  return [...perms];
}

export interface Middleware<TPayload, TResult> {
  readonly name: string;
  execute(
    payload: TPayload,
    ctx: RequestContext,
    next: () => Promise<{ ok: boolean; value?: TResult; error?: ApplicationError }>
  ): Promise<{ ok: boolean; value?: TResult; error?: ApplicationError }>;
}

export class Pipeline<TPayload, TResult> {
  private middlewares: Middleware<TPayload, TResult>[] = [];
  use(mw: Middleware<TPayload, TResult>): this {
    this.middlewares.push(mw);
    return this;
  }
  async execute(
    payload: TPayload,
    ctx: RequestContext,
    handler: () => Promise<{ ok: boolean; value?: TResult; error?: ApplicationError }>
  ): Promise<{ ok: boolean; value?: TResult; error?: ApplicationError }> {
    let chain = handler;
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const mw = this.middlewares[i];
      const next = chain;
      chain = () => mw.execute(payload, ctx, next);
    }
    return chain();
  }
}

export function validationMiddleware<TP, TR>(schema: ZodSchema<TP>): Middleware<TP, TR> {
  return {
    name: "validation",
    async execute(payload, _ctx, next) {
      const r = schema.safeParse(payload);
      if (!r.success)
        return {
          ok: false,
          error: AppErrors.validation(
            "Validation failed",
            Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]))
          )
        };
      return next();
    }
  };
}
export function authorizationMiddleware<TP, TR>(
  auth?: (p: TP, ctx: RequestContext) => boolean
): Middleware<TP, TR> {
  return {
    name: "authorization",
    async execute(payload, ctx, next) {
      if (!auth || auth(payload, ctx)) return next();
      return {
        ok: false,
        error: ctx.auth.isAuthenticated ? AppErrors.forbidden() : AppErrors.unauthorized()
      };
    }
  };
}
export function loggingMiddleware<TP, TR>(logger?: {
  info: (m: string, c?: Record<string, unknown>) => void;
}): Middleware<TP, TR> {
  const log = logger ?? console;
  return {
    name: "logging",
    async execute(_payload, ctx, next) {
      const s = Date.now();
      log.info(`[app] ${ctx.requestId} started`);
      const r = await next();
      log.info(`[app] ${ctx.requestId} finished ${Date.now() - s}ms ok=${r.ok}`);
      return r;
    }
  };
}

export class CommandBus {
  private handlers = new Map<
    string,
    {
      handler: CommandHandler<any, any>;
      schema: ZodSchema<any>;
      auth?: (p: any, ctx: RequestContext) => boolean;
    }
  >();
  constructor(
    private uow: { transaction<T>(fn: (repos: unknown, tx: unknown) => Promise<T>): Promise<T> }
  ) {}
  register<TP, TR>(
    type: string,
    handler: CommandHandler<TP, TR>,
    schema: ZodSchema<TP>,
    auth?: (p: TP, ctx: RequestContext) => boolean
  ): void {
    this.handlers.set(type, { handler, schema, auth });
  }
  async execute<TP, TR>(
    type: string,
    payload: TP,
    ctx: RequestContext
  ): Promise<CommandResult<TR>> {
    const entry = this.handlers.get(type);
    if (!entry) return fail(AppErrors.internal(`No handler: ${type}`));
    const pipeline = new Pipeline<TP, TR>();
    pipeline.use(validationMiddleware(entry.schema));
    pipeline.use(authorizationMiddleware(entry.auth));
    pipeline.use(loggingMiddleware());
    try {
      const result = await this.uow.transaction(async (repos, tx) => {
        const handlerCtx = { ...ctx, tx, repositories: repos } as HandlerContext;
        const r = await entry.handler.handle(payload, handlerCtx);
        if (!r.ok) throw new HandlerError(r.error);
        return r;
      });
      return result as CommandResult<TR>;
    } catch (e) {
      if (e instanceof HandlerError) return fail(e.error) as CommandResult<TR>;
      return fail(AppErrors.internal((e as Error).message)) as CommandResult<TR>;
    }
  }
}

export class QueryBus {
  private handlers = new Map<
    string,
    {
      handler: QueryHandler<any, any>;
      schema: ZodSchema<any>;
      auth?: (p: any, ctx: RequestContext) => boolean;
    }
  >();
  constructor() {}
  register<TP, TR>(
    type: string,
    handler: QueryHandler<TP, TR>,
    schema: ZodSchema<TP>,
    auth?: (p: TP, ctx: RequestContext) => boolean
  ): void {
    this.handlers.set(type, { handler, schema, auth });
  }
  async execute<TP, TR>(type: string, payload: TP, ctx: RequestContext): Promise<QueryResult<TR>> {
    const entry = this.handlers.get(type);
    if (!entry) return fail(AppErrors.internal(`No handler: ${type}`));
    const pipeline = new Pipeline<TP, TR>();
    pipeline.use(validationMiddleware(entry.schema));
    pipeline.use(authorizationMiddleware(entry.auth));
    pipeline.use(loggingMiddleware());
    try {
      const r = await entry.handler.handle(payload, ctx);
      return r as QueryResult<TR>;
    } catch (e) {
      return fail(AppErrors.internal((e as Error).message)) as QueryResult<TR>;
    }
  }
}

class HandlerError extends Error {
  constructor(public error: ApplicationError) {
    super(error.message);
    this.name = "HandlerError";
  }
}

// Policies
export const CatalogPolicy = {
  canRead: (_: RequestContext) => true,
  canCreate: (c: RequestContext) => c.auth.permissions.includes("catalog.write"),
  canUpdate: (c: RequestContext) => c.auth.permissions.includes("catalog.write"),
  canDelete: (c: RequestContext) => c.auth.permissions.includes("catalog.delete")
};
export const CustomerPolicy = {
  canRead: (c: RequestContext, id?: string) =>
    id
      ? c.auth.customerId === id || c.auth.permissions.includes("customer.read")
      : c.auth.permissions.includes("customer.read"),
  canUpdate: (c: RequestContext, id: string) =>
    c.auth.customerId === id || c.auth.permissions.includes("customer.write")
};
export const OrderPolicy = {
  canRead: (c: RequestContext, id?: string) =>
    id
      ? c.auth.customerId === id || c.auth.permissions.includes("order.read")
      : c.auth.permissions.includes("order.read"),
  canPlace: (c: RequestContext) => c.auth.isAuthenticated,
  canCancel: (c: RequestContext, id: string) =>
    c.auth.customerId === id || c.auth.permissions.includes("order.cancel")
};
export const SupplierPolicy = {
  canRead: (_: RequestContext) => true,
  canConnect: (c: RequestContext) => c.auth.permissions.includes("supplier.connect"),
  canSync: (c: RequestContext) => c.auth.permissions.includes("supplier.write")
};
export const CartPolicy = {
  canRead: (_c: RequestContext, _cid?: string, sid?: string) => !!sid || true,
  canAddItem: (_: RequestContext) => true,
  canCheckout: (_: RequestContext) => true
};
export const PaymentPolicy = {
  canRead: (c: RequestContext, id?: string) =>
    id
      ? c.auth.customerId === id || c.auth.permissions.includes("payment.read")
      : c.auth.permissions.includes("payment.read"),
  canInitiate: (c: RequestContext) => c.auth.isAuthenticated,
  canRefund: (c: RequestContext) => c.auth.permissions.includes("payment.refund")
};
