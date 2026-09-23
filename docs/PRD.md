# PRD — Requisitos do Produto

> **Fonte canônica:** [`docs/eng/PRD.md`](eng/PRD.md) (v1.0, 2026-08-15, owner ENDART Studios).
> Este arquivo é a camada de entrada; requisitos completos vivem no `eng/`.

## Produto

**ShopFinder** — comparador de preços de hardware/eletrônicos com preços em BRL (cotação ao vivo), agregando ofertas de marketplaces (eBay, AliExpress, Amazon, Newegg, DigiKey, fabricantes). Fornecedores são invisíveis ao cliente final (DECISAO-PRODUTO-001); pedidos são repassados ao fornecedor mais barato após pagamento Stripe.

Direção atual (desde T100/T101, set/2026): **"Commerce Utility"** — utilidade de compra sóbria, claims públicos somente com prova (CDC art. 37).

## Personas (resumo)

| Persona                   | Necessidade-chave                 |
| ------------------------- | --------------------------------- |
| Comprador (guest/cliente) | Buscar, comparar, comprar em BRL  |
| Admin de loja             | Catálogo, pedidos, pipeline       |
| Operador de integrações   | Conectores, SyncJobs, credenciais |
| Superadmin                | Cross-store, flags, segurança     |

Detalhe e anti-personas: [DEFINE_THE_USER.md](DEFINE_THE_USER.md).

## Requisitos por área (highlights)

- **RF-1 Descoberta:** busca full-text (MiniSearch), PDP `/produtos/[slug]`, compare `/compare`, BRL ao vivo (`src/lib/fx.ts`), filtros (T102/T107: supplier/marca/preço/estoque + sort + densidade via URL-state).
- **RF-2 Checkout:** cart Zustand, Stripe Checkout Session, webhook `checkout.session.completed` idempotente (provado T020b/T041).
- **RF-3 Pipeline:** conectores + SyncJob/SyncExecutionLog, histórico de preço (`PriceSnapshot` diário, cron 06:00 UTC), dashboard `/admin/pipeline`.
- **RF-4 Identidade:** NextAuth Credentials+JWT, RBAC `resolvePermissions`, multi-tenant por `Store`.
- **RF-5 i18n:** next-intl, pt-BR/en/es-ES (cookie `locale`).

## Não-funcionais

LCP < 2.5s · uptime 99.9% · RLS + HSTS/CSP + rate limiting · Sentry-ready · cobertura ≥ 60% (90% domínio) · CWV "Good". Detalhe: `eng/PRD.md` §4.

## Métricas de sucesso

Conversão checkout ≥ 1.5% · cobertura ≥ 60% (sobe p/ 80% por módulo) · < 1% webhooks com erro após 3 tentativas · p95 API < 400ms.

## Fora de escopo (v1)

Marketplace 3ºs com checkout próprio · NFe automática · apps nativos.

## Como manter

Mudança de requisito = editar `eng/PRD.md` (canônico) e atualizar o resumo aqui no mesmo PR. Feature nova entra primeiro no PRD, depois no código.
