# SEO — Search Engine Optimization

> **Fonte canônica:** [`docs/07-operations-marketing/SEO.md`](../07-operations-marketing/SEO.md) (estratégia completa). Disciplinas irmãs: [AEO.md](AEO.md) · [GEO.md](GEO.md) · [AIO.md](AIO.md).

## Objetivo e métrica

Rankear em buscas de produto (head + long tail) — **impressões/clicks no GSC, posição média**.

## Instruções (o que fazer em toda página/rota)

1. `buildMetadata()` (`@workspace/seo`) em **toda** rota: title único, canonical, OG/Twitter. Nunca duplicar title/description entre produtos similares.
2. `sitemap.ts`/`robots.ts` no App Router: produtos ativos + categorias com `lastModified` real; **nunca** URLs 404/redirect no sitemap.
3. JSON-LD: `Product` + `Offer` (preço BRL, disponibilidade), `BreadcrumbList`, `Organization`, `FAQPage` onde houver FAQ.
4. URL semântica `/produtos/[slug]` com **slug estável** — troca de slug só com redirect 301.
5. Core Web Vitals "Good": skeletons, `next/dynamic` p/ painéis pesados, imagens otimizadas (ver [PERFORMANCE.md](PERFORMANCE.md)).
6. **Conteúdo server-side**: specs e preços renderizados no server (crawlers não executam JS; ver erros comuns abaixo).

## Erros comuns (bloqueiam review)

- ❌ Renderizar specs/preço só no client
- ❌ Bloquear CSS/JS no robots (quebra render do crawler)
- ❌ Trocar slugs sem 301
- ❌ Sitemap com URLs mortas

## Ferramentas

Screaming Frog (crawl trimestral) · Lighthouse CI (budget SEO) · GSC (monitor) · jobs semanais de auditoria (`usestrix/strix`, `every-app/open-seo` — ver `docs/03-development-process/AGENT-TOOLBELT.md`).

## Pegadinhas do projeto

- Preços renderizam com **NBSP** (`\u00a0`) via `Intl` — validações de HTML/regex precisam contemplar.
- Mensagens i18n vêm embutidas no HTML pelo `NextIntlClientProvider` — greps de conteúdo no HTML bruto pegam os 3 catálogos; filtrar ou descontar.
