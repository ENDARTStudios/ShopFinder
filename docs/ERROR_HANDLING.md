# ERROR_HANDLING — Tratamento de Erros

> **Fonte canônica:** [`docs/eng/OBSERVABILITY.md`](eng/OBSERVABILITY.md) (logs, captura, taxonomia) + `@workspace/api` (helpers de resposta). Aqui: padrões práticos.

## Taxonomia (resumo)

| Classe           | Exemplo                                              | Resposta                            | Alerta          |
| ---------------- | ---------------------------------------------------- | ----------------------------------- | --------------- |
| Validação (4xx)  | Zod invalid, params de URL inválidos                 | 400 com campo                       | Não             |
| AuthZ (4xx)      | Sem sessão/permissão (`requirePermissions`)          | 401/403                             | Rate-anomaly só |
| Conflito (4xx)   | Review duplicada (1/usuário), alerta ativo duplicado | 409                                 | Não             |
| Não encontrado   | Produto/slug inexistente                             | 404 (ver soft-404 abaixo)           | Não             |
| Upstream (5xx)   | eBay/DigiKey/Stripe fora                             | Fallback/degrade + log estruturado  | Sim             |
| Inesperado (5xx) | Bug                                                  | 500 genérico **sem stack** + Sentry | Sim             |

## Padrões obrigatórios

1. **Nunca stack trace na resposta** — detalhe vai para log estruturado/Sentry.
2. **Webhooks/crons fail-closed:** Bearer `CRON_SECRET` obrigatório (sem secret = 401/503, nunca executa); Stripe valida assinatura; idempotência por evento (P2002/dedupe).
3. **Soft-404 com streaming:** `notFound()` dentro de page com `loading.tsx` vira 200 — o gate real de 404 (e de redirecionamento por slug) vai no `layout.tsx` do segmento, pré-flush (T032).
4. **Error boundaries:** `error.tsx` por segmento com recovery ("Tentar novamente"); registrar `digest` para correlacionar com Sentry.
5. **Degradação graciosa upstream:** se um conector falha, a página renderiza com as ofertas dos demais + nota neutra (nunca página vazia por falha única).
6. **Client:** erros de mutate via toast (sonner) **e** inline no formulário; erros de fetch de leitura mantêm skeleton + estado de retry.

## Erros de domínio com código

Prisma/DB conhecidos tratados explicitamente: `P2002` (unique — idempotência/skip ou 409), `P2025` (não achou — 404). Não deixar vazar mensagem crua do Prisma.

## Registro

Log estruturado (`@workspace/observability`) com contexto (rota, storeId quando aplicável, IDs de entidade — **sem PII**). Sentry só com `SENTRY_DSN` (gated F1). Ver [MONITORING.md](MONITORING.md).
