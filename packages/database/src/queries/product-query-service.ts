/**
 * @workspace/database/queries/product-query-service
 *
 * Read-only queries returning DTOs (never aggregates).
 * Uses cursor pagination + query cache + metrics.
 */

import type { ProductQueryService } from "@workspace/domain/queries";
import type { ProductId, CategoryId } from "@workspace/domain/shared";
import type { ProductListItemDTO, ProductDetailDTO, PaginationDTO } from "@workspace/contracts/dto";
import type { TransactionClient } from "../types";
import type { QueryCache, EntityCache } from "../cache/query-cache";
import { buildQuerySignature } from "../cache/query-cache";
import { withMetrics } from "../metrics";
import type { SearchProductProjection } from "../read-models";

export class PrismaProductQueryService implements ProductQueryService {
  constructor(
    private readonly prisma: TransactionClient,
    private readonly queryCache: QueryCache,
    private readonly entityCache: EntityCache
  ) {}

  async list(params: {
    query?: string;
    categoryId?: CategoryId;
    page?: number;
    pageSize?: number;
    sort?: "relevance" | "price_asc" | "price_desc" | "newest" | "popular";
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
  }): Promise<{ items: ProductListItemDTO[]; pagination: PaginationDTO }> {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 24, 100);

    const where = {
      status: "published",
      deletedAt: null,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.query ? { title: { contains: params.query } } : {}),
      ...(params.minPrice !== undefined || params.maxPrice !== undefined
        ? {
            basePriceMinorUnits: {
              ...(params.minPrice !== undefined ? { gte: BigInt(params.minPrice) } : {}),
              ...(params.maxPrice !== undefined ? { lte: BigInt(params.maxPrice) } : {})
            }
          }
        : {})
    };

    const orderBy =
      params.sort === "price_asc"
        ? { basePriceMinorUnits: "asc" as const }
        : params.sort === "price_desc"
          ? { basePriceMinorUnits: "desc" as const }
          : params.sort === "newest"
            ? { createdAt: "desc" as const }
            : { createdAt: "desc" as const };

    return withMetrics("ProductQueryService", "list", async () => {
      const [items, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          select: {
            id: true,
            sku: true,
            slug: true,
            title: true,
            basePriceMinorUnits: true,
            basePriceCurrencyCode: true,
            media: { where: { isPrimary: true }, take: 1, select: { url: true } },
            variants: {
              where: { isActive: true, deletedAt: null },
              select: { inventory: { select: { available: true } } }
            }
          },
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        this.prisma.product.count({ where })
      ]);

      const dtos: ProductListItemDTO[] = items.map((p) => ({
        id: p.id,
        sku: p.sku,
        slug: p.slug,
        title: p.title,
        price: { amount: Number(p.basePriceMinorUnits), currency: p.basePriceCurrencyCode },
        primaryImageUrl: p.media[0]?.url ?? undefined,
        inStock: p.variants.some((v) => v.inventory.some((inv) => inv.available > 0))
      }));

      return {
        items: dtos,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    });
  }

  async detail(slug: string): Promise<ProductDetailDTO | null> {
    const cacheKey = `product:slug:${slug}`;
    const cached = await this.entityCache.getEntity<ProductDetailDTO>("ProductDetail", slug);
    if (cached) return cached;

    return withMetrics("ProductQueryService", "detail", async () => {
      const p = await this.prisma.product.findFirst({
        where: { slug, status: "published", deletedAt: null },
        select: {
          id: true,
          sku: true,
          slug: true,
          title: true,
          description: true,
          status: true,
          basePriceMinorUnits: true,
          basePriceCurrencyCode: true,
          categoryId: true,
          media: {
            orderBy: { position: "asc" },
            select: { url: true, altText: true, position: true }
          },
          attributes: { select: { name: true, value: true } },
          variants: {
            where: { isActive: true, deletedAt: null },
            select: {
              id: true,
              sku: true,
              priceMinorUnits: true,
              priceCurrencyCode: true,
              isActive: true
            }
          }
        }
      });

      if (!p) return null;

      const dto: ProductDetailDTO = {
        id: p.id,
        sku: p.sku,
        slug: p.slug,
        title: p.title,
        description: p.description,
        status: p.status as ProductDetailDTO["status"],
        price: { amount: Number(p.basePriceMinorUnits), currency: p.basePriceCurrencyCode },
        primaryImageUrl: p.media[0]?.url,
        media: p.media.map((m) => ({ url: m.url, altText: m.altText, position: m.position })),
        attributes: p.attributes.map((a) => ({ name: a.name, value: a.value })),
        variants: p.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          attributes: {},
          price: { amount: Number(v.priceMinorUnits), currency: v.priceCurrencyCode },
          inventory: 0,
          isActive: v.isActive
        })),
        tags: [],
        categoryId: p.categoryId ?? undefined,
        inStock: p.variants.length > 0
      };

      await this.entityCache.setEntity("ProductDetail", slug, dto, 300);
      return dto;
    });
  }

  async related(productId: ProductId, limit: number = 8): Promise<ProductListItemDTO[]> {
    return withMetrics("ProductQueryService", "related", async () => {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { categoryId: true }
      });
      if (!product?.categoryId) return [];

      const items = await this.prisma.product.findMany({
        where: {
          categoryId: product.categoryId,
          id: { not: productId },
          status: "published",
          deletedAt: null
        },
        select: {
          id: true,
          sku: true,
          slug: true,
          title: true,
          basePriceMinorUnits: true,
          basePriceCurrencyCode: true,
          media: { where: { isPrimary: true }, take: 1, select: { url: true } }
        },
        take: limit
      });

      return items.map((p) => ({
        id: p.id,
        sku: p.sku,
        slug: p.slug,
        title: p.title,
        price: { amount: Number(p.basePriceMinorUnits), currency: p.basePriceCurrencyCode },
        primaryImageUrl: p.media[0]?.url ?? undefined,
        inStock: true
      }));
    });
  }

  async trending(limit: number = 10, since?: Date): Promise<ProductListItemDTO[]> {
    return withMetrics("ProductQueryService", "trending", async () => {
      // Simple trending: most recently published products
      // Future: aggregate from order_items (most sold in window)
      const items = await this.prisma.product.findMany({
        where: {
          status: "published",
          deletedAt: null,
          ...(since ? { createdAt: { gte: since } } : {})
        },
        select: {
          id: true,
          sku: true,
          slug: true,
          title: true,
          basePriceMinorUnits: true,
          basePriceCurrencyCode: true,
          media: { where: { isPrimary: true }, take: 1, select: { url: true } }
        },
        orderBy: { createdAt: "desc" },
        take: limit
      });

      return items.map((p) => ({
        id: p.id,
        sku: p.sku,
        slug: p.slug,
        title: p.title,
        price: { amount: Number(p.basePriceMinorUnits), currency: p.basePriceCurrencyCode },
        primaryImageUrl: p.media[0]?.url ?? undefined,
        inStock: true
      }));
    });
  }

  async count(params: { status?: "draft" | "published" | "archived" }): Promise<number> {
    return withMetrics("ProductQueryService", "count", async () => {
      return this.prisma.product.count({
        where: { status: params.status, deletedAt: null }
      });
    });
  }

  /**
   * Build a SearchProductProjection for indexing in Meilisearch/Typesense.
   * Per Rec 5: separate projection for search engines.
   */
  async buildSearchProjection(productId: ProductId): Promise<SearchProductProjection | null> {
    return withMetrics("ProductQueryService", "buildSearchProjection", async () => {
      const p = await this.prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          storeId: true,
          sku: true,
          slug: true,
          title: true,
          description: true,
          status: true,
          basePriceMinorUnits: true,
          basePriceCurrencyCode: true,
          categoryId: true,
          createdAt: true,
          updatedAt: true,
          media: { where: { isPrimary: true }, take: 1, select: { url: true } },
          attributes: { select: { name: true, value: true } },
          variants: {
            where: { isActive: true, deletedAt: null },
            select: {
              id: true,
              sku: true,
              priceMinorUnits: true,
              priceCurrencyCode: true,
              inventory: { select: { available: true } }
            }
          },
          category: { select: { slug: true, name: true } },
          offers: {
            where: { isActive: true, deletedAt: null },
            select: {
              priceMinorUnits: true,
              priceCurrencyCode: true,
              inventory: true
            }
          }
        }
      });

      if (!p) return null;

      const totalInventory = p.variants.reduce(
        (sum, v) => sum + (v.inventory[0]?.available ?? 0),
        0
      );
      const bestOffer =
        p.offers.length > 0
          ? p.offers.reduce((min, o) => (o.priceMinorUnits < min.priceMinorUnits ? o : min))
          : null;

      return {
        productId: p.id,
        storeId: p.storeId,
        title: p.title,
        description: p.description,
        sku: p.sku,
        slug: p.slug,
        categorySlug: p.category?.slug ?? null,
        categoryName: p.category?.name ?? null,
        tags: [],
        attributes: p.attributes.map((a) => ({ name: a.name, value: a.value })),
        priceMinorUnits: p.basePriceMinorUnits,
        currencyCode: p.basePriceCurrencyCode,
        compareAtPriceMinorUnits: null,
        primaryImageUrl: p.media[0]?.url ?? null,
        rating: null,
        reviewCount: null,
        inStock: totalInventory > 0,
        totalInventory,
        variants: p.variants.map((v) => ({
          variantId: v.id,
          sku: v.sku,
          priceMinorUnits: v.priceMinorUnits,
          currencyCode: v.priceCurrencyCode,
          attributes: [],
          inventory: v.inventory[0]?.available ?? 0
        })),
        supplierCount: p.offers.length,
        bestPriceMinorUnits: bestOffer?.priceMinorUnits ?? p.basePriceMinorUnits,
        bestPriceCurrencyCode: bestOffer?.priceCurrencyCode ?? p.basePriceCurrencyCode,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        publishedAt: p.status === "published" ? p.createdAt.toISOString() : null
      };
    });
  }
}
