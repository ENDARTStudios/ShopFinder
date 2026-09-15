/**
 * @workspace/domain/order
 *
 * Bounded Context: Orders
 * Responsibility: Placed orders, line items, fulfillment, tracking, lifecycle.
 */

import {
  type OrderId,
  type OrderItemId,
  type FulfillmentId,
  type CustomerId,
  type ProductId,
  type VariantId,
  type SupplierId,
  type EntityId,
  type AggregateRoot,
  type DomainEvent,
  type Result,
  type DomainError,
  asOrderId,
  asOrderItemId,
  asFulfillmentId,
  asCustomerId,
  asProductId,
  asVariantId,
  asSupplierId,
  ok,
  err,
  DomainEventBase,
  type Address,
  type Money
} from "../shared";

// ── Value objects ───────────────────────────────────────────

export type OrderStatus =
  "pending" | "confirmed" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";

export interface OrderNumber {
  readonly value: string;
}

export function orderNumber(seq: number, year: number = new Date().getFullYear()): OrderNumber {
  return { value: `ORD-${year}-${String(seq).padStart(6, "0")}` };
}

// ── Entities ────────────────────────────────────────────────

export interface OrderItem {
  readonly id: OrderItemId;
  readonly productId: ProductId;
  readonly variantId?: VariantId;
  readonly sku: string;
  readonly title: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly lineTotal: Money;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface OrderFulfillment {
  readonly id: FulfillmentId;
  readonly supplierId: SupplierId;
  readonly items: ReadonlyArray<OrderItemId>;
  readonly status: "pending" | "placed" | "shipped" | "delivered";
  readonly trackingNumber?: string;
  readonly trackingUrl?: string;
  readonly shippedAt?: Date;
  readonly deliveredAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ── Aggregate root: Order ───────────────────────────────────

export interface Order extends AggregateRoot<"OrderId"> {
  readonly number: OrderNumber;
  readonly customerId: CustomerId;
  readonly currency: string;
  readonly items: ReadonlyArray<OrderItem>;
  readonly subtotal: Money;
  readonly shippingTotal: Money;
  readonly taxTotal: Money;
  readonly discountTotal: Money;
  readonly grandTotal: Money;
  readonly shippingAddress: Address;
  readonly billingAddress: Address;
  readonly status: OrderStatus;
  readonly fulfillments: ReadonlyArray<OrderFulfillment>;
  readonly placedAt: Date;
  readonly confirmedAt?: Date;
  readonly paidAt?: Date;
  readonly shippedAt?: Date;
  readonly deliveredAt?: Date;
  readonly cancelledAt?: Date;
  readonly version: number;
}

// ── Domain events ───────────────────────────────────────────

export class OrderPlaced extends DomainEventBase {
  constructor(params: { aggregateId: OrderId; number: OrderNumber; customerId: CustomerId }) {
    super({ ...params, aggregateType: "Order", eventType: "order.placed" });
  }
}

export class OrderConfirmed extends DomainEventBase {
  constructor(params: { aggregateId: OrderId }) {
    super({ ...params, aggregateType: "Order", eventType: "order.confirmed" });
  }
}

export class OrderPaid extends DomainEventBase {
  constructor(params: { aggregateId: OrderId; paymentId: EntityId }) {
    super({ ...params, aggregateType: "Order", eventType: "order.paid" });
  }
}

export class OrderShipped extends DomainEventBase {
  constructor(params: {
    aggregateId: OrderId;
    fulfillmentId: FulfillmentId;
    trackingNumber?: string;
  }) {
    super({ ...params, aggregateType: "Order", eventType: "order.shipped" });
  }
}

export class OrderDelivered extends DomainEventBase {
  constructor(params: { aggregateId: OrderId }) {
    super({ ...params, aggregateType: "Order", eventType: "order.delivered" });
  }
}

export class OrderCancelled extends DomainEventBase {
  constructor(params: { aggregateId: OrderId; reason?: string }) {
    super({ ...params, aggregateType: "Order", eventType: "order.cancelled" });
  }
}

export class OrderRefunded extends DomainEventBase {
  constructor(params: { aggregateId: OrderId; amount: Money }) {
    super({ ...params, aggregateType: "Order", eventType: "order.refunded" });
  }
}

// ── Factory ─────────────────────────────────────────────────

export function placeOrder(params: {
  id?: OrderId;
  sequence: number;
  customerId: string;
  currency: string;
  items: Array<{
    productId: string;
    variantId?: string;
    sku: string;
    title: string;
    quantity: number;
    unitPrice: Money;
  }>;
  subtotal: Money;
  shippingTotal: Money;
  taxTotal: Money;
  discountTotal: Money;
  shippingAddress: Address;
  billingAddress: Address;
}): Result<Order, DomainError> {
  try {
    const id = params.id ?? asOrderId(`order_${Date.now()}`);
    const now = new Date();
    const grandTotal: Money = {
      amount:
        params.subtotal.amount +
        params.shippingTotal.amount +
        params.taxTotal.amount -
        params.discountTotal.amount,
      currency: params.currency
    };
    const items: OrderItem[] = params.items.map((it, idx) => ({
      id: asOrderItemId(`oi_${id}_${idx}`),
      productId: asProductId(it.productId),
      variantId: it.variantId ? asVariantId(it.variantId) : undefined,
      sku: it.sku,
      title: it.title,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineTotal: { amount: it.unitPrice.amount * it.quantity, currency: params.currency },
      createdAt: now,
      updatedAt: now
    }));
    const order: Order = {
      id,
      number: orderNumber(params.sequence),
      customerId: asCustomerId(params.customerId),
      currency: params.currency.toUpperCase(),
      items,
      subtotal: params.subtotal,
      shippingTotal: params.shippingTotal,
      taxTotal: params.taxTotal,
      discountTotal: params.discountTotal,
      grandTotal,
      shippingAddress: params.shippingAddress,
      billingAddress: params.billingAddress,
      status: "pending",
      version: 1,
      fulfillments: [],
      placedAt: now,
      createdAt: now,
      updatedAt: now,
      domainEvents: [
        new OrderPlaced({
          aggregateId: id,
          number: orderNumber(params.sequence),
          customerId: asCustomerId(params.customerId)
        })
      ],
      markEventsAsCommitted() {}
    };
    return ok(order);
  } catch (e) {
    return err({ code: "ORDER.INVALID", message: (e as Error).message });
  }
}

export type { EntityId, DomainEvent, Result, DomainError, Address, Money };
