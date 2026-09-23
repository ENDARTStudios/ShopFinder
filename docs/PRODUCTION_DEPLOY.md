# PRODUCTION_DEPLOY — Deploy de Produção

> **Produção:** `https://shop-finder-taupe.vercel.app` (⚠️ atualmente atrás de Vercel SSO/Deployment Protection — **P0 aberto**, Operador decide). Guia detalhado: `docs/DEPLOY.md` (legado) + `MANUAL_DO_OPERADOR.md`.

## Fluxo (Git Integration — não há deploy manual de rotina)

1. PR para `main` com todos os checks verdes (gate `eng/SECURITY.md`).
2. Merge → Vercel builda e promove produção automaticamente.
3. Smoke de produção ([QA_TESTING.md](QA_TESTING.md) roteiro) pós-deploy.
4. Migrações de DB: aplicadas via Prisma (`prisma migrate`/`prisma db execute --schema`) pelo Operador contra o Neon de **produção** (banco distinto do staging).

## Regras

- **Nunca** commit direto em `main` (o deploy é o merge).
- Migration nova = SQL idempotente (`IF NOT EXISTS`/`EXCEPTION`) — crash no meio não pode deixar meia-migration.
- Secret novo: Vercel env (Operador) **antes** do merge que o usa; `.env.example` + `eng/SECRETS.md` no mesmo PR.
- Cron novo: entrada em `vercel.json` + rota fail-closed (Bearer `CRON_SECRET`).
- Deploys de emergência (hotfix): mesmo fluxo (PR rápido); rollback = **redeploy do deployment anterior** na Vercel.

## Rollback

1. Vercel → Deployments → deployment anterior sadio → **Redeploy** (promove a produção).
2. Se a causa é dado/migration: congelar crons + procedimento de [BACKUP_DR.md](BACKUP_DR.md).
3. Post-mortem: entrada em `DECISOES.md` + lição em [MEMORY.md](MEMORY.md).

## Pós-deploy (checagem do Operador)

Smoke público · `/api/health` · crons do dia executaram (logs Vercel) · Sentry sem spike (se `SENTRY_DSN` ativo) · anúncio de changelog se impacto de usuário ([CHANGELOG.md](CHANGELOG.md)).
