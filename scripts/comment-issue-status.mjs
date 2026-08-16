/**
 * Posta o comentário de progresso nas issues da fase 2.
 * Uso: GITHUB_TOKEN=<token-com-escopo-issues> node scripts/comment-issue-status.mjs
 * (O PAT usado na criação das issues expirou antes do envio dos comentários.)
 */
const REPO = "ENDARTStudios/ShopFinder";

const comments = {
  25: "Entregue no branch chore/eng-excellence (PR pendente): /api/health (liveness com uptime) e /api/health/ready (readiness com ping Postgres + Redis, 503 quando o banco falha). Falta: adapter Sentry no report-error.",
  28: "Parcial no branch chore/eng-excellence: 9 testes unitários (bun:test) para rate-limit (fallback memória) e feature flags — npm test agora roda `bun test tests/unit`; test:integration separado. Falta: cobertura de domain/fx e Codecov.",
  30: "Parcial no branch chore/eng-excellence: loading.tsx para /produtos/[slug], /compare e /admin (espelham layout final, CLS=0), ProductCardSkeleton/Grid e skeleton no lugar do spinner em CompatibleProducts. Pendente: landing/grid de busca e demais painéis admin.",
  31: "Parcial no branch chore/eng-excellence: FadeIn/FadeInStagger/FadeInItem (framer-motion, easings do MOTION-SYSTEM.md, prefers-reduced-motion) aplicados no header do produto e no grid de compatíveis; press feedback active:scale-[0.97] no Button base. Pendente: drawer do carrinho, modais e landing.",
  33: "Parcial no branch chore/eng-excellence: sitemap.ts/robots.ts (fase 1) + JSON-LD Product/Offer com preço e disponibilidade na página de produto. Pendente: BreadcrumbList, FAQPage, llms.txt, buildMetadata em todas as rotas.",
  35: "Concluído no branch chore/eng-excellence: @workspace/config/flags com 6 flags + isFlagEnabled com overrides por store (testado em tests/unit/flags.test.ts).",
  36: "Parcial no branch chore/eng-excellence: job unit-tests (bun) no ci.yml; security-gate com lint não-bloqueante — ESLint 10 quebra com eslint-plugin-react 7.37 (contextOrFilename.getFilename), precisa upgrade do plugin ou migração da config; erros TS pré-existentes continuam (ignoreBuildErrors)."
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
  console.log(res.ok ? `[ok] #${number}` : `[fail ${res.status}] #${number} ${JSON.stringify(data).slice(0, 120)}`);
}
