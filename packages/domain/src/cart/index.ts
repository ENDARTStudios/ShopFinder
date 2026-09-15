/**
 * @workspace/domain/cart
 *
 * Bounded Context: Cart
 * Responsibility: Shopping cart lifecycle — items, quantities, totals.
 * Language: Cart, CartItem, Quantity.
 *
 * Note: Cart is a transient aggregate. It does NOT hold price snapshots —
 * prices are resolved at checkout time from the Catalog context.
 */

import {
  type CartId,
  type CartItemId,
  type CustomerId,
  type SessionId,
  type ProductId,
  type VariantId,
  type EntityId,
  type AggregateRoot,
  type DomainEvent,
  type Result,
  type DomainError,
  asCartId,
  asCartItemId,
  asSessionId,
  asCustomerId,
  ok,
  err,
  DomainEventBase,
  quantity,
  type Quantity,
  type Money
} from "../shared";

// ── Entities ────────────────────────────────────────────────

export interface CartItem {
  readonly id: CartItemId;
  readonly productId: ProductId;
  readonly variantId?: VariantId;
  readonly quantity: Quantity;
  readonly unitPrice: Money;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ── Aggregate root: Cart ────────────────────────────────────

export interface Cart extends AggregateRoot<"CartId"> {
  readonly storeId?: string;
  readonly customerId?: CustomerId;
  readonly sessionId: SessionId;
  readonly currency: string;
  readonly items: ReadonlyArray<CartItem>;
  readonly status: "active" | "converted" | "abandoned";
  readonly version: number;
}

// ── Domain events ───────────────────────────────────────────

export class CartCreated extends DomainEventBase {
  constructor(params: { aggregateId: CartId; sessionId: SessionId }) {
    super({ ...params, aggregateType: "Cart", eventType: "cart.created" });
  }
}

export class ItemAdded extends DomainEventBase {
  constructor(params: { aggregateId: CartId; productId: ProductId; quantity: Quantity }) {
    super({ ...params, aggregateType: "Cart", eventType: "cart.item.added" });
  }
}

export class ItemRemoved extends DomainEventBase {
  constructor(params: { aggregateId: CartId; productId: ProductId }) {
    super({ ...params, aggregateType: "Cart", eventType: "cart.item.removed" });
  }
}

export class ItemQuantityChanged extends DomainEventBase {
  constructor(params: { aggregateId: CartId; productId: ProductId; quantity: Quantity }) {
    super({ ...params, aggregateType: "Cart", eventType: "cart.item.quantity_changed" });
  }
}

export class CartCleared extends DomainEventBase {
  constructor(params: { aggregateId: CartId }) {
    super({ ...params, aggregateType: "Cart", eventType: "cart.cleared" });
  }
}

export class CartAbandoned extends DomainEventBase {
  constructor(params: { aggregateId: CartId }) {
    super({ ...params, aggregateType: "Cart", eventType: "cart.abandoned" });
  }
}

// ── Factory ─────────────────────────────────────────────────

export function createCart(params: {
  id?: CartId;
  storeId?: string;
  sessionId: string;
  customerId?: string;
  currency: string;
}): Result<Cart, DomainError> {
  try {
    const id = params.id ?? asCartId(`cart_${Date.now()}`);
    const cart: Cart = {
      id,
      storeId: params.storeId,
      sessionId: asSessionId(params.sessionId),
      customerId: params.customerId ? asCustomerId(params.customerId) : undefined,
      currency: params.currency.toUpperCase(),
      items: [],
      status: "active",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      domainEvents: [
        new CartCreated({ aggregateId: id, sessionId: asSessionId(params.sessionId) })
      ],
      markEventsAsCommitted() {}
    };
    return ok(cart);
  } catch (e) {
    return err({ code: "CART.INVALID", message: (e as Error).message });
  }
}

export type { EntityId, DomainEvent, Result, DomainError, Quantity, Money };
export { asCartItemId };
