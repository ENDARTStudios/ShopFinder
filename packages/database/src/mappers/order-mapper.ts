/**
 * @workspace/database/mappers/order-mapper
 */

import type { Order } from "@workspace/domain/order";
import {
  asOrderId,
  asOrderItemId,
  asFulfillmentId,
  asCustomerId,
  asProductId,
  asVariantId,
  asSupplierId
} from "@workspace/domain/shared";
import type { Prisma } from "@prisma/client";

export interface OrderPrismaModel {
  id: string;
  storeId: string;
  number: string;
  customerId: string;
  currency: string;
  subtotalMinorUnits: bigint;
  shippingTotalMinorUnits: bigint;
  taxTotalMinorUnits: bigint;
  discountTotalMinorUnits: bigint;
  grandTotalMinorUnits: bigint;
  shippingAddress: unknown;
  billingAddress: unknown;
  status: string;
  placedAt: Date;
  confirmedAt: Date | null;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  items?: Array<{
    id: string;
    orderId: string;
    productId: string;
    variantId: string | null;
    sku: string;
    title: string;
    quantity: number;
    unitPriceMinorUnits: bigint;
    unitPriceCurrencyCode: string;
    lineTotalMinorUnits: bigint;
    createdAt: Date;
    updatedAt: Date;
  }>;
  fulfillments?: Array<{
    id: string;
    orderId: string;
    supplierId: string;
    status: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: Date | null;
    deliveredAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export const OrderMapper = {
  toAggregate(prisma: OrderPrismaModel): Order {
    return {
      id: asOrderId(prisma.id),
      number: { value: prisma.number },
      customerId: asCustomerId(prisma.customerId),
      currency: prisma.currency,
      items: (prisma.items ?? []).map((i) => ({
        id: asOrderItemId(i.id),
        productId: asProductId(i.productId),
        variantId: i.variantId ? asVariantId(i.variantId) : undefined,
        sku: i.sku,
        title: i.title,
        quantity: i.quantity,
        unitPrice: {
          amount: Number(i.unitPriceMinorUnits),
          currency: i.unitPriceCurrencyCode
        },
        lineTotal: {
          amount: Number(i.lineTotalMinorUnits),
          currency: prisma.currency
        },
        createdAt: i.createdAt,
        updatedAt: i.updatedAt
      })),
      subtotal: { amount: Number(prisma.subtotalMinorUnits), currency: prisma.currency },
      shippingTotal: { amount: Number(prisma.shippingTotalMinorUnits), currency: prisma.currency },
      taxTotal: { amount: Number(prisma.taxTotalMinorUnits), currency: prisma.currency },
      discountTotal: { amount: Number(prisma.discountTotalMinorUnits), currency: prisma.currency },
      grandTotal: { amount: Number(prisma.grandTotalMinorUnits), currency: prisma.currency },
      shippingAddress: prisma.shippingAddress as never,
      billingAddress: prisma.billingAddress as never,
      status: prisma.status as Order["status"],
      fulfillments: (prisma.fulfillments ?? []).map((f) => ({
        id: asFulfillmentId(f.id),
        supplierId: asSupplierId(f.supplierId),
        items: [],
        status: f.status as "pending" | "placed" | "shipped" | "delivered",
        trackingNumber: f.trackingNumber ?? undefined,
        trackingUrl: f.trackingUrl ?? undefined,
        shippedAt: f.shippedAt ?? undefined,
        deliveredAt: f.deliveredAt ?? undefined,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt
      })),
      placedAt: prisma.placedAt,
      confirmedAt: prisma.confirmedAt ?? undefined,
      paidAt: prisma.paidAt ?? undefined,
      shippedAt: prisma.shippedAt ?? undefined,
      deliveredAt: prisma.deliveredAt ?? undefined,
      cancelledAt: prisma.cancelledAt ?? undefined,
      version: prisma.version,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
      domainEvents: [],
      markEventsAsCommitted() {}
    };
  },

  toPrismaInput(aggregate: Order): Prisma.OrderCreateInput {
    return {
      id: aggregate.id,
      store: { connect: { id: "" } },
      number: aggregate.number.value,
      customer: { connect: { id: aggregate.customerId } },
      currency: aggregate.currency,
      subtotalMinorUnits: BigInt(aggregate.subtotal.amount),
      shippingTotalMinorUnits: BigInt(aggregate.shippingTotal.amount),
      taxTotalMinorUnits: BigInt(aggregate.taxTotal.amount),
      discountTotalMinorUnits: BigInt(aggregate.discountTotal.amount),
      grandTotalMinorUnits: BigInt(aggregate.grandTotal.amount),
      shippingAddress: aggregate.shippingAddress as never,
      billingAddress: aggregate.billingAddress as never,
      status: aggregate.status,
      placedAt: aggregate.placedAt,
      version: 1
    };
  },

  toPrismaUpdateInput(aggregate: Order): Prisma.OrderUpdateInput {
    return {
      status: aggregate.status,
      confirmedAt: aggregate.confirmedAt,
      paidAt: aggregate.paidAt,
      shippedAt: aggregate.shippedAt,
      deliveredAt: aggregate.deliveredAt,
      cancelledAt: aggregate.cancelledAt,
      version: { increment: 1 }
    };
  }
};
