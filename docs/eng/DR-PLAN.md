# Plano de Backup e Disaster Recovery — ShopFinder

Última atualização: 15/set/2026 (NOVA_DIRECAO F2). Dono: Operador.

## Inventário de dados

| Ativo | Onde | Risco |
|---|---|---|
| Banco Postgres (catálogo, pedidos, usuários, reviews, alerts) | Neon (branches dev + production) | Perda de dados = crítico |
| Env/secrets | Vercel + cofre do Operador | Perda = recriação manual |
| Código | GitHub | Remoto, baixo risco |
| Deployments | Vercel | Recriável via redeploy |

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

| Cenário | Ação | RPO | RTO |
|---|---|---|---|
| Delete acidental de linhas | Neon PITR para timestamp anterior | ≤ janela PITR | ~30 min |
| Branch Neon corrompida | Restore PITR em nova branch + apontar Vercel | ≤ janela PITR | ~1 h |
| Neon regional fora do ar | Restaurar dump mais recente em Postgres alternativo (Supabase/RDS) + `DATABASE_URL` na Vercel + redeploy | ≤ 7 dias (dump semanal) | 2-4 h |
| Vercel fora do ar | Deploy em alternativa (Render/Railway) a partir do repo + env do cofre | 0 (código no GitHub) | 1-2 h |

## Rotina do Operador

- **Semanal**: rodar `scripts/db-backup.sh` e conferir o arquivo gerado
  (`pg_restore --list` deve listar as tabelas).
- **Mensal**: ensaio de restore em banco descartável (container postgres +
  `pg_restore`) — um backup sem restore testado não é backup.
- **Trimestral**: revisar janela de PITR do plano Neon e este documento.
