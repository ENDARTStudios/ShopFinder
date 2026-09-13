#!/bin/bash
# T015 — Executar seed de catálogo contra o Neon
# Uso: source tool-results/run_seed.sh

set -a
source ./.env
set +a

echo "=== T015: Seed Catalog (Neon) ===" > tool-results/seed_output.txt 2>&1
echo "DATABASE_URL: ${DATABASE_URL%%@*}@<REDACTED>" >> tool-results/seed_output.txt 2>&1

echo "" >> tool-results/seed_output.txt 2>&1
echo "=== Step 1: Prisma Generate ===" >> tool-results/seed_output.txt 2>&1
npx prisma generate >> tool-results/seed_output.txt 2>&1

echo "" >> tool-results/seed_output.txt 2>&1
echo "=== Step 2: Seed Catalog ===" >> tool-results/seed_output.txt 2>&1
bun run scripts/seed-catalog.ts >> tool-results/seed_output.txt 2>&1

echo "" >> tool-results/seed_output.txt 2>&1
echo "=== Step 3: Verification ===" >> tool-results/seed_output.txt 2>&1
cat << 'EOF' | npx tsx - >> tool-results/seed_output.txt 2>&1
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const totalProducts = await prisma.product.count();
  const published = await prisma.product.count({ where: { status: "published" } });
  const products = await prisma.product.findMany({
    where: { status: "published" },
    select: { sku: true, title: true, slug: true },
    take: 20
  });
  console.log(`Total products: ${totalProducts}`);
  console.log(`Published products: ${published}`);
  console.log("Products:");
  for (const p of products) {
    console.log(`  - ${p.sku}: ${p.title} (/${p.slug})`);
  }
  await prisma.\$disconnect();
}
main();
EOF

echo "" >> tool-results/seed_output.txt 2>&1
echo "=== Done ===" >> tool-results/seed_output.txt 2>&1