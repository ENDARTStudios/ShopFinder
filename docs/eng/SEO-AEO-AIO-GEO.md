# SEO, AEO, AIO e GEO — Estratégia

## Objetivos

| Disciplina | Objetivo | Métrica |
|---|---|---|
| **SEO** | Rankear em buscas de produto (head + long tail) | impressões/clicks GSC, posição média |
| **AEO** (Answer Engine) | Responder perguntas diretas (spec comparisons) | featured snippets, PAA |
| **AIO** (AI Optimization) | Ser citado por LLMs (ChatGPT/Perplexity) | tráfego referente a ai.* domains |
| **GEO** (Generative Engine Optimization) | Presença em respostas generativas com fontes | share of voice em prompts do nicho |

## Táticas

### SEO
1. `sitemap.ts` e `robots.ts` no App Router (implementados neste PR) — sitemap com produtos ativos + categorias, `lastModified` real.
2. `buildMetadata()` (já existe) em todas as rotas: title único, canonical, OG/Twitter.
3. JSON-LD: `Product` + `Offer` (preço BRL, disponibilidade), `BreadcrumbList`, `Organization`, `FAQPage` onde houver FAQ.
4. URL semântica `/produtos/[slug]` com slug estável (nunca mudar sem redirect 301).
5. Core Web Vitals: skeletons, `next/dynamic` para painéis pesados, imagens otimizadas.

### AEO
- Página de produto com seção "Perguntas frequentes" estruturada (`FAQPage` JSON-LD) e specs em tabela semântica (`<table>` real, não divs).
- Respostas diretas de 40-60 palavras logo após cada pergunta H2/H3.

### AIO / GEO
- Conteúdo comparativo citável ("X vs Y", "melhor Z para W") em `/compare` com conteúdo renderizado server-side (LLMs não executam JS).
- `llms.txt` na raiz com mapa do catálogo comparativo.
- Fontes externas consistentes (NAP, Wikipedia/Wikidata da marca) para grounding.

## Erros comuns a evitar
- ❌ Renderizar specs só no client (invisível para crawlers/LLMs).
- ❌ Duplicar `title`/`description` entre produtos similares.
- ❌ Sitemap com URLs 404/redirect.
- ❌ Bloquear CSS/JS no robots (quebra render do crawler).
- ❌ Trocar slugs sem 301.

## Ferramentas/CLIs
- Screaming Frog (crawl trimestral), `usestrix/strix` e `every-app/open-seo` para auditoria contínua no CI (job semanal), Lighthouse CI (performance + SEO budget).
