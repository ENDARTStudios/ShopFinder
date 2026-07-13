/**
 * Seed script — populates the database with foundational reference data.
 *
 * Run: bun run db:seed
 *
 * Creates:
 *   1. Currencies (ISO 4217 — 12 major currencies)
 *   2. Countries (ISO 3166-1 — 20 major countries)
 *   3. Default Store (single-tenant default)
 *   4. Admin User (for development)
 *
 * Idempotent: safe to run multiple times (upserts by PK/natural key).
 */

import { PrismaClient } from "@prisma/client";
import { SEED_CURRENCIES, SEED_COUNTRIES } from "@workspace/domain/lookup";

const prisma = new PrismaClient();

async function main() {
  console.log("── Seed: Currencies ──────────────────────────────────");
  for (const c of SEED_CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: { name: c.name, symbol: c.symbol, decimalPlaces: c.decimalPlaces, active: c.active },
      create: { ...c, createdAt: new Date(), updatedAt: new Date() }
    });
  }
  console.log(`  ✓ ${SEED_CURRENCIES.length} currencies seeded`);

  console.log("── Seed: Countries ───────────────────────────────────");
  for (const c of SEED_COUNTRIES) {
    await prisma.country.upsert({
      where: { code: c.code },
      update: { name: c.name, region: c.region, active: c.active },
      create: { ...c, createdAt: new Date(), updatedAt: new Date() }
    });
  }
  console.log(`  ✓ ${SEED_COUNTRIES.length} countries seeded`);

  console.log("── Seed: Default Store ───────────────────────────────");
  const store = await prisma.store.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      name: "Dropshipping Platform — Default Store",
      slug: "default",
      defaultCurrency: "USD",
      defaultLocale: "en",
      domain: null,
      status: "active",
      settings: {
        timezone: "UTC",
        taxInclusive: false,
        roundToMinorUnit: true
      },
      version: 1
    }
  });
  console.log(`  ✓ Default store created: ${store.id} (${store.slug})`);

  console.log("── Seed: Admin User ──────────────────────────────────");
  // NOTE: passwordHash is a placeholder. In production, use bcrypt/argon2.
  // This is for dev only — replace before any deployment.
  const adminEmail = "admin@dropshipping.local";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: "$2b$10$placeholderhashreplacebeforedeploy000000000000000000000000000",
        roles: JSON.stringify(["admin"]),
        storeId: store.id,
        status: "active"
      }
    });
    console.log(`  ✓ Admin user created: ${adminEmail}`);
  } else {
    console.log(`  ✓ Admin user already exists: ${adminEmail}`);
  }

  console.log("");
  console.log("── Seed Complete ─────────────────────────────────────");
  console.log(`  Currencies: ${SEED_CURRENCIES.length}`);
  console.log(`  Countries:  ${SEED_COUNTRIES.length}`);
  console.log(`  Stores:     1 (default)`);
  console.log(`  Users:      1 (admin)`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
