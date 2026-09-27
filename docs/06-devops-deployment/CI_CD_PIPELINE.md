# CI_CD_PIPELINE — Pipeline de Integração e Entrega

> Workflows em `.github/workflows/`. Gate de deploy e controles de segurança: [`05-security-compliance/SECURITY.md`](../05-security-compliance/SECURITY.md). Estratégia de testes: [TESTING.md](../03-development-process/TESTING.md) (03).

## Jobs do CI (`.github/workflows/ci.yml`)

| Job              | O que faz                                           | Nota                                                                                  |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `typecheck`      | `tsc --noEmit` (gate: `ignoreBuildErrors: false`)   | Exporta `DATABASE_URL` postgres dummy (client Prisma correto — DECISAO-CI-PRISMA-001) |
| `lint`           | ESLint 9 + Prettier                                 | Mesmo env dummy                                                                       |
| `unit-tests`     | `bun test tests/unit` + upload Codecov              | Secret `CODECOV_TOKEN`                                                                |
| `knip`           | dead code / exports                                 | Mesmo env dummy                                                                       |
| `test`           | smoke de suíte                                      | —                                                                                     |
| `security`       | gitleaks (segredos no diff)                         | Bloqueia                                                                              |
| `security-audit` | npm audit                                           | Bloqueia high+                                                                        |
| `build`          | `next build` + cp-standalone                        | Service Postgres real                                                                 |
| `integration`    | `bun test tests/integration` contra `TEST_BASE_URL` | Service Postgres + seed                                                               |
| `e2e`            | Playwright (`tests/e2e/`)                           | Checkout Stripe gated `E2E_CHECKOUT_ENABLED`                                          |

## Workflows complementares

| Workflow                | Gatilho           | Papel                                                                                                  |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| **CodeQL**              | push/PR + semanal | SAST — alerts high+ bloqueiam                                                                          |
| **Lighthouse**          | agendado          | Performance/SEO budget contra produção (ver [MONITORING.md](../07-operations-marketing/MONITORING.md)) |
| **Cleanup Deployments** | agendado          | Limpeza de previews Vercel (T099): gated `vars.CLEANUP_ENABLED` + `VERCEL_TOKEN`, `DRY_RUN` default    |

## Deploy (o "CD")

- **PR** → Vercel preview automático (Git Integration — não é job do CI; ver [PREVIEW_DEPLOYMENT.md](PREVIEW_DEPLOYMENT.md)).
- **Merge em `main`** → Vercel builda e promove produção (ver [PRODUCTION_DEPLOY.md](PRODUCTION_DEPLOY.md)).
- **Nunca merge vermelho** — todos os checks do PR precisam estar verdes.

## Regras de manutenção do pipeline

1. Job novo que gera client Prisma **precisa** do `DATABASE_URL` postgres dummy (postinstall sem a var flipa p/ sqlite — família T108).
2. Pipefail em steps com `tee` (senão o status real se perde).
3. `secrets` context não funciona em `if` de job (schema do GitHub) — guard em step (T099).
4. Mudança de pipeline = registrar em `DECISOES.md` quando tiver consequência (padrão DECISAO-CI-PRISMA-001).
