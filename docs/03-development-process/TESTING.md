# Testing — Estratégia de Testes

> Reorganização 2026-09 (#79): arquivo fundido a partir de fontes separadas. Conteúdo de cada fonte preservado verbatim como "Parte N".

---

## Parte — TESTING

> **Fonte canônica:** [`docs/03-development-process/TESTING.md`](../03-development-process/TESTING.md) (pirâmide, config Playwright, cobertura, Stryker).

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

---

## Parte — TESTING

## 1. Pirâmide

| Camada      | Ferramenta                    | Local                                        | Roda em                       |
| ----------- | ----------------------------- | -------------------------------------------- | ----------------------------- |
| Unit        | `bun:test` (ou vitest)        | `packages/*/src/**/*.test.ts`                | CI, pre-push                  |
| Integração  | `bun:test` contra dev server  | `tests/integration/*.test.ts` (já existem 6) | CI (job com service Postgres) |
| E2E         | Playwright                    | `tests/e2e/*.spec.ts`                        | CI (job dedicado)             |
| Arquitetura | script próprio                | `scripts/architecture-test.mjs`              | CI                            |
| Segurança   | gitleaks + CodeQL + npm audit | workflows existentes                         | CI                            |

## 2. Convenções

- Unit: testam `@workspace/domain` e `application` puros (price math, `resolvePermissions`, normalização de conectores). Sem I/O.
- Integração: sobem `next dev` + `TEST_BASE_URL`; cobrem API admin (com auth mock), compare, webhook (assinatura válida/inválida), pipeline status.
- E2E (Playwright) — jornadas críticas:
  1. Buscar produto → abrir `/produtos/[slug]` → adicionar ao carrinho.
  2. Compare: adicionar 2 produtos e ver tabela.
  3. Login admin → `/admin/pipeline` renderiza status.
  4. Checkout Stripe em modo teste → webhook → pedido criado.
- Screenshots + traces em falha (artefatos de CI).

## 3. Config Playwright

Implementada em `playwright.config.ts` (#27): jornadas em `tests/e2e`
(catálogo→carrinho, compare, admin→pipeline, checkout Stripe gated por
`E2E_CHECKOUT_ENABLED`). CI: job `e2e` com Postgres service + seed +
`scripts/create-admin.ts`. Local: `bunx playwright test` (sobe o dev server).

## 4. Qualidade e lint de código

| Ferramenta                      | Uso                                                                                                                                             | Gate                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| ESLint + Prettier               | ESLint 9 (peer-range do eslint-plugin-react 7.37) + husky/lint-staged                                                                           | aviso no CI → bloqueio após triagem |
| Knip                            | dead code / exports não usados (`bun run knip`)                                                                                                 | aviso → bloqueio                    |
| arch-test (`npm run test:arch`) | dependências entre camadas                                                                                                                      | bloqueia                            |
| CodeQL                          | SAST semanal                                                                                                                                    | bloqueia alerts high+               |
| Stryker (mutation)              | `stryker.config.json` — muta `src/lib/{price,fx-core,totp}.ts` + `@workspace/domain`; rodar com `bunx stryker run` (métrica manual, fora do CI) | métrica, não gate                   |
| commitlint + changesets         | já configurados                                                                                                                                 | bloqueia                            |

## 5. Cobertura (Codecov)

- Instrumentação: `npm run test:coverage` (bun test, saída `coverage/lcov.info`); upload no job `unit-tests` via codecov-action (requer secret `CODECOV_TOKEN`).
- Gate inicial: 60% global, subindo 5% por trimestre; 90% para `@workspace/domain` e `src/lib/fx*.ts` (matemática de dinheiro).
- Mutation testing (Stryker) complementa a cobertura nos módulos de domínio.
