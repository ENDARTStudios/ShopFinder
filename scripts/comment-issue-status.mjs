/**
 * Posta o comentário de progresso nas issues da fase 4.
 * Uso: GITHUB_TOKEN=<token-com-escopo-issues> node scripts/comment-issue-status.mjs
 * (O PAT usado na criação das issues expirou antes do envio dos comentários.)
 */
const REPO = "ENDARTStudios/ShopFinder";

const comments = {
  25: "Fase 4 no branch chore/eng-excellence: build de produção destravado — src/lib/redis.ts (usado pelo /api/health/ready) importava @upstash/redis (não é dependência do projeto) e ./logger (arquivo inexistente); reescrito no padrão REST/fetch do rate-limit.ts com degradação graciosa quando não configurado. Pendente da issue: adapter Sentry no report-error.",
  30: "Fase 4 no branch chore/eng-excellence: spinners substituídos por skeletons que espelham o layout final (MOTION-SYSTEM §4) — landing (nichos, categorias, tiers de fabricantes, grid de produtos com bloco de imagem + linhas de texto + preço), dashboard admin (cards de resumo + tabela de produtos), pipeline (cards de status) e tabela compare (colunas com larguras estáveis, CLS=0). Rotas já cobertas por loading.tsx desde a fase 2.",
  31: "Fase 4 no branch chore/eng-excellence: FadeIn/FadeInStagger/FadeInItem aplicados na landing — hero com stagger, grids de nichos/categorias/tiers de fabricantes e seção FAQ; o grid de produtos entra em bloco porque o stagger completo em dezenas de itens violaria o total <400ms do MOTION-SYSTEM. FadeInStagger agora aceita itemCount e limita a cascata a 400ms em grades grandes.",
  33: "Fase 4 no branch chore/eng-excellence: @workspace/seo/schema populado com buildProductJsonLd/buildBreadcrumbJsonLd/buildFaqJsonLd + jsonLdScript (escape de </script> contra breakout), com 6 testes unitários; buildMetadata conectado em /, /compare, /produtos/[slug], /checkout (noindex) e /admin (noindex); seção FAQ visível na landing (i18n pt-BR/en) com FAQPage JSON-LD emitido no server component. Escopo da issue completo no branch."
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
