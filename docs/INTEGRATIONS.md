# INTEGRATIONS — Integrações Externas

> Estado operacional + regras de cada integração. Credenciais: `.env.example` + [`docs/eng/SECRETS.md`](eng/SECRETS.md). Conectores: `@workspace/infrastructure/connectors/`.

## Fornecedores (pipeline RF-3)

| Conector                                     | Estado                      | Notas                                                                                              |
| -------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| **eBay**                                     | ✅ Sandbox + produção       | Scope de produção como **STRING** nos 2 hosts; `EBAY_ENV=production`; smoke 129k itens (T047/T055) |
| **DigiKey**                                  | ✅ Produção (STM32 = 6.503) | Rotas v4 do Swagger; normalizado via `DigiKeyClient` + adapters no `BaseConnector` (merge T048)    |
| AliExpress / Amazon / Newegg / manufacturers | 🟡 Scaffold pronto          | Aguardando credenciais (P1-3/B1, Operador)                                                         |

## Pagamento

- **Stripe** — Checkout Session + webhook `checkout.session.completed` (idempotente; entrega automática provada T020b/T041). Código lê apenas `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`. Checkout hospedado: `cs_test_` rotaciona a cada uso.

## Mensageria

- **Telegram** — webhook scaffold (`/api/telegram/webhook`, secret-gated; comandos /start, /busca). Operacional após token (P1-2).

## Plataforma

- **Neon** (Postgres produção — provisionado pelo Operador; o do `.env` é staging remoto, **não é sandbox**)
- **Vercel** — Git Integration, crons (`vercel.json`), previews; cleanup de deployments via workflow próprio (gated `CLEANUP_ENABLED` + `VERCEL_TOKEN`, DRY_RUN default)
- **Upstash Redis** — cache de cotação FX (TTL curto)

## Observabilidade / IA

- **Sentry** — gated `SENTRY_DSN` (F1); sem DSN = no-op, app não quebra.
- **OTel** — export OTLP opcional (`OTEL_EXPORTER_OTLP_ENDPOINT` vazio = tracing off).
- **TypeSafe (System One/Jev)** — skill ratificada (set/2026); integração futura gated `TYPESAFE_API_KEY` server-side; candidato D1 (pré-triagem de reviews). Docs live: `docs.typesafe.ai/llms.txt` (ler antes de integrar).

## Regras para integração nova

1. Transport em `@workspace/integrations`; normalização no conector (adapter → `BaseConnector`) — nunca parse ad-hoc em rota.
2. Segredo → `.env.example` sem valor + `eng/SECRETS.md` + provisionamento pelo Operador na Vercel.
3. Fail-closed: sem credencial = feature desliga limpo (log + estado neutro), nunca erro 500 no usuário.
4. Resiliência: timeout, retry com backoff, degradação graciosa (página renderiza sem o fornecedor caído).
5. Registrar estado aqui e no `eng/AGENT-TOOLBELT.md` quando for tooling de agente.
