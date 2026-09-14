/**
 * @workspace/database/mappers/cart-mapper
 */

import type { Cart } from "@workspace/domain/cart";
import {
  asCartId,
  asCartItemId,
  asSessionId,
  asCustomerId,
  asProductId,
  asVariantId
} from "@workspace/domain/shared";
import type { Prisma } from "@prisma/client";

export interface CartPrismaModel {
  id: string;
  storeId: string;
  customerId: string | null;
  sessionId: string;
  currency: string;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  items?: Array<{
    id: string;
    cartId: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    unitPriceMinorUnits: bigint;
    unitPriceCurrencyCode: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export const CartMapper = {
  toAggregate(prisma: CartPrismaModel): Cart {
    return {
      id: asCartId(prisma.id),
      customerId: prisma.customerId ? asCustomerId(prisma.customerId) : undefined,
      sessionId: asSessionId(prisma.sessionId),
      currency: prisma.currency,
      items: (prisma.items ?? []).map((i) => ({
        id: asCartItemId(i.id),
        productId: asProductId(i.productId),
        variantId: i.variantId ? asVariantId(i.variantId) : undefined,
        quantity: { value: i.quantity },
        unitPrice: {
          amount: Number(i.unitPriceMinorUnits),
          currency: i.unitPriceCurrencyCode
        },
        createdAt: i.createdAt,
        updatedAt: i.updatedAt
      })),
      status: prisma.status as Cart["status"],
      version: prisma.version,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
      domainEvents: [],
      markEventsAsCommitted() {}
    };
  },

  toPrismaInput(aggregate: Cart): Prisma.CartCreateInput {
    return {
      id: aggregate.id,
      store: { connect: { id: "" } },
      customer: aggregate.customerId ? { connect: { id: aggregate.customerId } } : undefined,
      sessionId: aggregate.sessionId,
      currency: aggregate.currency,
      status: aggregate.status,
      version: 1
    };
  },

  toPrismaUpdateInput(aggregate: Cart): Prisma.CartUpdateInput {
    return {
      status: aggregate.status,
      version: { increment: 1 }
    };
  }
};
