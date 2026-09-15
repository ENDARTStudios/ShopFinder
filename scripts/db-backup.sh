#!/usr/bin/env bash
# NOVA_DIRECAO F2 — backup lógico do banco ShopFinder (pg_dump custom + gzip).
# Uso: DATABASE_URL="postgresql://…" bun scripts/db-backup.sh   (ou npm env)
# Requer pg_dump/psql clients (v16) no PATH. NUNCA commitar o dump gerado.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL não definida no ambiente}"

STAMP="$(date +%Y%m%d)"
OUT="backup-${STAMP}.dump.gz"

echo "[backup] alvo: host=$(echo "$DATABASE_URL" | sed -E 's|.*@([^/]+)/.*|\1|') (senha oculta)"
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges | gzip > "$OUT"

SIZE=$(wc -c < "$OUT")
echo "[backup] gerado: $OUT (${SIZE} bytes)"
echo "[backup] teste rápido: gzip -t $OUT && pg_restore --list $OUT | head"
echo "[backup] confidencial — mova para armazenamento externo e NUNCA commitar."
