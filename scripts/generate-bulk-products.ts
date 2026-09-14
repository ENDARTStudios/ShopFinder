/**
 * ShopFinder — Bulk product generator for load testing and demo volume.
 *
 * Generates N synthetic products by replicating the existing pipeline
 * products with small variations (SKU suffix, price jitter, title suffix).
 * The generated products are inserted directly via Prisma, bypassing the
 * 15-stage pipeline (we only care about search/index performance, not
 * enrichment provenance).
 *
 * Usage:
 *   bun run scripts/generate-bulk-products.ts                     # default 500
 *   bun run scripts/generate-bulk-products.ts --count 1000        # custom count
 *   bun run scripts/generate-bulk-products.ts --clean             # delete bulk first
 *   bun run scripts/generate-bulk-products.ts --count 100 --clean # both
 *
 * Idempotent: re-running with the same count upserts the same SKU prefix
 * (SF-BULK-*). Use --clean to delete all SF-BULK-* products before
 * re-generating.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const STORE_ID = "cmrfu2kdb0000oybnlekztroj";

interface BulkVariant {
  skuSuffix: string;
  titleSuffix: string;
  priceMultiplier: number;
}

const VARIANTS: BulkVariant[] = [
  { skuSuffix: "B1", titleSuffix: "(Bulk variant 1)", priceMultiplier: 0.95 },
  { skuSuffix: "B2", titleSuffix: "(Bulk variant 2)", priceMultiplier: 1.05 },
  { skuSuffix: "B3", titleSuffix: "(Bulk variant 3)", priceMultiplier: 1.1 },
  { skuSuffix: "B4", titleSuffix: "(Bulk variant 4)", priceMultiplier: 0.9 },
  { skuSuffix: "B5", titleSuffix: "(Bulk variant 5)", priceMultiplier: 1.0 },
  { skuSuffix: "B6", titleSuffix: "(Bulk variant 6)", priceMultiplier: 1.15 },
  { skuSuffix: "B7", titleSuffix: "(Bulk variant 7)", priceMultiplier: 0.85 },
  { skuSuffix: "B8", titleSuffix: "(Bulk variant 8)", priceMultiplier: 1.2 }
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function toMinorUnits(usd: number): bigint {
  return BigInt(Math.round(usd * 100));
}

async function main() {
  const args = process.argv.slice(2);
  const countArg = args.find((a) => a.startsWith("--count="));
  const targetCount = parseInt(countArg?.split("=")[1] ?? "500", 10);
  const clean = args.includes("--clean");

  console.log(`🚀 ShopFinder Bulk Product Generator\n`);
  console.log(`  Target count: ${targetCount}`);
  console.log(`  Clean mode: ${clean}\n`);

  if (clean) {
    console.log("  Cleaning existing SF-BULK-* products...");
    const bulkProducts = await prisma.product.findMany({
      where: { sku: { startsWith: "SF-BULK-" } },
      select: { id: true }
    });
    if (bulkProducts.length > 0) {
      const bulkIds = bulkProducts.map((p) => p.id);
      // Delete child rows first (FK constraints)
      await prisma.productOffer.deleteMany({ where: { productId: { in: bulkIds } } });
      await prisma.productAttribute.deleteMany({ where: { productId: { in: bulkIds } } });
      await prisma.productMedia.deleteMany({ where: { productId: { in: bulkIds } } });
      const variants = await prisma.variant.findMany({
        where: { productId: { in: bulkIds } },
        select: { id: true }
      });
      if (variants.length > 0) {
        const variantIds = variants.map((v) => v.id);
        await prisma.inventory.deleteMany({ where: { variantId: { in: variantIds } } });
        await prisma.variant.deleteMany({ where: { id: { in: variantIds } } });
      }
      const deleted = await prisma.product.deleteMany({ where: { id: { in: bulkIds } } });
      console.log(`  Deleted ${deleted.count} existing bulk products.\n`);
    } else {
      console.log("  No existing SF-BULK-* products to clean.\n");
    }
  }

  // Pull all published pipeline products as templates.
  const templates = await prisma.product.findMany({
    where: {
      sku: { startsWith: "SF-PIPE-" },
      deletedAt: null,
      status: "published"
    },
    include: {
      category: true,
      attributes: true,
      media: { orderBy: { position: "asc" } },
      offers: {
        include: { supplier: true },
        where: { deletedAt: null }
      }
    }
  });

  if (templates.length === 0) {
    console.error("  No SF-PIPE-* templates found. Run `bun run scripts/run-pipeline.ts` first.");
    process.exit(1);
  }

  console.log(`  Templates available: ${templates.length}`);

  let created = 0;
  let skipped = 0;
  const startedAt = Date.now();

  let i = 0;
  while (created < targetCount) {
    const template = templates[i % templates.length]!;
    const variant = VARIANTS[i % VARIANTS.length]!;
    const cycleNum = Math.floor(i / (templates.length * VARIANTS.length)) + 1;

    const sku = `SF-BULK-${template.sku.replace("SF-PIPE-", "")}-${variant.skuSuffix}-C${cycleNum}`;
    const title = `${template.title} ${variant.titleSuffix} C${cycleNum}`.slice(0, 200);
    const slug = `${slugify(title)}-${cycleNum}`.slice(0, 100);
    const price = (Number(template.basePriceMinorUnits) * variant.priceMultiplier) / 100;

    // Skip if already exists (idempotent re-run)
    const existing = await prisma.product.findFirst({
      where: { sku },
      select: { id: true }
    });
    if (existing) {
      skipped++;
      i++;
      continue;
    }

    // Create the product (with attributes + 1 offer)
    const product = await prisma.product.create({
      data: {
        sku,
        slug,
        title,
        description: `${template.description} [Bulk variant C${cycleNum}]`,
        basePriceMinorUnits: toMinorUnits(price),
        basePriceCurrencyCode: template.basePriceCurrencyCode,
        status: "published",
        storeId: STORE_ID,
        categoryId: template.categoryId,
        attributes: {
          create: template.attributes.slice(0, 6).map((a) => ({
            name: a.name,
            value: a.value
          }))
        },
        media: {
          create: {
            url:
              template.media[0]?.url ??
              "data:gradient;linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            altText: title.slice(0, 100),
            position: 0,
            isPrimary: true
          }
        }
      }
    });

    // Create 1 variant + inventory
    const variantRow = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: `${sku}-V1`,
        priceMinorUnits: toMinorUnits(price),
        priceCurrencyCode: template.basePriceCurrencyCode,
        isActive: true
      }
    });
    await prisma.inventory.create({
      data: {
        variantId: variantRow.id,
        available: Math.floor(Math.random() * 500) + 10,
        reserved: 0,
        committed: 0
      }
    });

    // Create 1-2 offers from existing suppliers
    const sampleOffers = template.offers.slice(0, 2);
    for (const offer of sampleOffers) {
      await prisma.productOffer.create({
        data: {
          productId: product.id,
          supplierId: offer.supplierId,
          variantId: variantRow.id,
          supplierSku: `${sku}-${offer.supplier.code}`,
          priceMinorUnits: toMinorUnits(price * (0.9 + Math.random() * 0.2)),
          priceCurrencyCode: offer.priceCurrencyCode,
          inventory: Math.floor(Math.random() * 300) + 5,
          shipsFromCountry: offer.shipsFromCountry,
          fulfillmentDaysMin: offer.fulfillmentDaysMin,
          fulfillmentDaysMax: offer.fulfillmentDaysMax,
          lastSyncedAt: new Date()
        }
      });
    }

    created++;
    i++;
    if (created % 50 === 0) {
      console.log(`  Created ${created}/${targetCount}...`);
    }
  }

  const elapsedMs = Date.now() - startedAt;
  console.log(`\n  Bulk generation complete in ${elapsedMs}ms.`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped (already existed): ${skipped}`);

  // Verify
  const totalBulk = await prisma.product.count({
    where: { sku: { startsWith: "SF-BULK-" }, deletedAt: null }
  });
  const totalAll = await prisma.product.count({ where: { deletedAt: null, status: "published" } });
  console.log(`\n  Database state:`);
  console.log(`    SF-BULK-* products: ${totalBulk}`);
  console.log(`    Total published products: ${totalAll}`);
  console.log(`\n  → Open http://localhost:3000 and use the search to measure latency.`);
}

main()
  .catch((e) => {
    console.error("Bulk generation failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
