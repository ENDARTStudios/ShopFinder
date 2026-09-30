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
import { getToken } from "next-auth/jwt";
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

  // Rate limiting de TODAS as rotas /api/* (T049-hardening):
  // - identificador = userId da sessão quando autenticado, senão IP —
  //   requisições autenticadas não são penalizadas por outros usuários
  //   do mesmo IP (NAT/corporativo);
  // - limites por rota em RATE_LIMIT_RULES (credenciais: 5/min; catálogo:
  //   60/min; webhook: 300/min; demais: default);
  // - janela deslizante com Retry-After calculado.
  // Desativado fora de produção: a lógica é coberta por tests/unit e o
  // limiter em memória tornaria as suítes de integração/E2E flaky.
  if (process.env.NODE_ENV === "production" && pathname.startsWith("/api/")) {
    // Session cookie presente → resolve o userId (getToken é edge-safe);
    // sem cookie de sessão, pula o custo do JWT e usa IP como identificador.
    const hasSessionCookie = /next-auth\.session-token/.test(req.headers.get("cookie") ?? "");

    let identifier = getClientIp(req.headers);
    if (hasSessionCookie) {
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
        salt: process.env.NEXTAUTH_URL?.startsWith("https://")
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token"
      });
      if (token?.sub) identifier = `u:${token.sub}`;
    }

    const result = await checkRateLimit(pathname, identifier);
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
