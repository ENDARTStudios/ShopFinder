# Testes — Unitários, Integração e E2E

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
