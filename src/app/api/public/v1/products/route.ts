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

  const products = await prisma.product.findMany({
    where: {
      status: "published",
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
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

  return NextResponse.json({
    count: products.length,
    products: products.map((p) => ({
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
