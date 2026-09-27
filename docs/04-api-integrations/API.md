# API — Superfície de APIs

> **Pública:** v1 read-only, documentada em `/api-docs` (página no app). Internas: rotas do app. Contratos zod em `@workspace/contracts`.

## API pública v1

**Base:** `/api/public/v1` — read-only, sem auth, **rate limit 30 req/min** por IP.

| Endpoint                                | Descrição                                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `GET /api/public/v1/products?q=<termo>` | Busca de produtos (filtro textual em memória); resposta com preços em minor units + `currencyCode` |

Convenções de resposta: JSON; dinheiro sempre `{amountMinor: string(bigint), currencyCode}` (bigint serializa como string); erros `{error: {code, message}}` sem stack. Mudanças quebrando = nova versão (`/v2`), nunca in-place.

## Internas (app)

| Rota                                                       | Uso                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET/POST /api/reviews`                                    | Reviews publicadas / criar (auth; 1 por usuário/produto; moderação regex → `flagged`) |
| `GET/PATCH /api/admin/reviews[/id]`                        | Moderação (RBAC `admin.access`; approve/remove)                                       |
| `GET/POST/DELETE /api/alerts[/id]`                         | Alertas de preço do usuário (cap 20; owner-only no delete)                            |
| `GET /api/catalog`                                         | Catálogo interno (validação de slugs do compare: `path=products&slugs=`)              |
| `POST /api/checkout-session`                               | Stripe Checkout Session                                                               |
| `POST /api/webhooks/stripe`                                | Webhook idempotente (`checkout.session.completed` → Order)                            |
| `POST /api/telegram/webhook`                               | Scaffold do bot (secret-gated; E3)                                                    |
| `GET /api/cron/price-alerts` · `/api/cron/price-snapshots` | Crons Vercel (Bearer `CRON_SECRET`)                                                   |

Admin geral sob `requirePermissions("admin.access")` (RBAC em [`docs/05-security-compliance/RBAC.md`](../05-security-compliance/RBAC.md)).

## Regras para rota nova

1. Validação zod na entrada (`@workspace/api` helpers); respostas padronizadas.
2. Dado sensível **nunca** em rota pública; multi-tenant carrega `storeId` da sessão (nunca do request).
3. Mutations externas com idempotência onde houver retry (webhook/pagamento).
4. Rate limit em tudo que é público/aberto.
5. Documentar aqui e em `/api-docs` quando público.

## Decisão pendente

P2-1 (manter API pública aberta) — recomendação da casa: **MANTER-PUBLICA** (vantagem GEO/AIO); aguarda Operador (`PENDENCIAS_OPERADOR.md`).
