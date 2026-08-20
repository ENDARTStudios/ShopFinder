/**
 * ShopFinder — Middleware
 *
 * - Protege /admin (NextAuth) — com escopo explícito: rotas públicas não passam pelo withAuth
 * - Rate limiting em /api/auth/* (ver docs/eng/SECURITY.md)
 * - CSP com nonce por request (#23) — o Next aplica o nonce aos scripts de
 *   bootstrap quando lê a CSP do request header (padrão documentado do Next)
 * - Propaga x-request-id para correlação de logs (docs/eng/OBSERVABILITY.md)
 *
 * Outros headers de segurança (HSTS etc.) ficam em next.config.ts (headers).
 */
import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { buildCsp } from "@/lib/csp";

const authMiddleware = withAuth({
  pages: {
    signIn: "/login"
  }
});

export async function middleware(req: NextRequest, event: unknown) {
  const { pathname } = req.nextUrl;

  // ── CSP com nonce (#23) ──────────────────────────────────
  const nonce = btoa(crypto.randomUUID());
  const sentryHost = process.env.NEXT_PUBLIC_SENTRY_DSN
    ? new URL(process.env.NEXT_PUBLIC_SENTRY_DSN).host
    : null;
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV !== "production",
    extraConnectSrc: sentryHost ? [`https://${sentryHost}`] : []
  });
  // Report-only durante rollout (CSP_REPORT_ONLY=1) ou em dev —
  // política validada em produção antes de bloquear.
  const cspHeaderName =
    process.env.CSP_REPORT_ONLY === "1" || process.env.NODE_ENV !== "production"
      ? "content-security-policy-report-only"
      : "content-security-policy";

  // O Next lê a CSP do request header e aplica o nonce aos seus scripts
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const finalize = (response: NextResponse) => {
    response.headers.set(cspHeaderName, csp);
    response.headers.set("x-request-id", requestId);
    return response;
  };

  // Rate limit de credenciais: POSTs de login/registro (5/min). Os demais
  // endpoints de auth (csrf/session) usam o default (120/min).
  // Desativado fora de produção: a lógica é coberta por tests/unit e o
  // limiter em memória tornaria as suítes de integração/E2E flaky
  // (buckets acumulam por IP entre execuções no mesmo dev server).
  if (
    process.env.NODE_ENV === "production" &&
    (pathname === "/api/auth/callback/credentials" || pathname === "/api/auth/register") &&
    (req.method === "POST" || req.method === "PUT")
  ) {
    const result = await checkRateLimit(pathname, getClientIp(req.headers));
    if (!result.allowed) {
      return finalize(
        NextResponse.json(
          { error: "Too many requests" },
          { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
        )
      );
    }
  }

  // /admin é protegido pelo withAuth; redirect de login preserva os headers
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const auth = authMiddleware as unknown as (
      req: NextRequest,
      event: unknown
    ) => Promise<NextResponse>;
    const authResponse = await auth(req, event);
    if (authResponse?.headers?.get("location")) {
      return finalize(authResponse);
    }
  }

  return finalize(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: [
    // Todas as rotas de página/API, exceto assets estáticos e arquivos públicos
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|opengraph-image.png|twitter-image.png|robots.txt|sitemap.xml|llms.txt|.*\\.well-known|manifest.webmanifest).*)"
  ]
};
