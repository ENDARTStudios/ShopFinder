/**
 * ShopFinder — Admin Products API
 *
 * GET /api/admin/products — List ALL products (including draft, review, archived)
 *   with confidence indicators and enrichment status
 *
 * PATCH /api/admin/products/[id] — Update product status
 *   Body: { status: "draft" | "published" | "review" | "archived" }
 *
 * Both endpoints require authentication via NextAuth session.
 * Role check: user must have "admin" or "operator" in roles.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@workspace/database";
import { getServerAuthSession } from "@workspace/auth";
import type { Role } from "@workspace/application";

function minorUnitsToUSD(minor: bigint): number {
  return Number(minor) / 100;
}

function hasAdminRole(roles: string[] | undefined): boolean {
  if (!roles) return false;
  return roles.includes("admin") || roles.includes("operator");
}

// ── GET: List all products with admin metadata ─────────────

export async function GET(request: NextRequest) {
  // Check auth
  const session = await getServerAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (!hasAdminRole(user.roles)) {
    return NextResponse.json({ error: "Forbidden — requires admin or operator role" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // draft, published, review, archived
  const lowConfidence = searchParams.get("lowConfidence") === "true";

  const where: any = {
    deletedAt: null
  };

  if (status) {
    where.status = status;
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      category: { select: { name: true, slug: true } },
      attributes: {
        select: { name: true, value: true, source: true, confidence: true }
      },
      offers: {
        include: { supplier: { select: { name: true, code: true } } },
        where: { deletedAt: null }
      },
      variants: { where: { deletedAt: null }, select: { id: true } }
    },
    orderBy: { updatedAt: "desc" }
  });

  // Compute admin metadata per product
  const adminProducts = products.map((p) => {
    const enrichedAttrs = p.attributes.filter((a) => a.source !== null);
    const totalAttrs = p.attributes.length;
    const enrichedCount = enrichedAttrs.length;
    const avgConfidence = enrichedAttrs.length > 0
      ? enrichedAttrs.reduce((sum, a) => sum + (a.confidence ?? 0), 0) / enrichedAttrs.length
      : 0;

    const prices = p.offers.map((o) => minorUnitsToUSD(o.priceMinorUnits));
    const minPrice = prices.length > 0 ? Math.min(...prices) : minorUnitsToUSD(p.basePriceMinorUnits);
    const totalStock = p.offers.reduce((sum, o) => sum + o.inventory, 0);

    // Extract manufacturer from description
    const mfrMatch = p.description?.match(/Manufacturer:\s*(.+?)\./);
    const manufacturer = mfrMatch?.[1] ?? null;

    const traceMatch = p.description?.match(/Trace:\s*(\S+)/);
    const traceId = traceMatch?.[1] ?? null;

    return {
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      title: p.title,
      status: p.status,
      category: p.category?.name ?? "—",
      categorySlug: p.category?.slug ?? null,
      manufacturer,
      traceId,
      price: minPrice,
      currency: p.basePriceCurrencyCode,
      stockCount: totalStock,
      offerCount: p.offers.length,
      variantCount: p.variants.length,
      attributeCount: totalAttrs,
      enrichedAttributeCount: enrichedCount,
      enrichmentComplete: enrichedCount === totalAttrs && totalAttrs > 0,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      isLowConfidence: avgConfidence < 0.8 && enrichedCount > 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    };
  });

  // Filter by low confidence if requested
  const filtered = lowConfidence
    ? adminProducts.filter((p) => p.isLowConfidence)
    : adminProducts;

  return NextResponse.json({
    products: filtered,
    total: filtered.length,
    summary: {
      total: adminProducts.length,
      published: adminProducts.filter((p) => p.status === "published").length,
      draft: adminProducts.filter((p) => p.status === "draft").length,
      review: adminProducts.filter((p) => p.status === "review").length,
      archived: adminProducts.filter((p) => p.status === "archived").length,
      lowConfidence: adminProducts.filter((p) => p.isLowConfidence).length,
      fullyEnriched: adminProducts.filter((p) => p.enrichmentComplete).length
    }
  });
}
