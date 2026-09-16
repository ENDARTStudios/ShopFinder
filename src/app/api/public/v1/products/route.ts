/**
 * NOVA_DIRECAO E2 — API pública read-only (v1) para parceiros.
 *
 * GET /api/public/v1/products?q=<texto>&limit=<1-50>
 *
 * Campos públicos do catálogo (sem custo interno, sem PII). Rate limit via
 * middleware (regra dedicada). Docs para parceiros em /api-docs.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@workspace/database";
import { minorUnitsToNumber } from "@/lib/price";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 50) : 20;

  // q filtrado em memória (case-insensitive; compatível com client sqlite)
  const products = await prisma.product.findMany({
    where: { status: "published", deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 400,
    select: {
      id: true,
      sku: true,
      slug: true,
      title: true,
      basePriceMinorUnits: true,
      basePriceCurrencyCode: true,
      updatedAt: true,
      offers: {
        where: { deletedAt: null },
        select: {
          externalProvider: true,
          priceMinorUnits: true,
          priceCurrencyCode: true,
          inventory: true
        }
      }
    }
  });

  const ql = q.toLowerCase();
  const filtered = ql
    ? products.filter(
        (p) => p.title.toLowerCase().includes(ql) || p.sku.toLowerCase().includes(ql)
      )
    : products;
  const page = filtered.slice(0, limit);

  return NextResponse.json({
    count: page.length,
    products: page.map((p) => ({
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      title: p.title,
      updatedAt: p.updatedAt.toISOString(),
      offers: p.offers.map((o) => ({
        provider: o.externalProvider ?? "internal",
        price: {
          amount: minorUnitsToNumber(o.priceMinorUnits),
          currency: o.priceCurrencyCode
        },
        inventory: o.inventory
      }))
    }))
  });
}
