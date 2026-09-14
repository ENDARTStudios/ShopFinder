/**
 * Posta o comentário de encerramento das issues das fases 5-10.
 * Uso: GITHUB_TOKEN=<token-com-escopo-issues> node scripts/comment-issue-status.mjs
 */
const REPO = "ENDARTStudios/ShopFinder";

const comments = {
  20: "Concluído no branch chore/eng-excellence (PR pendente): migration enable_rls em modo shadow (políticas tenant_isolation + public_read_catalog nas tabelas com storeId: Store, User, Category, Product, Customer, Cart, CheckoutSession, Order), withTenantTransaction em @workspace/database (set_config is_local parametrizado) e tests/integration/rls.test.ts (leak cross-store com role NOBYPASSRLS via RLS_TEST_DATABASE_URL; helper testado na DATABASE_URL normal). Adaptado ao schema real — OrderItem/Integration/SyncJob/ProductOffer não têm storeId (política por JOIN é follow-up). FORCE ROW LEVEL SECURITY fica para após validação com role de serviço em staging, conforme plano do RLS.md.",
  21: "Parte de código/documentação concluída no branch: checklist de ativação do Cloudflare (proxy, Full Strict, Bot Fight Mode, managed rules count→block, rate-limit edge com exclusão de /api/webhook por HMAC, cache bypass de /api/*) adicionado ao docs/eng/SECURITY.md §2. Os passos do dashboard Cloudflare são ação manual de infra — issue fecha com o PR.",
  22: "Concluído no branch: TOTP RFC 6238 implementado em @workspace/auth/totp (HMAC-SHA1, base32, janela ±1 passo, timing-safe; testes com os vetores do RFC), campos mfaSecret/mfaEnabled no User (migration user_mfa_totp), gate no authorize (roles admin + flag mfa_admin + enrollment concluído), enrollment em /admin/security com QR (qrcode) via /api/admin/mfa/{setup,enable} protegidos por requirePermissions, e campo 2FA no login. Rollout: ativar a flag mfa_admin depois que os admins fizerem enrollment.",
  23: "Concluído no branch: CSP com nonce por request + strict-dynamic no middleware (padrão documentado do Next), allowlist para Stripe (script/frame/connect), cotação FX e ingest Sentry, object-src none, frame-ancestors none. Rollout seguro: report-only em dev e via CSP_REPORT_ONLY=1; enforce em produção depois de validar o relatório. HSTS preload: submeter o domínio à lista após 2 releases estáveis com HSTS ativo (ação manual, hstspreload.org).",
  24: "Concluído na fase 3 (requirePermissions em src/lib/admin-auth.ts aplicado às rotas /api/admin/*; 401/403 padronizados; role operator no modelo). Fases 7-8 reutilizaram o guard nas rotas novas de MFA.",
  25: "Concluído: /api/health (liveness) e /api/health/ready (readiness Postgres+Redis) na fase 2; adapter Sentry na fase 6 — @sentry/nextjs inicializado via instrumentation (server/client) quando SENTRY_DSN/NEXT_PUBLIC_SENTRY_DSN existem, report-error forwarda via registry desacoplado (tests/unit/error-forwarder.test.ts), onRequestError captura erros de SSR. Sem DSN o SDK fica inerte.",
  26: "Concluído na fase 6: src/otel.ts (NodeSDK + getNodeAutoInstrumentations — http.server/client, prisma, fetch) com export OTLP/HTTP ativado por OTEL_EXPORTER_OTLP_ENDPOINT; serverExternalPackages no next.config; envs documentadas em .env.example/SECRETS.md.",
  27: "Concluído na fase 5: playwright.config.ts (webServer dev, chromium, retry em CI) e tests/e2e com as 4 jornadas — busca→produto→carrinho, compare 2 produtos, login admin→pipeline (admin criado via scripts/create-admin.ts) e checkout Stripe gated por E2E_CHECKOUT_ENABLED (roda contra staging configurado). Job e2e no CI com Postgres service + seeds.",
  28: "Escopo de código concluído: 64 testes unitários (price, fx-core, flags, rate-limit, authorization, csp, totp, seo-schema, error-forwarder), npm run test:coverage com lcov, upload Codecov no job unit-tests (requer secret CODECOV_TOKEN; fail_ci_if_error=false até o baseline). Gate 60% ativa no painel do Codecov após o primeiro upload.",
  29: "Concluído: knip.json + job CI em modo aviso (55 deps de scaffold e 63 exports reportados — triagem: @types/bcryptjs removido, tw-animate-css é falso positivo via CSS) e stryker.config.json para mutation testing em src/lib/{price,fx-core,totp}.ts + @workspace/domain (bunx stryker run, métrica manual). Bloqueio do Knip após triagem das deps de scaffold.",
  30: "Concluído na fase 4 — skeletons espelhando o layout final em landing (4 seções + grid de produtos), dashboard admin, pipeline e tabela compare (CLS=0); rotas com loading.tsx desde a fase 2.",
  31: "Concluído nas fases 2-4: FadeIn/FadeInStagger/FadeInItem no sistema (hero, grids, produto, compatíveis, FAQ, cart drawer), press feedback no Button, stagger limitado a 400ms em grades grandes, prefers-reduced-motion respeitado em todos os componentes.",
  32: "Concluído na fase 9: hero 3D com React Three Fiber (chip + anel decorativos, Canvas low-power), dynamic import ssr:false, montagem via IntersectionObserver e desativada com prefers-reduced-motion; gradiente existente permanece como fallback estático; bundle 3D fora do caminho crítico.",
  33: "Concluído nas fases 1-4: sitemap/robots, JSON-LD Product/Offer + BreadcrumbList + FAQPage via builders testados em @workspace/seo/schema (com escape de </script>), buildMetadata em todas as rotas (checkout/admin noindex), llms.txt e seção FAQ bilíngue na landing.",
  34: "Concluído no branch: workflow lighthouse.yml (cron semanal seg 06:00 + manual) com budgets (perf ≥85, a11y/bp/seo ≥90, CLS/LCP warn) contra as URLs de produção via lighthouserc.json. Crawl trimestral com Screaming Frog permanece lembrete manual do issue tracker.",
  35: "Concluído na fase 2 — @workspace/config/flags com 6 flags + isFlagEnabled e overrides por store (tests/unit/flags.test.ts). Consumido pelo gate de MFA (mfa_admin) na fase 7.",
  36: "Concluído no branch: ci.yml agora tem unit-tests (+Codecov), lint, build, integration (Postgres service + dev server), e2e, knip e python/gitleaks. ESLint pinado em 9.x (eslint-plugin-react 7.37 não suporta 10 — bug de linker do bun no Windows documentado no job); lint e knip em modo aviso→bloqueio. Ação manual restante: marcar os checks como required no branch protection do main."
};

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("Defina GITHUB_TOKEN com escopo de issues write.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json",
  "User-Agent": "shopfinder-issue-script"
};

for (const [number, body] of Object.entries(comments)) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/issues/${number}/comments`, {
    method: "POST",
    headers,
    body: JSON.stringify({ body })
  });
  const data = await res.json().catch(() => ({}));
  console.log(
    res.ok
      ? `[ok] #${number}`
      : `[fail ${res.status}] #${number} ${JSON.stringify(data).slice(0, 120)}`
  );
}
