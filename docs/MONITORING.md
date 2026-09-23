# MONITORING — Observabilidade

> **Fonte canônica:** [`docs/eng/OBSERVABILITY.md`](eng/OBSERVABILITY.md) (error reporting, logs, tracing, SLOs). Erros: [ERROR_HANDLING.md](ERROR_HANDLING.md).

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
