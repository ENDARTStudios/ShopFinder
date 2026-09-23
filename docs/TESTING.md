# TESTING — Estratégia de Testes (entrada)

> **Fonte canônica:** [`docs/eng/TESTING.md`](eng/TESTING.md) (pirâmide, config Playwright, cobertura, Stryker).

## Pirâmide

| Camada      | Ferramenta                                   | Onde                          | Roda                                                            |
| ----------- | -------------------------------------------- | ----------------------------- | --------------------------------------------------------------- |
| Unit        | bun:test                                     | `packages/*/src/**/*.test.ts` | CI + local                                                      |
| Integração  | bun:test contra dev server (`TEST_BASE_URL`) | `tests/integration/`          | CI (job com Postgres service)                                   |
| E2E         | Playwright                                   | `tests/e2e/`                  | CI (job dedicado; checkout Stripe gated `E2E_CHECKOUT_ENABLED`) |
| Arquitetura | script próprio                               | `npm run test:arch`           | CI (bloqueia)                                                   |
| Segurança   | gitleaks + CodeQL + npm audit                | workflows                     | CI/semanal                                                      |

## O que testar (prioridade da casa)

1. **Matemática de dinheiro** — price/fx: 90% de cobertura + mutation testing (Stryker em `src/lib/{price,fx-core,totp}.ts` + `@workspace/domain`).
2. **Contratos** — zod schemas, normalização de conectores (unit puro).
3. **Jornadas críticas** (E2E): busca → PDP → carrinho; compare; admin → pipeline; checkout teste → webhook.
4. **Autorização** — admin/reviews, alerts owner-only (integração com auth mock).
5. **Idempotência** — webhook Stripe, crons (P2002 = skip, não erro).

## Cobertura

- Instrumentação `npm run test:coverage` (lcov) → Codecov (secret `CODECOV_TOKEN`).
- Gate: **60% global**, sobe 5%/trimestre; **90%** para domínio e fx (dinheiro).

## Convenções

- Teste unit sem I/O (sem rede, sem banco); integração assume `TEST_BASE_URL` vivo.
- Screenshots + traces do Playwright em falha viram artefatos de CI.
- Bug em produção = teste de regressão junto do fix (mesmo PR).

## No CI (importante p/ não repetir T108)

Jobs que só geram o client Prisma (typecheck/lint/unit/knip) exportam um `DATABASE_URL` **postgres dummy** — o postinstall sem essa var flipa o schema p/ sqlite e quebra tipos/migrations (DECISAO-CI-PRISMA-001). Jobs de build/integration/e2e usam service container Postgres real.
