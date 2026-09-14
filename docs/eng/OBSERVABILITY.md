# Observabilidade — Error Reporting, Logs e Telemetria

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

| SLO | Alvo | Alerta |
|---|---|---|
| Disponibilidade API | 99.9% | burn rate > 2% |
| p95 latência API | < 400ms | 3 janelas de 5min acima |
| Webhook Stripe sucesso | > 99% | qualquer falha não recuperada em 3 retries |
| Erro de cliente (4xx/5xx em checkout) | < 1% | spike de 5xx |

## 5. Health checks

- `/api/health` (liveness): processo + versão.
- `/api/health/ready` (readiness): ping `DATABASE_URL` + Redis.
