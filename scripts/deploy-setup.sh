#!/usr/bin/env bash
#
# ShopFinder — Deploy setup script.
#
# Executa as etapas necessárias para preparar o banco de dados de produção:
#   1. Aplica migrations (prisma migrate deploy)
#   2. Popula o catálogo com o pipeline (run-pipeline.ts)
#   3. Gera produtos de demonstração em volume (generate-bulk-products.ts)
#
# Uso:
#   bash scripts/deploy-setup.sh           # completo (migrations + pipeline + bulk)
#   bash scripts/deploy-setup.sh --migrate # apenas migrations
#   bash scripts/deploy-setup.sh --seed    # apenas pipeline + bulk
#
# Requer DATABASE_URL apontando para PostgreSQL (Neon) no ambiente.
# Idempotente: re-executar não duplica dados (pipeline usa upsert por SKU).

set -euo pipefail

RUN_MIGRATE=true
RUN_SEED=true

# Parse args
for arg in "$@"; do
  case "$arg" in
    --migrate) RUN_SEED=false ;;
    --seed)    RUN_MIGRATE=false ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

if [ "$RUN_MIGRATE" = true ]; then
  echo "── Aplicando migrations no banco de produção..."
  npx prisma migrate deploy
  echo "✓ Migrations aplicadas."
  echo ""
fi

if [ "$RUN_SEED" = true ]; then
  echo "── Populando catálogo com o pipeline..."
  bun run scripts/run-pipeline.ts
  echo "✓ Pipeline concluído."
  echo ""

  echo "── Gerando produtos de demonstração (500 unidades)..."
  bun run scripts/generate-bulk-products.ts --count 500 --clean
  echo "✓ Produtos de demonstração gerados."
  echo ""
fi

echo "══════════════════════════════════════"
echo "  Deploy setup concluído."
echo "══════════════════════════════════════"
