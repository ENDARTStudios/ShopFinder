/**
 * @workspace/api — Route Handler layer
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type {
  CommandBus,
  QueryBus,
  AuthContext,
  RequestContext,
  CommandResult,
  QueryResult
} from "@workspace/application";

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
export function jsonError(
  code: string,
  msg: string,
  status: number,
  d?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error: { code, message: msg, details: d } }, { status });
}
export function mapResult<T>(r: CommandResult<T> | QueryResult<T>): NextResponse {
  if (r.ok) return jsonOk(r.value);
  return jsonError(r.error.code, r.error.message, r.error.statusCode, r.error.details);
}

export async function buildRequestContext(
  req: NextRequest,
  auth: AuthContext
): Promise<RequestContext> {
  return {
    auth,
    requestId: req.headers.get("x-request-id") ?? crypto.randomUUID(),
    idempotencyKey: req.headers.get("idempotency-key") ?? undefined,
    locale: req.headers.get("accept-language")?.split(",")[0] ?? "en",
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined
  };
}

export function buildAuthContext(session: unknown): AuthContext {
  const s = session as {
    userId?: string;
    customerId?: string;
    storeId?: string;
    roles?: string[];
    permissions?: string[];
  } | null;
  if (!s?.userId) return { storeId: "default", roles: [], permissions: [], isAuthenticated: false };
  return {
    userId: s.userId,
    customerId: s.customerId,
    storeId: s.storeId ?? "default",
    roles: s.roles ?? ["customer"],
    permissions: s.permissions ?? [],
    isAuthenticated: true
  };
}
