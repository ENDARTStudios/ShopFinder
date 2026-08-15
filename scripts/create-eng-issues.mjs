/**
 * Cria as issues de engenharia no GitHub (ENDARTStudios/ShopFinder).
 * Uso: node scripts/create-eng-issues.mjs
 * Autentica via `git credential fill` (credential helper local) ou GITHUB_TOKEN.
 * Idempotente: pula issues cujo título já existe (marca [skip] no título).
 */
const REPO = "ENDARTStudios/ShopFinder";

const issues = [
  {
    title: "[SEC] Ativar RLS no PostgreSQL com políticas de tenant (docs/eng/RLS.md)",
    body: "Implementar Row Level Security conforme docs/eng/RLS.md: migration enable_rls, SET LOCAL app.store_id por transação (Prisma extension), políticas por tabela multi-tenant, testes de leak cross-store retornando 0 linhas, depois FORCE RLS."
  },
  {
    title: "[SEC] Configurar WAF (Cloudflare) + Bot Fight Mode + managed rules",
    body: "Colocar Cloudflare na frente da Vercel em modo SSL/TLS Full (Strict). Habilitar Bot Fight Mode e managed WAF rules (OWASP) — count 2 semanas, depois block. Excluir /api/webhook do rate-limit edge (assinatura HMAC já valida). Detalhes em docs/eng/SECURITY.md."
  },
  {
    title: "[SEC] MFA (TOTP) obrigatório para superadmin e store_admin",
    body: "Implementar MFA para roles admin (flag mfa_admin em docs/eng/ARCHITECTURE.md). Gate de deploy: ligado antes do go-live. Fluxo: QR + TOTP verify no login NextAuth."
  },
  {
    title: "[SEC] CSP com nonce + submit HSTS preload",
    body: "Adicionar Content-Security-Policy com nonce no Next (middleware) sem quebrar Stripe/Upstash. Após 2 releases estáveis com HSTS (já em next.config.ts), submeter domínio à lista preload."
  },
  {
    title: "[AUTH] Padronizar checagem de permissões por rota conforme matriz RBAC",
    body: "Aplicar docs/eng/RBAC.md: helper de autorização (requirePermission) em todas as rotas /api/admin/* e páginas /admin/*; serializador sem PII para role support; 403 padronizado."
  },
  {
    title: "[OBS] Integrar Sentry (ou OTLP) no reportError + health checks",
    body: "src/lib/report-error.ts já loga; conectar adapter Sentry via SENTRY_DSN (server) e browser SDK (client). Adicionar /api/health (liveness) e /api/health/ready (readiness: ping Postgres + Redis). Ver docs/eng/OBSERVABILITY.md."
  },
  {
    title: "[OBS] OpenTelemetry: tracing http/prisma/connectors com export OTLP",
    body: "Adicionar @opentelemetry/sdk-node com auto-instrumentações http, next, prisma, fetch. Spans mínimos: http.server, prisma.query, connector.fetch, stripe.webhook. Export configurável (Datadog/NewRelic/Jaeger)."
  },
  {
    title: "[TEST] Playwright E2E das jornadas críticas",
    body: "Criar playwright.config.ts + tests/e2e: (1) busca→produto→carrinho, (2) compare 2 produtos, (3) login admin→pipeline, (4) checkout Stripe teste→webhook→pedido. Ver docs/eng/TESTING.md."
  },
  {
    title: "[TEST] Testes unitários de domain/application + Codecov com gate 60%",
    body: "Cobrir @workspace/domain (price math, normalização), resolvePermissions e src/lib/fx.ts (90%). Upload de cobertura no CI e codecov gate inicial 60%."
  },
  {
    title: "[QUALITY] Adicionar Knip + Stryker mutation testing nos módulos de domínio",
    body: "Knip para dead code (aviso→bloqueio) e Stryker mutation testing em domain/fx (métrica). Detalhes em docs/eng/TESTING.md."
  },
  {
    title: "[UX] Skeletons em todas as rotas assíncronas + lazy loading",
    body: "Aplicar docs/eng/MOTION-SYSTEM.md: ProductCard skeleton (shimmer), skeleton da página de produto com Suspense/loading.tsx, skeleton da tabela compare, admin/pipeline. next/dynamic com skeleton para knowledge IA, charts e compare table. CLS=0."
  },
  {
    title: "[UX] Adotar framer-motion na UI (entradas/saídas/press feedback)",
    body: "framer-motion já é dependência mas não é usado. Implementar padrões de docs/eng/MOTION-SYSTEM.md: entrada fade+translateY 12px, saída mais curta, press scale 0.97, stagger <400ms em grids, prefers-reduced-motion respeitado (tokens já em globals.css)."
  },
  {
    title: "[FE] Hero 3D da landing com React Three Fiber (lazy)",
    body: "Hero da landing com produto 3D via R3F/Three.js, carregado por next/dynamic + IntersectionObserver, fallback estático, bundle 3D fora do caminho crítico. Ver docs/eng/FRONTEND-DESIGN.md."
  },
  {
    title: "[SEO] Completar pacote @workspace/seo: sitemap/robots placeholders + JSON-LD",
    body: "sitemap.ts/robots.ts já criados no app; conectar buildMetadata em todas as rotas, JSON-LD Product+Offer (BRL), BreadcrumbList, FAQPage nas páginas com FAQ, llms.txt. Ver docs/eng/SEO-AEO-AIO-GEO.md."
  },
  {
    title: "[SEO] Auditoria contínua: Lighthouse CI + Screaming Frog trimestral",
    body: "Job CI semanal com Lighthouse CI (budget perf/SEO) e lembrete de crawl trimestral com Screaming Frog; strix/open-seo como opção de auditoria no CI."
  },
  {
    title: "[ARCH] Feature flags central em @workspace/config",
    body: "Criar flags.ts conforme docs/eng/ARCHITECTURE.md (compare_v2, fx_live_quotes, rls_enforcement, mfa_admin...), lidas no server e passadas via props; overrides por Store.settings; remoção com Knip após rollout."
  },
  {
    title: "[CI] CI completa: lint, build, testes e integração no PR",
    body: "ci.yml hoje roda apenas integridade python + gitleaks. Adicionar jobs: lint, build, testes unitários (bun:test), integração com service Postgres, security-gate (já criado) como required check. Branch protection no main."
  }
];

async function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  const { execSync } = await import("node:child_process");
  const out = execSync("git credential fill", {
    input: "protocol=https\nhost=github.com\n",
    encoding: "utf8"
  });
  const line = out.split("\n").find((l) => l.startsWith("password="));
  if (!line) throw new Error("Sem token GitHub (git credential / GITHUB_TOKEN)");
  return line.slice("password=".length).trim();
}

const token = await getToken();
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json",
  "User-Agent": "shopfinder-issue-script"
};

let existing = [];
try {
  existing = await (await fetch(`https://api.github.com/repos/${REPO}/issues?state=all&per_page=100`, { headers })).json();
} catch {}

for (const issue of issues) {
  const dupe = Array.isArray(existing) && existing.find((i) => i.title === issue.title);
  if (dupe) {
    console.log(`[skip] ${issue.title}`);
    continue;
  }
  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers,
    body: JSON.stringify({ title: issue.title, body: issue.body, labels: ["engineering"] })
  });
  const data = await res.json().catch(() => ({}));
  console.log(res.ok ? `[ok] #${data.number} ${issue.title}` : `[fail ${res.status}] ${issue.title} ${JSON.stringify(data).slice(0, 200)}`);
}
