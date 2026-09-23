# PERFORMANCE — Orçamentos e Práticas

> Metas de RNF: `eng/PRD.md` §4 (LCP < 2.5s em 4G; p95 API < 400ms; CWV "Good"). Medição contínua: workflow `.github/workflows/lighthouse.yml`.

## Orçamentos

| Métrica               | Alvo                               |
| --------------------- | ---------------------------------- |
| LCP (mobile 4G)       | < 2.5s                             |
| p95 API               | < 400ms                            |
| Cobertura JS por rota | Painéis pesados via `next/dynamic` |
| Lighthouse (perf/SEO) | Budget no CI (job dedicado)        |

## Práticas obrigatórias

1. **Skeleton em toda rota assíncrona** (`eng/MOTION-SYSTEM.md`) — nunca spinner bloqueante em cima da dobra.
2. **Lazy loading** de painéis pesados e imagens otimizadas do Next.
3. **Server-first:** dados do catálogo no RSC; client só para interação real (filtros, compare, carrinho).
4. **Filtros de resultados:** SSR com `take` de 2.000 candidatos + filtros in-memory + `slice 60` — ceiling consciente; se o catálogo crescer 10×, mover filtros para o banco (resolver com `mode:"insensitive"` tipado p/ postgres).
5. **Cache:** cotação FX com TTL curto (Redis); catálogo revalida por rota.
6. **PWA:** `sw.js` cache-first só para estáticos; navegações network-first (nunca servir conteúdo velho de produto/preço).

## Como medir (sem false readings)

Receita validada na casa: `next start` (não bun standalone — empaca sob LH repetido) + health-check + **1 run por vez** + matar chromes zumbis. Lighthouse 12 não tem categoria PWA — prova offline via CDP.

## Regressões conhecidas (não reintroduzir)

- `take` baixo fatiando o catálogo silenciosamente (q=i9 voltava vazio com take 1000 sobre 1.063 itens).
- Full-page screenshot com header fixo + canvas glitcha — não é bug de render do app.
- Pipe com `head`/`tail` no meio do Lighthouse mata o run (SIGPIPE).
