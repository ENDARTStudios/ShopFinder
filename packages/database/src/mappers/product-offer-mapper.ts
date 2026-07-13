/**
 * @workspace/database/mappers/product-offer-mapper
 */

import type { ProductOffer } from "@workspace/domain/supplier";
import { asSupplierId, asProductId, asVariantId } from "@workspace/domain/shared";
import type { Prisma } from "@prisma/client";

export interface ProductOfferPrismaModel {
  id: string;
  supplierId: string;
  productId: string;
  variantId: string | null;
  supplierSku: string;
  externalProvider: string | null;
  externalId: string | null;
  priceMinorUnits: bigint;
  priceCurrencyCode: string;
  compareAtPriceMinorUnits: bigint | null;
  compareAtPriceCurrencyCode: string | null;
  inventory: number;
  fulfillmentDaysMin: number;
  fulfillmentDaysMax: number;
  shipsFromCountry: string;
  shippingCostMinorUnits: bigint | null;
  shippingCostCurrencyCode: string | null;
  isActive: boolean;
  lastSyncedAt: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export const ProductOfferMapper = {
  toAggregate(prisma: ProductOfferPrismaModel): ProductOffer {
    return {
      id: prisma.id as never, // ProductOffer uses a placeholder branded ID
      supplierId: asSupplierId(prisma.supplierId),
      productId: asProductId(prisma.productId),
      variantId: prisma.variantId ? asVariantId(prisma.variantId) : undefined,
      supplierSku: prisma.supplierSku,
      externalProvider: prisma.externalProvider ?? undefined,
      externalId: prisma.externalId ?? undefined,
      price: { amount: Number(prisma.priceMinorUnits), currency: prisma.priceCurrencyCode },
      compareAtPrice: prisma.compareAtPriceMinorUnits
        ? {
            amount: Number(prisma.compareAtPriceMinorUnits),
            currency: prisma.compareAtPriceCurrencyCode!
          }
        : undefined,
      inventory: prisma.inventory,
      fulfillmentDays: { min: prisma.fulfillmentDaysMin, max: prisma.fulfillmentDaysMax },
      shipsFromCountry: prisma.shipsFromCountry,
      shippingCost: prisma.shippingCostMinorUnits
        ? {
            amount: Number(prisma.shippingCostMinorUnits),
            currency: prisma.shippingCostCurrencyCode!
          }
        : undefined,
      isActive: prisma.isActive,
      lastSyncedAt: prisma.lastSyncedAt,
      version: prisma.version,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
      domainEvents: [],
      markEventsAsCommitted() {}
    };
  },

  toPrismaInput(aggregate: ProductOffer): Prisma.ProductOfferCreateInput {
    return {
      supplier: { connect: { id: aggregate.supplierId } },
      product: { connect: { id: aggregate.productId } },
      variant: aggregate.variantId ? { connect: { id: aggregate.variantId } } : undefined,
      supplierSku: aggregate.supplierSku,
      externalProvider: aggregate.externalProvider,
      externalId: aggregate.externalId,
      priceMinorUnits: BigInt(aggregate.price.amount),
      priceCurrencyCode: aggregate.price.currency,
      compareAtPriceMinorUnits: aggregate.compareAtPrice
        ? BigInt(aggregate.compareAtPrice.amount)
        : undefined,
      compareAtPriceCurrencyCode: aggregate.compareAtPrice?.currency,
      inventory: aggregate.inventory,
      fulfillmentDaysMin: aggregate.fulfillmentDays.min,
      fulfillmentDaysMax: aggregate.fulfillmentDays.max,
      shipsFromCountry: aggregate.shipsFromCountry,
      shippingCostMinorUnits: aggregate.shippingCost
        ? BigInt(aggregate.shippingCost.amount)
        : undefined,
      shippingCostCurrencyCode: aggregate.shippingCost?.currency,
      isActive: aggregate.isActive,
      lastSyncedAt: aggregate.lastSyncedAt,
      version: 1
    };
  },

  toPrismaUpdateInput(aggregate: ProductOffer): Prisma.ProductOfferUpdateInput {
    return {
      priceMinorUnits: BigInt(aggregate.price.amount),
      priceCurrencyCode: aggregate.price.currency,
      inventory: aggregate.inventory,
      isActive: aggregate.isActive,
      lastSyncedAt: aggregate.lastSyncedAt,
      version: { increment: 1 }
    };
  }
};
