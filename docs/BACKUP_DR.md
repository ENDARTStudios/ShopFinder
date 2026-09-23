# BACKUP_DR — Backup e Recuperação de Desastres

> **Fonte canônica:** [`docs/eng/DR-PLAN.md`](eng/DR-PLAN.md) + `scripts/db-backup.sh` (F2 implementado). Manual do Operador §8/§11.

## O que existe hoje

| Ativo                 | Mecanismo                                                                       | Responsável |
| --------------------- | ------------------------------------------------------------------------------- | ----------- |
| Banco Neon (produção) | PITR nativo do Neon + `scripts/db-backup.sh` (dump pg lógico, saída versionada) | Operador    |
| Código                | GitHub (main protegida, checks verdes)                                          | Time        |
| Deploy                | Vercel (histórico de deployments; rollback = redeploy anterior)                 | Operador    |
| Segredos              | Vercel env + `docs/eng/SECRETS.md` (`.env` NUNCA commitado)                     | Operador    |

## Executar o backup manual

```bash
DATABASE_URL=<prod-read-only> ./scripts/db-backup.sh
# dump sai em backups/ (não commitar; offsite = storage do Operador)
```

Verificar o agendamento vigente no `eng/DR-PLAN.md` e no manual do Operador (§11).

## RPO / RTO

| Cenário                             | RPO alvo            | RTO alvo                     |
| ----------------------------------- | ------------------- | ---------------------------- |
| Erro lógico (drop/migration errada) | 24h (último dump)   | 2h (restore + redeploy)      |
| Perda de região Neon                | PITR (~minutos)     | 4h (reprovisionar + restore) |
| Deploy ruim                         | 0 (rollback Vercel) | 15min                        |

## Procedimento de restore (resumo — detalhe no DR-PLAN)

1. Congelar deploys (Vercel: pausar rollout) e crons (remover do `vercel.json` temporariamente).
2. Provisionar/limpar banco-alvo **em ambiente separado** (nunca restore por cima de produção viva sem snapshot prévio).
3. Restore do dump mais recente (`pg_restore`/`psql`); validar contagens de tabelas críticas (Product, ProductOffer, Order, PriceSnapshot).
4. Repoint `DATABASE_URL` na Vercel → redeploy → smoke (home, PDP, `/api/health`).
5. Reativar crons; post-mortem em `DECISOES.md`.

## Ensaios

- Teste de restore **trimestral** em banco descartável (container local serve) — resultado registrado no `worklog.md`.
- DR é "feito" só com restore provado, não com script existindo (padrão de evidência da casa).
