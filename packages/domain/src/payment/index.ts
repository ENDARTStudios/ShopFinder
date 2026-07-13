/**
 * @workspace/domain/payment
 *
 * Bounded Context: Payments
 * Responsibility: Payment intents, transactions, captures, refunds.
 */

import {
  type PaymentId,
  type TransactionId,
  type RefundId,
  type OrderId,
  type EntityId,
  type AggregateRoot,
  type DomainEvent,
  type Result,
  type DomainError,
  asPaymentId,
  asTransactionId,
  asRefundId,
  asOrderId,
  ok,
  err,
  DomainEventBase,
  type Money
} from "../shared";

// ── Value objects ───────────────────────────────────────────

export type PaymentStatus =
  "initiated" | "authorized" | "captured" | "failed" | "refunded" | "partially_refunded";

export type PaymentProvider = "stripe" | "paypal";

export interface PaymentMethod {
  readonly type: "card" | "paypal" | "wallet";
  readonly last4?: string;
  readonly brand?: string;
  readonly expiryMonth?: number;
  readonly expiryYear?: number;
}

// ── Entities ────────────────────────────────────────────────

export interface Transaction {
  readonly id: TransactionId;
  readonly provider: PaymentProvider;
  readonly providerTxId: string;
  readonly type: "authorization" | "capture" | "void";
  readonly amount: Money;
  readonly status: "succeeded" | "failed" | "pending";
  readonly failureCode?: string;
  readonly failureMessage?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Refund {
  readonly id: RefundId;
  readonly providerRefundId: string;
  readonly amount: Money;
  readonly reason?: string;
  readonly status: "pending" | "succeeded" | "failed";
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ── Aggregate root: Payment ─────────────────────────────────

export interface Payment extends AggregateRoot<"PaymentId"> {
  readonly orderId: OrderId;
  readonly currency: string;
  readonly amount: Money;
  readonly method: PaymentMethod;
  readonly status: PaymentStatus;
  readonly transactions: ReadonlyArray<Transaction>;
  readonly refunds: ReadonlyArray<Refund>;
  readonly initiatedAt: Date;
  readonly authorizedAt?: Date;
  readonly capturedAt?: Date;
  readonly version: number;
}

// ── Domain events ───────────────────────────────────────────

export class PaymentInitiated extends DomainEventBase {
  constructor(params: { aggregateId: PaymentId; orderId: OrderId; amount: Money }) {
    super({ ...params, aggregateType: "Payment", eventType: "payment.initiated" });
  }
}

export class PaymentAuthorized extends DomainEventBase {
  constructor(params: { aggregateId: PaymentId; providerTxId: string }) {
    super({ ...params, aggregateType: "Payment", eventType: "payment.authorized" });
  }
}

export class PaymentCaptured extends DomainEventBase {
  constructor(params: { aggregateId: PaymentId; providerTxId: string; amount: Money }) {
    super({ ...params, aggregateType: "Payment", eventType: "payment.captured" });
  }
}

export class PaymentFailed extends DomainEventBase {
  constructor(params: { aggregateId: PaymentId; failureCode: string; failureMessage: string }) {
    super({ ...params, aggregateType: "Payment", eventType: "payment.failed" });
  }
}

export class RefundRequested extends DomainEventBase {
  constructor(params: { aggregateId: PaymentId; amount: Money; reason?: string }) {
    super({ ...params, aggregateType: "Payment", eventType: "payment.refund.requested" });
  }
}

export class RefundCompleted extends DomainEventBase {
  constructor(params: { aggregateId: PaymentId; refundId: RefundId; amount: Money }) {
    super({ ...params, aggregateType: "Payment", eventType: "payment.refund.completed" });
  }
}

// ── Factory ─────────────────────────────────────────────────

export function initiatePayment(params: {
  id?: PaymentId;
  orderId: string;
  amount: Money;
  method: PaymentMethod;
}): Result<Payment, DomainError> {
  try {
    const id = params.id ?? asPaymentId(`pay_${Date.now()}`);
    const now = new Date();
    const payment: Payment = {
      id,
      orderId: asOrderId(params.orderId),
      currency: params.amount.currency,
      amount: params.amount,
      method: params.method,
      status: "initiated",
      version: 1,
      transactions: [],
      refunds: [],
      initiatedAt: now,
      createdAt: now,
      updatedAt: now,
      domainEvents: [
        new PaymentInitiated({
          aggregateId: id,
          orderId: asOrderId(params.orderId),
          amount: params.amount
        })
      ],
      markEventsAsCommitted() {}
    };
    return ok(payment);
  } catch (e) {
    return err({ code: "PAYMENT.INVALID", message: (e as Error).message });
  }
}

export type { EntityId, DomainEvent, Result, DomainError, Money };
