/**
 * @workspace/domain/checkout
 *
 * Bounded Context: Checkout
 * Responsibility: Orchestrate the order-placement flow — addresses, shipping,
 * payment intent. Transient: once the order is placed, the CheckoutSession is
 * converted into an Order and the session is discarded.
 */

import {
  type CheckoutSessionId,
  type CartId,
  type CustomerId,
  type OrderId,
  type EntityId,
  type AggregateRoot,
  type DomainEvent,
  type Result,
  type DomainError,
  asCheckoutSessionId,
  asCartId,
  asCustomerId,
  asOrderId,
  ok,
  err,
  DomainEventBase,
  type Address,
  type Money
} from "../shared";

// ── Value objects ───────────────────────────────────────────

export interface ShippingMethod {
  readonly code: string;
  readonly name: string;
  readonly cost: Money;
  readonly estimatedDays: { min: number; max: number };
}

// ── Aggregate root: CheckoutSession ─────────────────────────

export interface CheckoutSession extends AggregateRoot<"CheckoutSessionId"> {
  readonly cartId: CartId;
  readonly customerId?: CustomerId;
  readonly currency: string;
  shippingAddress?: Address;
  billingAddress?: Address;
  shippingMethod?: ShippingMethod;
  readonly status:
    "initiated" | "shipping_set" | "method_selected" | "billing_set" | "completed" | "abandoned";
  readonly version: number;
}

// ── Domain events ───────────────────────────────────────────

export class CheckoutStarted extends DomainEventBase {
  constructor(params: { aggregateId: CheckoutSessionId; cartId: CartId }) {
    super({ ...params, aggregateType: "CheckoutSession", eventType: "checkout.started" });
  }
}

export class ShippingAddressSet extends DomainEventBase {
  constructor(params: { aggregateId: CheckoutSessionId }) {
    super({
      ...params,
      aggregateType: "CheckoutSession",
      eventType: "checkout.shipping_address.set"
    });
  }
}

export class ShippingMethodSelected extends DomainEventBase {
  constructor(params: { aggregateId: CheckoutSessionId; methodCode: string }) {
    super({
      ...params,
      aggregateType: "CheckoutSession",
      eventType: "checkout.shipping_method.selected"
    });
  }
}

export class BillingAddressSet extends DomainEventBase {
  constructor(params: { aggregateId: CheckoutSessionId }) {
    super({
      ...params,
      aggregateType: "CheckoutSession",
      eventType: "checkout.billing_address.set"
    });
  }
}

export class CheckoutCompleted extends DomainEventBase {
  constructor(params: { aggregateId: CheckoutSessionId; orderId: OrderId }) {
    super({ ...params, aggregateType: "CheckoutSession", eventType: "checkout.completed" });
  }
}

export class CheckoutAbandoned extends DomainEventBase {
  constructor(params: { aggregateId: CheckoutSessionId }) {
    super({ ...params, aggregateType: "CheckoutSession", eventType: "checkout.abandoned" });
  }
}

// ── Factory ─────────────────────────────────────────────────

export function startCheckout(params: {
  id?: CheckoutSessionId;
  cartId: string;
  customerId?: string;
  currency: string;
}): Result<CheckoutSession, DomainError> {
  try {
    const id = params.id ?? asCheckoutSessionId(`chk_${Date.now()}`);
    const session: CheckoutSession = {
      id,
      cartId: asCartId(params.cartId),
      customerId: params.customerId ? asCustomerId(params.customerId) : undefined,
      currency: params.currency.toUpperCase(),
      status: "initiated",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      domainEvents: [new CheckoutStarted({ aggregateId: id, cartId: asCartId(params.cartId) })],
      markEventsAsCommitted() {}
    };
    return ok(session);
  } catch (e) {
    return err({ code: "CHECKOUT.INVALID", message: (e as Error).message });
  }
}

export type { EntityId, DomainEvent, Result, DomainError, Address, Money, OrderId };
