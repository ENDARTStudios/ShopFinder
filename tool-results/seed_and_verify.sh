#!/bin/bash
# T016 — Seed + Verify with real output capture
LOG="../seed-output.log"

echo "=== T016: Seed with Real Evidence ===" > "$LOG"
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"

# Source .env safely
set -a
source "../.env"
set +a

# Show connection info (safe)
DB_USER=$(echo "$DATABASE_URL" | sed 's|.*://\([^:]*\):.*|\1|')
DB_HOST=$(echo "$DATABASE_URL" | sed 's|.*@\([^?]*\).*|\1|')
echo "User: $DB_USER" >> "$LOG"
echo "Host: $DB_HOST" >> "$LOG"
if echo "$DATABASE_URL" | grep -q "\-pooler"; then
    echo "Neon pooler: YES (production)" >> "$LOG"
else
    echo "Neon pooler: NO" >> "$LOG"
fi

# Step 1: Prisma Generate
echo "" >> "$LOG"
echo "--- Step 1: Prisma Generate ---" >> "$LOG"
echo "$ npx prisma generate" >> "$LOG"
npx prisma generate >> "$LOG" 2>&1
PRISMA_EXIT=$?
echo "[PRISMA_EXIT: $PRISMA_EXIT]" >> "$LOG"

# Step 2: Seed Catalog
echo "" >> "$LOG"
echo "--- Step 2: Seed Catalog (bun) ---" >> "$LOG"
echo "$ bun run scripts/seed-catalog.ts" >> "$LOG"
bun run scripts/seed-catalog.ts >> "$LOG" 2>&1
SEED_EXIT=$?
echo "[SEED_EXIT: $SEED_EXIT]" >> "$LOG"

# Step 3: Count verification
echo "" >> "$LOG"
echo "--- Step 3: Count Verification ---" >> "$LOG"
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
    const storeCount = await p.store.count();
    const totalProducts = await p.product.count();
    const published = await p.product.count({ where: { status: 'published' } });
    const samples = await p.product.findMany({ where: { status: 'published' }, select: { slug: true }, take: 5 });
    console.log('STORE_COUNT=' + storeCount);
    console.log('TOTAL_PRODUCTS=' + totalProducts);
    console.log('PUBLISHED_PRODUCTS=' + published);
    console.log('SAMPLE_SLUGS=' + samples.map(s => s.slug).join(','));
    await p.\$disconnect();
})().catch(e => { console.error('VERIFY_ERROR:', e.message); process.exit(1); });
" >> "$LOG" 2>&1
VERIFY_EXIT=$?
echo "[VERIFY_EXIT: $VERIFY_EXIT]" >> "$LOG"

echo "" >> "$LOG"
echo "=== DONE ===" >> "$LOG"