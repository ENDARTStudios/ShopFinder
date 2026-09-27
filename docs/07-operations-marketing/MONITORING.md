# Monitoring — Observabilidade

> Reorganização 2026-09 (#79): arquivo fundido a partir de fontes separadas. Conteúdo de cada fonte preservado verbatim como "Parte N".

---

## Parte — MONITORING

> **Fonte canônica:** [`docs/07-operations-marketing/MONITORING.md`](../07-operations-marketing/MONITORING.md) (error reporting, logs, tracing, SLOs). Erros: [ERROR_HANDLING.md](ERROR_HANDLING.md).

## Stack

| Sinal           | Ferramenta                                | Gating                                      |
| --------------- | ----------------------------------------- | ------------------------------------------- |
| Erros           | Sentry (`@workspace/observability`)       | `SENTRY_DSN` (F1) — sem DSN = no-op         |
| Traces          | OpenTelemetry → OTLP/HTTP                 | `OTEL_EXPORTER_OTLP_ENDPOINT` (vazio = off) |
| Logs            | Log estruturado server-side (Vercel logs) | `LOG_LEVEL`                                 |
| Uptime/execução | Logs de cron da Vercel + smoke pós-deploy | —                                           |

## O que monitorar por sistema

- **Crons:** `price-snapshots` (06:00 UTC) e `price-alerts` (13:00 UTC) — falha silenciosa é o pior caso; conferir no dia seguinte se gravou/executou (idempotência permite re-run manual seguro).
- **Webhook Stripe:** taxa de erro < 1% pós-3-tentativas (métrica do PRD); entrega = Order criada sem replay.
- **Conectores:** saúde por fornecedor (eBay/DigiKey) — degradação = página renderiza sem o fornecedor + nota; alertar quando cai por > 1 ciclo.
- **p95 API < 400ms · uptime 99.9%** (SLOs do PRD).
- **Segurança:** spikes de 401/403 (rate anomaly), alerts do CodeQL/Dependabot.

## SLO e resposta

| Sinal         | Alvo     | Se estourar                                                     |
| ------------- | -------- | --------------------------------------------------------------- |
| Uptime        | 99.9%    | Ver Vercel status + redeploy se deploy-correlato                |
| p95 API       | < 400ms  | Checar connector lento no caminho crítico (timeout configurado) |
| Webhook error | < 1%     | Investigar assinatura/replay; Stripe dashboard                  |
| Cron do dia   | executou | Re-run manual (rotas idempotentes) + abrir incidente            |

## Postura

- **Sem PII em logs** (LGPD) — IDs de entidade e rota, nunca dado pessoal.
- Alerta que ninguém ação = alerta morto: revisar a cada mudança de SLO.
- Incidente de produção → post-mortem em `DECISOES.md` (padrão da casa: causa-raiz + lição + como prevenir família).

---

## Parte — OBSERVABILITY

## 1. Error reporting

**Error boundaries (App Router)** — implementados neste PR:

- `src/app/error.tsx` — boundary de rota com UI de recuperação e report ao logger.
- `src/app/global-error.tsx` — boundary raiz (html/body completo).
- `src/app/api/_lib/handle-api-error.ts` — captura de exceções em API routes com status correto.

**Captura**: `@workspace/observability` com `captureError(err, context)`. Adapter Sentry-ready: se `SENTRY_DSN` presente, forward (Sentry/Datadog/NewRelic aceitam DSN/OTLP); caso contrário, log estruturado em stdout (coletável por qualquer agent — Vercel Log Drain, Datadog, OpenTelemetry Collector).

```ts
// @workspace/observability/src/capture.ts (alvo)
export function captureError(err: unknown, ctx: Record<string, unknown> = {}) {
  logger.error({ err: serialize(err), ...ctx }); // sempre
  if (process.env.SENTRY_DSN) forwardToSentry(err, ctx); // opcional
}
```

## 2. Logs estruturados

- `LOG_LEVEL` (debug|info|warn|error), JSON em stdout: `{ts, level, msg, route, requestId, storeId, err}`.
- `requestId` gerado no middleware e propagado (header `x-request-id`) — correlaciona front, API e webhook.
- Webhook Stripe já loga diagnóstico (T022/T023); manter payload hash + outcome.

## 3. Tracing (Open Telemetry)

Roadmap: `@opentelemetry/sdk-node` com auto-instrumentações `http`, `next`, `prisma`, `fetch`. Export OTLP → collector da escolha (Datadog/NewRelic/Jaeger). Spans mínimos: `http.server`, `prisma.query`, `connector.fetch`, `stripe.webhook`.

## 4. Métricas e SLOs

| SLO                                   | Alvo    | Alerta                                     |
| ------------------------------------- | ------- | ------------------------------------------ |
| Disponibilidade API                   | 99.9%   | burn rate > 2%                             |
| p95 latência API                      | < 400ms | 3 janelas de 5min acima                    |
| Webhook Stripe sucesso                | > 99%   | qualquer falha não recuperada em 3 retries |
| Erro de cliente (4xx/5xx em checkout) | < 1%    | spike de 5xx                               |

## 5. Health checks

- `/api/health` (liveness): processo + versão.
- `/api/health/ready` (readiness): ping `DATABASE_URL` + Redis.
