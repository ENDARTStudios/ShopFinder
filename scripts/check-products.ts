/**
 * T068 — verificação do catálogo (READ-ONLY).
 *
 * Mostra: total de produtos no banco, breakdown por fornecedor (via ofertas,
 * pois a oferta carrega o Supplier) e 10 SKUs de amostra dos importados.
 *
 * Rodar: bun scripts/check-products.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const total = await prisma.product.count();
  const totalOffers = await prisma.productOffer.count();
  const published = await prisma.product.count({ where: { status: "published" } });

  console.log(`Total de produtos no catálogo: ${total} (${published} publicados, ${totalOffers} ofertas)`);

  const offersBySupplier = await prisma.productOffer.groupBy({
    by: ["supplierId"],
    _count: { _all: true, productId: true }
  });

  const suppliers = await prisma.supplier.findMany({ select: { id: true, code: true, name: true } });
  const nameOf = new Map(suppliers.map((s) => [s.id, `${s.name} (${s.code})`]));

  console.log("\nBreakdown por fornecedor (ofertas · produtos distintos):");
  for (const row of offersBySupplier.sort((a, b) => b._count._all - a._count._all)) {
    const distinctProducts = await prisma.productOffer.findMany({
      where: { supplierId: row.supplierId },
      select: { productId: true },
      distinct: ["productId"]
    }).then((rows) => rows.length);
    console.log(`  ${nameOf.get(row.supplierId) ?? row.supplierId}: ${row._count._all} ofertas · ${distinctProducts} produtos`);
  }

  console.log("\nAmostra de 10 SKUs importados (mais recentes):");
  const recent = await prisma.product.findMany({
    where: { sku: { startsWith: "DIGIKEY-" } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { sku: true, title: true, basePriceMinorUnits: true, basePriceCurrencyCode: true }
  });
  const recentEbay = await prisma.product.findMany({
    where: { sku: { startsWith: "EBAY-" } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { sku: true, title: true, basePriceMinorUnits: true, basePriceCurrencyCode: true }
  });
  for (const p of [...recent, ...recentEbay]) {
    console.log(`  ${p.sku} — ${p.title.slice(0, 60)} — ${(Number(p.basePriceMinorUnits) / 100).toFixed(2)} ${p.basePriceCurrencyCode}`);
  }

  await prisma.$disconnect();
}

main();
