/**
 * @workspace/database/mappers/product-mapper
 *
 * Translates between Prisma Product model and domain Product aggregate.
 * This is the ONLY place that knows the Prisma shape of a Product.
 */

import type { Product } from "@workspace/domain/catalog";
import type { ProductId, CategoryId } from "@workspace/domain/shared";
import { asProductId, asCategoryId, asVariantId } from "@workspace/domain/shared";
import type { Prisma } from "@prisma/client";

// ── Prisma model shape (what we get from a find with includes) ──

export interface ProductPrismaModel {
  id: string;
  storeId: string;
  sku: string;
  slug: string;
  title: string;
  description: string;
  status: string;
  basePriceMinorUnits: bigint;
  basePriceCurrencyCode: string;
  categoryId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  variants?: Array<{
    id: string;
    productId: string;
    sku: string;
    priceMinorUnits: bigint;
    priceCurrencyCode: string;
    compareAtPriceMinorUnits: bigint | null;
    compareAtPriceCurrencyCode: string | null;
    isActive: boolean;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }>;
  media?: Array<{
    id: string;
    productId: string;
    url: string;
    altText: string;
    position: number;
    isPrimary: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  attributes?: Array<{
    id: string;
    productId: string;
    name: string;
    value: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

// ── Mapper ──────────────────────────────────────────────────

export const ProductMapper = {
  toAggregate(prisma: ProductPrismaModel): Product {
    return {
      id: asProductId(prisma.id),
      sku: { value: prisma.sku },
      slug: { value: prisma.slug },
      title: prisma.title,
      description: prisma.description,
      status: prisma.status as Product["status"],
      basePrice: {
        amount: Number(prisma.basePriceMinorUnits),
        currency: prisma.basePriceCurrencyCode
      },
      categoryId: prisma.categoryId ? asCategoryId(prisma.categoryId) : undefined,
      variants: (prisma.variants ?? []).map((v) => ({
        id: asVariantId(v.id),
        sku: { value: v.sku },
        attributes: {},
        price: {
          amount: Number(v.priceMinorUnits),
          currency: v.priceCurrencyCode
        },
        compareAtPrice: v.compareAtPriceMinorUnits
          ? { amount: Number(v.compareAtPriceMinorUnits), currency: v.compareAtPriceCurrencyCode! }
          : undefined,
        isActive: v.isActive,
        version: v.version,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt
      })),
      attributes: (prisma.attributes ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        value: a.value,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt
      })),
      media: (prisma.media ?? []).map((m) => ({
        id: m.id,
        url: m.url,
        altText: m.altText,
        position: m.position,
        isPrimary: m.isPrimary,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
      })),
      tags: [],
      version: prisma.version,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
      domainEvents: [],
      markEventsAsCommitted() {}
    };
  },

  toPrismaInput(aggregate: Product): Prisma.ProductCreateInput {
    return {
      id: aggregate.id,
      store: { connect: { id: "" } }, // set by repository (needs storeId)
      sku: aggregate.sku.value,
      slug: aggregate.slug.value,
      title: aggregate.title,
      description: aggregate.description,
      status: aggregate.status,
      basePriceMinorUnits: BigInt(aggregate.basePrice.amount),
      basePriceCurrencyCode: aggregate.basePrice.currency,
      category: aggregate.categoryId ? { connect: { id: aggregate.categoryId } } : undefined,
      version: 1
    };
  },

  toPrismaUpdateInput(aggregate: Product): Prisma.ProductUpdateInput {
    return {
      sku: aggregate.sku.value,
      slug: aggregate.slug.value,
      title: aggregate.title,
      description: aggregate.description,
      status: aggregate.status,
      basePriceMinorUnits: BigInt(aggregate.basePrice.amount),
      basePriceCurrencyCode: aggregate.basePrice.currency,
      category: aggregate.categoryId ? { connect: { id: aggregate.categoryId } } : undefined,
      version: { increment: 1 }
    };
  }
};
