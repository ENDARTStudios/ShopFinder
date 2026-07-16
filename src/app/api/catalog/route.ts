/**
 * ShopFinder — Catalog API.
 *
 * Real REST endpoints that query the SQLite database:
 *   GET /api/catalog?path=products     — list products (with filters)
 *   GET /api/catalog?path=categories   — list categories
 *   GET /api/catalog?path=niches       — list niches
 *   GET /api/catalog?path=suppliers    — list suppliers
 *
 * Query params for products:
 *   niche=<nicheId>      — filter by niche
 *   category=<slug>      — filter by category slug
 *   q=<search>           — full-text search
 *   limit=<n>            — page size (default 50)
 *   offset=<n>           — pagination offset
 *
 * All endpoints return JSON. Prices are in USD (converted from minor units).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@workspace/database/client";

// ── Helpers ────────────────────────────────────────────────

function minorUnitsToUSD(minor: bigint): number {
  return Number(minor) / 100;
}

interface SerializedProduct {
  id: string;
  sku: string;
  slug: string;
  title: string;
  description: string;
  brand: string;
  category: string;
  categorySlug: string;
  nicheId: string;
  price: number;
  currency: string;
  priceRange: { min: number; max: number };
  inStock: boolean;
  stockCount: number;
  suppliers: number;
  rating: number;
  reviewCount: number;
  imageGradient: string;
  imageLabel: string;
  specs: Array<{ name: string; value: string }>;
  mpn: string;
  offers: Array<{
    id: string;
    supplier: { id: string; code: string; name: string };
    price: number;
    currency: string;
    inventory: number;
    inStock: boolean;
    shipsFrom: string;
    fulfillmentDays: number[];
  }>;
  /** Rich attributes with source/confidence/evidence. Populated when `?slugs=` is used (compare page). */
  enrichedSpecs?: Array<{
    id: string;
    name: string;
    value: string;
    source: string | null;
    sourceName: string | null;
    confidence: number | null;
    evidence: Array<{
      sourceType: string;
      sourceName: string;
      confidence: number;
      extractedValue: string;
      normalizedValue: string;
      url: string;
      retrievedAt: string;
    }>;
  }>;
  /** Manufacturer name extracted from the pipeline-format description. */
  manufacturer?: string | null;
}

function serializeProduct(p: any): SerializedProduct {
  const category = p.category;
  let nicheId = "uncategorized";
  if (category?.description) {
    try {
      nicheId = JSON.parse(category.description).nicheId ?? "uncategorized";
    } catch {
      /* keep default */
    }
  }

  const offers = (p.offers ?? []).map((o: any) => ({
    id: o.id,
    supplier: o.supplier,
    price: minorUnitsToUSD(o.priceMinorUnits),
    currency: o.priceCurrencyCode,
    inventory: o.inventory,
    inStock: o.inventory > 0,
    shipsFrom: o.shipsFromCountry,
    fulfillmentDays: [o.fulfillmentDaysMin, o.fulfillmentDaysMax]
  }));

  const prices = offers.map((o: any) => o.price).filter((x: number) => x > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const totalStock = offers.reduce((sum: number, o: any) => sum + o.inventory, 0);
  const inStock = totalStock > 0;
  const supplierCount = new Set(offers.map((o: any) => o.supplier?.code)).size;

  const primaryMedia = p.media?.find((m: any) => m.isPrimary) ?? p.media?.[0];
  const imageGradient = primaryMedia?.url?.startsWith("data:gradient;")
    ? primaryMedia.url.replace("data:gradient;", "")
    : "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)";
  const imageLabel = primaryMedia?.altText ?? p.title;

  const specs = (p.attributes ?? []).map((a: any) => ({ name: a.name, value: a.value }));

  // Rich (enriched) specs are only serialized when the underlying attribute
  // carries provenance fields. Used by the compare page to render source
  // badges and confidence bars.
  const enrichedSpecs = (p.attributes ?? [])
    .filter((a: any) => a.source !== null && a.source !== undefined)
    .map((a: any) => {
      let evidence: Array<{
        sourceType: string;
        sourceName: string;
        confidence: number;
        extractedValue: string;
        normalizedValue: string;
        url: string;
        retrievedAt: string;
      }> = [];
      if (a.evidence) {
        try {
          const parsed = JSON.parse(a.evidence);
          if (Array.isArray(parsed)) evidence = parsed;
        } catch {
          // ignore parse errors
        }
      }
      return {
        id: a.id,
        name: a.name,
        value: a.value,
        source: a.source,
        sourceName: a.sourceName,
        confidence: a.confidence !== null ? Number(a.confidence) : null,
        evidence
      };
    });

  // Manufacturer extracted from pipeline-format description ("Manufacturer: Intel Corporation.")
  const manufacturerMatch = (p.description ?? "").match(/Manufacturer:\s*(.+?)\./);
  const manufacturer = manufacturerMatch?.[1] ?? null;

  return {
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    title: p.title,
    description: p.description,
    brand: extractBrand(p.title),
    category: category?.name ?? "Uncategorized",
    categorySlug: category?.slug ?? "uncategorized",
    nicheId,
    price: minorUnitsToUSD(p.basePriceMinorUnits),
    currency: p.basePriceCurrencyCode,
    priceRange: { min: minPrice, max: maxPrice },
    inStock,
    stockCount: totalStock,
    suppliers: supplierCount,
    rating: 4.8,
    reviewCount: Math.floor(Math.random() * 5000) + 100,
    imageGradient,
    imageLabel,
    specs,
    mpn: p.sku.replace("SF-", "").replace(/-/g, ""),
    offers,
    enrichedSpecs,
    manufacturer
  };
}

function extractBrand(title: string): string {
  const knownBrands = [
    "Intel",
    "AMD",
    "NVIDIA",
    "Samsung",
    "Kingston",
    "Corsair",
    "ASUS",
    "STMicroelectronics",
    "Espressif",
    "Texas Instruments",
    "Bosch",
    "Apple"
  ];
  for (const brand of knownBrands) {
    if (title.toLowerCase().includes(brand.toLowerCase())) return brand;
  }
  return title.split(" ")[0] ?? "Unknown";
}

// ── Route handler ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") ?? "products";

  try {
    // ── Products ──────────────────────────────────────────
    if (path === "products") {
      const nicheId = searchParams.get("niche");
      const categorySlug = searchParams.get("category");
      const q = searchParams.get("q");
      const slugsParam = searchParams.get("slugs");
      const limit = parseInt(searchParams.get("limit") ?? "50", 10);
      const offset = parseInt(searchParams.get("offset") ?? "0", 10);

      const where: any = {
        status: "published",
        deletedAt: null
      };

      if (categorySlug) {
        where.category = { slug: categorySlug };
      }

      // Filter by an explicit list of slugs (used by the compare page).
      // Comma-separated; empty segments ignored. Capped at 20 to avoid abuse.
      if (slugsParam !== null) {
        const slugs = slugsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 20);
        if (slugs.length === 0) {
          return NextResponse.json({ products: [], total: 0, limit, offset });
        }
        where.slug = { in: slugs };
      }

      let products = await prisma.product.findMany({
        where,
        include: {
          category: true,
          variants: { where: { deletedAt: null } },
          media: { orderBy: { position: "asc" } },
          attributes: true,
          offers: {
            include: { supplier: true },
            where: { deletedAt: null }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      // Filter by niche (stored in category.description as JSON)
      if (nicheId) {
        products = products.filter((p: any) => {
          if (!p.category?.description) return false;
          try {
            return JSON.parse(p.category.description).nicheId === nicheId;
          } catch {
            return false;
          }
        });
      }

      // Filter by search query
      if (q) {
        const ql = q.toLowerCase();
        products = products.filter(
          (p: any) =>
            p.title.toLowerCase().includes(ql) ||
            p.description.toLowerCase().includes(ql) ||
            p.sku.toLowerCase().includes(ql) ||
            p.attributes.some(
              (a: any) => a.name.toLowerCase().includes(ql) || a.value.toLowerCase().includes(ql)
            )
        );
      }

      const total = products.length;
      const paginated = products.slice(offset, offset + limit);
      const serialized = paginated.map(serializeProduct);

      return NextResponse.json({
        products: serialized,
        total,
        limit,
        offset
      });
    }

    // ── Categories ────────────────────────────────────────
    if (path === "categories") {
      const categories = await prisma.category.findMany({
        where: { deletedAt: null },
        include: {
          _count: {
            select: {
              products: { where: { deletedAt: null, status: "published" } }
            }
          }
        },
        orderBy: { name: "asc" }
      });

      const result = categories.map((c: any) => {
        let niche = "uncategorized";
        try {
          niche = JSON.parse(c.description ?? "{}").nicheId ?? "uncategorized";
        } catch {
          /* keep default */
        }

        return {
          id: c.id,
          slug: c.slug,
          name: c.name,
          nicheId: niche,
          productCount: c._count.products
        };
      });

      return NextResponse.json({ categories: result });
    }

    // ── Niches ────────────────────────────────────────────
    if (path === "niches") {
      const categories = await prisma.category.findMany({
        where: { deletedAt: null },
        include: {
          _count: {
            select: {
              products: { where: { deletedAt: null, status: "published" } }
            }
          }
        }
      });

      const nicheProductCounts = new Map<string, number>();
      for (const c of categories) {
        let nicheId = "uncategorized";
        try {
          nicheId = JSON.parse(c.description ?? "{}").nicheId ?? "uncategorized";
        } catch {
          /* keep default */
        }

        nicheProductCounts.set(nicheId, (nicheProductCounts.get(nicheId) ?? 0) + c._count.products);
      }

      const niches = [
        {
          id: "pc-hardware",
          name: "PC Hardware & Gamer",
          description:
            "CPUs, GPUs, placas-mãe, memória, armazenamento, periféricos e fabricantes chineses",
          icon: "cpu",
          gradient: "linear-gradient(135deg, #0F172A 0%, #10B981 100%)",
          supplierCount: 7,
          topBrands: [
            "Intel",
            "AMD",
            "NVIDIA",
            "ASUS",
            "MSI",
            "Gigabyte",
            "Colorful",
            "DeepCool",
            "Jonsbo",
            "Gloway"
          ],
          popularSearches: ["Ryzen 9", "RTX 4090", "DDR5", "Huananzhi", "Colorful", "DeepCool"]
        },
        {
          id: "electronic-components",
          name: "Componentes Eletrônicos",
          description: "Microcontroladores, ICs, semicondutores, passivos e sensores",
          icon: "chip",
          gradient: "linear-gradient(135deg, #0F172A 0%, #3B82F6 100%)",
          supplierCount: 4,
          topBrands: ["STMicroelectronics", "Texas Instruments", "Microchip", "NXP", "Onsemi"],
          popularSearches: ["STM32", "ESP32", "ATmega328", "LM358"]
        },
        {
          id: "consumer-electronics",
          name: "Eletrônicos de Consumo",
          description: "Smartphones, áudio, wearables, smart home e acessórios",
          icon: "smartphone",
          gradient: "linear-gradient(135deg, #0F172A 0%, #8B5CF6 100%)",
          supplierCount: 5,
          topBrands: ["Apple", "Samsung", "Xiaomi", "Sony", "JBL"],
          popularSearches: ["iPhone 15", "AirPods Pro", "Galaxy S24", "Apple Watch"]
        }
      ].map((n) => ({
        ...n,
        productCount: nicheProductCounts.get(n.id) ?? 0
      }));

      return NextResponse.json({ niches });
    }

    // ── Suppliers ─────────────────────────────────────────
    if (path === "suppliers") {
      const suppliers = await prisma.supplier.findMany({
        where: { deletedAt: null, status: "active" },
        include: {
          _count: { select: { offers: { where: { deletedAt: null } } } }
        },
        orderBy: { name: "asc" }
      });

      const result = suppliers.map((s: any) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        defaultCurrency: s.defaultCurrency,
        shipsFromCountry: s.shipsFromCountry,
        offerCount: s._count.offers
      }));

      return NextResponse.json({ suppliers: result });
    }

    // ── Manufacturers (rich model from domain registry) ───
    if (path === "manufacturers") {
      const enrichmentModule = await import("@workspace/domain/discovery/enrichment");
      const {
        MANUFACTURERS,
        CONNECTORS,
        INFORMATION_SOURCES,
        MANUFACTURER_VERSIONS,
        COUNTRY_NAMES,
        SEGMENT_LABELS,
        CAPABILITY_LABELS,
        getSegmentCoverage,
        getCountryCoverage
      } = enrichmentModule;

      const manufacturers = MANUFACTURERS.map((m: any) => ({
        code: m.code,
        name: m.shortName,
        officialName: m.name,
        country: m.country,
        countryName: COUNTRY_NAMES[m.country] ?? m.country,
        status: m.status,
        authorityScore: m.authorityScore,
        coverageScore: m.coverageScore,
        tier:
          m.authorityScore >= 98
            ? "A"
            : m.authorityScore >= 92
              ? "B"
              : m.authorityScore >= 82
                ? "C"
                : "D",
        segments: m.segments,
        segmentLabels: m.segments.map(
          (s: string) => SEGMENT_LABELS[s as keyof typeof SEGMENT_LABELS] ?? s
        ),
        segmentCoverage: m.segmentCoverage,
        authority: m.authority,
        capabilities: m.capabilities,
        connectorHealth: m.connectorHealth,
        aliases: m.aliases,
        brands: m.brands,
        officialWebsite: m.officialWebsite ?? null,
        certifications: m.certifications
      }));

      // Group by tier
      const tiers = [
        {
          tier: "A",
          label: "Autoridade máxima",
          authorityRange: "98–100",
          manufacturers: manufacturers.filter((m: any) => m.tier === "A")
        },
        {
          tier: "B",
          label: "Grandes fabricantes globais",
          authorityRange: "92–97",
          manufacturers: manufacturers.filter((m: any) => m.tier === "B")
        },
        {
          tier: "C",
          label: "Grandes fabricantes chineses",
          authorityRange: "82–91",
          manufacturers: manufacturers.filter((m: any) => m.tier === "C")
        },
        {
          tier: "D",
          label: "Fabricantes emergentes",
          authorityRange: "70–81",
          manufacturers: manufacturers.filter((m: any) => m.tier === "D")
        }
      ];

      const segmentCoverage = getSegmentCoverage();
      const countryCoverage = getCountryCoverage();

      return NextResponse.json({
        tiers,
        manufacturers,
        totalManufacturers: manufacturers.length,
        totalSuppliers: 7,
        segmentCoverage: Object.entries(segmentCoverage).map(([seg, count]) => ({
          segment: seg,
          label: SEGMENT_LABELS[seg as keyof typeof SEGMENT_LABELS] ?? seg,
          count
        })),
        countryCoverage: Object.entries(countryCoverage).map(([country, count]) => ({
          country,
          name: COUNTRY_NAMES[country as keyof typeof COUNTRY_NAMES] ?? country,
          count
        })),
        // New: operational aggregates (separate from Manufacturer identity)
        connectors: CONNECTORS.map((c: any) => ({
          id: c.id,
          manufacturerCode: c.manufacturerCode,
          name: c.name,
          kind: c.kind,
          version: c.version,
          status: c.status,
          successRate: c.successRate,
          averageLatencyMs: c.averageLatencyMs,
          lastSuccessfulSync: c.lastSuccessfulSync,
          lastFailure: c.lastFailure,
          rateLimitRemaining: c.rateLimitRemaining,
          endpoint: c.endpoint,
          authType: c.authType
        })),
        totalConnectors: CONNECTORS.length,
        healthyConnectors: CONNECTORS.filter((c: any) => c.status === "healthy").length,
        degradedConnectors: CONNECTORS.filter((c: any) => c.status === "degraded").length,
        // New: provenance examples
        informationSources: INFORMATION_SOURCES.map((is: any) => ({
          id: is.id,
          manufacturerCode: is.manufacturerCode,
          attributeType: is.attributeType,
          attributeName: is.attributeName,
          url: is.url,
          retrievedAt: is.retrievedAt,
          confidence: is.confidence,
          rawValue: is.rawValue
        })),
        totalInformationSources: INFORMATION_SOURCES.length,
        // New: version history
        manufacturerVersions: MANUFACTURER_VERSIONS.map((v: any) => ({
          id: v.id,
          manufacturerCode: v.manufacturerCode,
          version: v.version,
          effectiveFrom: v.effectiveFrom,
          changes: v.changes
        })),
        totalVersions: MANUFACTURER_VERSIONS.length
      });
    }

    return NextResponse.json(
      { error: "Unknown path. Use: products, categories, niches, suppliers, manufacturers" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Catalog API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
