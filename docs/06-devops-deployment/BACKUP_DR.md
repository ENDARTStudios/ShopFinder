# Backup e Recuperação de Desastres

> Reorganização 2026-09 (#79): arquivo fundido a partir de fontes separadas. Conteúdo de cada fonte preservado verbatim como "Parte N".

---

## Parte — BACKUP_DR

> **Fonte canônica:** [`docs/06-devops-deployment/BACKUP_DR.md`](../06-devops-deployment/BACKUP_DR.md) + `scripts/db-backup.sh` (F2 implementado). Manual do Operador §8/§11.

## O que existe hoje

| Ativo                 | Mecanismo                                                                       | Responsável |
| --------------------- | ------------------------------------------------------------------------------- | ----------- |
| Banco Neon (produção) | PITR nativo do Neon + `scripts/db-backup.sh` (dump pg lógico, saída versionada) | Operador    |
| Código                | GitHub (main protegida, checks verdes)                                          | Time        |
| Deploy                | Vercel (histórico de deployments; rollback = redeploy anterior)                 | Operador    |
| Segredos              | Vercel env + `docs/05-security-compliance/SECRETS.md` (`.env` NUNCA commitado)  | Operador    |

## Executar o backup manual

```bash
DATABASE_URL=<prod-read-only> ./scripts/db-backup.sh
# dump sai em backups/ (não commitar; offsite = storage do Operador)
```

Verificar o agendamento vigente no `docs/06-devops-deployment/BACKUP_DR.md` e no manual do Operador (§11).

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

---

## Parte — DR-PLAN

Última atualização: 15/set/2026 (NOVA_DIRECAO F2). Dono: Operador.

## Inventário de dados

| Ativo                                                         | Onde                             | Risco                    |
| ------------------------------------------------------------- | -------------------------------- | ------------------------ |
| Banco Postgres (catálogo, pedidos, usuários, reviews, alerts) | Neon (branches dev + production) | Perda de dados = crítico |
| Env/secrets                                                   | Vercel + cofre do Operador       | Perda = recriação manual |
| Código                                                        | GitHub                           | Remoto, baixo risco      |
| Deployments                                                   | Vercel                           | Recriável via redeploy   |

## Backup

1. **Neon PITR (primário)**: o plano do Neon retém histórico point-in-time
   (default: 7 dias no scale free/hobby — CONFIRMAR no console do Neon a janela
   do plano atual e estender se necessário). Restore: console → Branch →
   Restore to point in time.
2. **pg_dump semanal (secundário, fora do Neon)**: rodar
   `scripts/db-backup.sh` (template no repo) de uma máquina confiável,
   gravando em armazenamento externo (HD/Drive) com retenção de 4 semanas:

   ```bash
   VERCEL_ENV=preview   # usar a connection string da branch que se quer backar
   bun scripts/db-backup.sh
   ```

   O script lê `DATABASE_URL` do ambiente e grava `backup-YYYYMMDD.dump.gz`
   via `pg_dump --format=custom` (restore com `pg_restore`).

3. **O que NÃO precisa de backup**: deployments (redeploy por push), env do
   Vercel (recriável; segredos no cofre do Operador).

## Disaster Recovery

| Cenário                    | Ação                                                                                                     | RPO                     | RTO     |
| -------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------- | ------- |
| Delete acidental de linhas | Neon PITR para timestamp anterior                                                                        | ≤ janela PITR           | ~30 min |
| Branch Neon corrompida     | Restore PITR em nova branch + apontar Vercel                                                             | ≤ janela PITR           | ~1 h    |
| Neon regional fora do ar   | Restaurar dump mais recente em Postgres alternativo (Supabase/RDS) + `DATABASE_URL` na Vercel + redeploy | ≤ 7 dias (dump semanal) | 2-4 h   |
| Vercel fora do ar          | Deploy em alternativa (Render/Railway) a partir do repo + env do cofre                                   | 0 (código no GitHub)    | 1-2 h   |

## Rotina do Operador

- **Semanal**: rodar `scripts/db-backup.sh` e conferir o arquivo gerado
  (`pg_restore --list` deve listar as tabelas).
- **Mensal**: ensaio de restore em banco descartável (container postgres +
  `pg_restore`) — um backup sem restore testado não é backup.
- **Trimestral**: revisar janela de PITR do plano Neon e este documento.
