/**
 * ShopFinder — Knowledge API
 *
 * GET /api/products/[slug]/knowledge
 *
 * Exposes the Product Knowledge Graph for a specific product:
 *   - Manufacturer info (code, name, authorityScore, country, tier)
 *   - Relations (compatible_with, manufactures, variant_of, etc.)
 *   - Compatible products (resolved to slug + title)
 *
 * This is the API that powers the "Produtos Compatíveis" section
 * on the Product Detail Page, and enables external consumers
 * (ERPs, PIMs, LLMs) to query product relationships.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@workspace/database/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    // 1. Find the product in the database
    const product = await prisma.product.findFirst({
      where: { slug, deletedAt: null, status: "published" },
      select: {
        id: true,
        sku: true,
        title: true,
        description: true,
        categoryId: true,
        category: { select: { name: true, slug: true } }
      }
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // 2. Extract manufacturer from description (pipeline format)
    const manufacturerMatch = product.description?.match(/Manufacturer:\s*(.+?)\./);
    const manufacturerName = manufacturerMatch?.[1]?.trim() ?? null;

    // 3. Try to load knowledge graph from domain registry
    let graphData: {
      manufacturer: { code: string; name: string; authorityScore: number; country: string; tier: string } | null;
      relations: Array<{
        type: string;
        target: { slug: string; title: string; category: string | null };
      }>;
    } = {
      manufacturer: null,
      relations: []
    };

    try {
      const enrichmentModule = await import("@workspace/domain/discovery/enrichment");
      const { MANUFACTURERS, KNOWLEDGE_GRAPH } = enrichmentModule;

      // Find manufacturer by matching name or brand
      if (manufacturerName) {
        const mfr = MANUFACTURERS.find(
          (m: any) =>
            m.name.toLowerCase().includes(manufacturerName.toLowerCase()) ||
            m.shortName.toLowerCase().includes(manufacturerName.toLowerCase()) ||
            m.brands.some((b: string) => b.toLowerCase() === manufacturerName.toLowerCase())
        );

        if (mfr) {
          const tier = mfr.authorityScore >= 98 ? "A"
            : mfr.authorityScore >= 92 ? "B"
            : mfr.authorityScore >= 82 ? "C"
            : "D";

          graphData.manufacturer = {
            code: mfr.code,
            name: mfr.shortName,
            authorityScore: mfr.authorityScore,
            country: mfr.country,
            tier
          };
        }
      }
    } catch (importError) {
      // Registry not available — continue with empty graph data
      console.log("Knowledge graph registry not available:", String(importError).slice(0, 100));
    }

    // 4. Find compatible products via attribute-based logic
    // Products that share the same socket/chipset are compatible
    const productAttrs = await prisma.productAttribute.findMany({
      where: { productId: product.id, name: { in: ["cpu.socket", "socket", "motherboard.chipset", "chipset"] } },
      select: { name: true, value: true }
    });

    const compatibleProducts: Array<{
      slug: string;
      title: string;
      category: string | null;
      price: number;
      relationType: string;
    }> = [];

    if (productAttrs.length > 0) {
      // For each socket/chipset attribute, find other products with matching values
      // Also match across canonical and non-canonical names (cpu.socket vs socket)
      for (const attr of productAttrs) {
        // Build list of names to match: original + canonical variant
        const namesToMatch = new Set<string>([attr.name]);
        if (attr.name === "cpu.socket") namesToMatch.add("socket");
        if (attr.name === "socket") namesToMatch.add("cpu.socket");
        if (attr.name === "motherboard.chipset") namesToMatch.add("chipset");
        if (attr.name === "chipset") namesToMatch.add("motherboard.chipset");

        const matchingProducts = await prisma.product.findMany({
          where: {
            id: { not: product.id },
            deletedAt: null,
            status: "published",
            attributes: {
              some: {
                name: { in: [...namesToMatch] },
                value: attr.value
              }
            }
          },
          select: {
            slug: true,
            title: true,
            basePriceMinorUnits: true,
            basePriceCurrencyCode: true,
            category: { select: { name: true } }
          },
          take: 5
        });

        for (const mp of matchingProducts) {
          // Avoid duplicates
          if (!compatibleProducts.find((cp) => cp.slug === mp.slug)) {
            compatibleProducts.push({
              slug: mp.slug,
              title: mp.title,
              category: mp.category?.name ?? null,
              price: Number(mp.basePriceMinorUnits) / 100,
              relationType: "compatible_with"
            });
          }
        }
      }
    }

    // 5. Find products from the same manufacturer (same brand in description)
    if (manufacturerName) {
      const sameManufacturerProducts = await prisma.product.findMany({
        where: {
          id: { not: product.id },
          deletedAt: null,
          status: "published",
          description: { contains: `Manufacturer: ${manufacturerName}` }
        },
        select: {
          slug: true,
          title: true,
          basePriceMinorUnits: true,
          basePriceCurrencyCode: true,
          category: { select: { name: true } }
        },
        take: 5
      });

      for (const smp of sameManufacturerProducts) {
        if (!compatibleProducts.find((cp) => cp.slug === smp.slug)) {
          compatibleProducts.push({
            slug: smp.slug,
            title: smp.title,
            category: smp.category?.name ?? null,
            price: Number(smp.basePriceMinorUnits) / 100,
            relationType: "same_manufacturer"
          });
        }
      }
    }

    // 6. Build response
    graphData.relations = compatibleProducts.map((cp) => ({
      type: cp.relationType,
      target: {
        slug: cp.slug,
        title: cp.title,
        category: cp.category
      }
    }));

    return NextResponse.json({
      productId: product.id,
      productSlug: slug,
      productTitle: product.title,
      manufacturer: graphData.manufacturer,
      relations: graphData.relations,
      compatibleProducts: compatibleProducts.map((cp) => ({
        slug: cp.slug,
        title: cp.title,
        category: cp.category,
        price: cp.price,
        relationType: cp.relationType
      })),
      totalRelations: compatibleProducts.length
    });
  } catch (error) {
    console.error("Knowledge API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
