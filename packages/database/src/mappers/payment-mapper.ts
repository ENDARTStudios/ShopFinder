/**
 * @workspace/database/mappers/payment-mapper
 */

import type { Payment } from "@workspace/domain/payment";
import { asPaymentId, asTransactionId, asRefundId, asOrderId } from "@workspace/domain/shared";
import type { Prisma } from "@prisma/client";

export interface PaymentPrismaModel {
  id: string;
  orderId: string;
  currency: string;
  amountMinorUnits: bigint;
  methodType: string;
  methodLast4: string | null;
  methodBrand: string | null;
  status: string;
  initiatedAt: Date;
  authorizedAt: Date | null;
  capturedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  transactions?: Array<{
    id: string;
    paymentId: string;
    provider: string;
    providerTxId: string;
    type: string;
    amountMinorUnits: bigint;
    amountCurrencyCode: string;
    status: string;
    failureCode: string | null;
    failureMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  refunds?: Array<{
    id: string;
    paymentId: string;
    providerRefundId: string;
    amountMinorUnits: bigint;
    amountCurrencyCode: string;
    reason: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export const PaymentMapper = {
  toAggregate(prisma: PaymentPrismaModel): Payment {
    return {
      id: asPaymentId(prisma.id),
      orderId: asOrderId(prisma.orderId),
      currency: prisma.currency,
      amount: { amount: Number(prisma.amountMinorUnits), currency: prisma.currency },
      method: {
        type: prisma.methodType as "card" | "paypal" | "wallet",
        last4: prisma.methodLast4 ?? undefined,
        brand: prisma.methodBrand ?? undefined
      },
      status: prisma.status as Payment["status"],
      transactions: (prisma.transactions ?? []).map((t) => ({
        id: asTransactionId(t.id),
        provider: t.provider as "stripe" | "paypal",
        providerTxId: t.providerTxId,
        type: t.type as "authorization" | "capture" | "void",
        amount: { amount: Number(t.amountMinorUnits), currency: t.amountCurrencyCode },
        status: t.status as "succeeded" | "failed" | "pending",
        failureCode: t.failureCode ?? undefined,
        failureMessage: t.failureMessage ?? undefined,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      })),
      refunds: (prisma.refunds ?? []).map((r) => ({
        id: asRefundId(r.id),
        providerRefundId: r.providerRefundId,
        amount: { amount: Number(r.amountMinorUnits), currency: r.amountCurrencyCode },
        reason: r.reason ?? undefined,
        status: r.status as "pending" | "succeeded" | "failed",
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      })),
      initiatedAt: prisma.initiatedAt,
      authorizedAt: prisma.authorizedAt ?? undefined,
      capturedAt: prisma.capturedAt ?? undefined,
      version: prisma.version,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
      domainEvents: [],
      markEventsAsCommitted() {}
    };
  },

  toPrismaInput(aggregate: Payment): Prisma.PaymentCreateInput {
    return {
      id: aggregate.id,
      order: { connect: { id: aggregate.orderId } },
      currency: aggregate.currency,
      amountMinorUnits: BigInt(aggregate.amount.amount),
      methodType: aggregate.method.type,
      methodLast4: aggregate.method.last4,
      methodBrand: aggregate.method.brand,
      status: aggregate.status,
      initiatedAt: aggregate.initiatedAt,
      version: 1
    };
  },

  toPrismaUpdateInput(aggregate: Payment): Prisma.PaymentUpdateInput {
    return {
      status: aggregate.status,
      authorizedAt: aggregate.authorizedAt,
      capturedAt: aggregate.capturedAt,
      version: { increment: 1 }
    };
  }
};
