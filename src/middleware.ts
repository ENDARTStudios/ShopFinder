/**
 * ShopFinder — Middleware
 *
 * - Protege /admin (NextAuth)
 * - Rate limiting em /api/auth/* (ver docs/eng/SECURITY.md)
 * - Propaga x-request-id para correlação de logs (docs/eng/OBSERVABILITY.md)
 *
 * Headers de segurança (HSTS, CSP etc.) ficam em next.config.ts (headers).
 */
import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const authMiddleware = withAuth({
  pages: {
    signIn: "/login"
  }
});

export async function middleware(req: NextRequest, event: unknown) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    const result = await checkRateLimit("/api/auth", getClientIp(req.headers));
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
      );
    }
  }

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const response = (await authMiddleware(req, event)) as NextResponse | undefined;
  const finalResponse = response ?? NextResponse.next();
  finalResponse.headers.set("x-request-id", requestId);
  return finalResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/api/auth/:path*"]
};
