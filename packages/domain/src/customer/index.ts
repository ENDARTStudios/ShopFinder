/**
 * @workspace/domain/customer
 *
 * Bounded Context: Customer
 * Responsibility: Customer identity, profile, addresses, wishlist.
 * Language: Customer, CustomerAddress, Wishlist, Email.
 */

import {
  type CustomerId,
  type CustomerAddressId,
  type ProductId,
  type VariantId,
  type EntityId,
  type AggregateRoot,
  type DomainEvent,
  type Result,
  type DomainError,
  asCustomerId,
  asCustomerAddressId,
  asEntityId,
  ok,
  err,
  DomainEventBase,
  email,
  type Email,
  type Address
} from "../shared";

// ── Entities ────────────────────────────────────────────────

export interface CustomerAddress {
  readonly id: CustomerAddressId;
  readonly label: string;
  readonly address: Address;
  readonly isDefault: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface WishlistItem {
  readonly id: string;
  readonly productId: ProductId;
  readonly variantId?: VariantId;
  readonly addedAt: Date;
}

export interface Wishlist {
  readonly id: string;
  readonly customerId: CustomerId;
  readonly items: ReadonlyArray<WishlistItem>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ── Aggregate root: Customer ────────────────────────────────

export interface Customer extends AggregateRoot<"CustomerId"> {
  readonly email: Email;
  readonly name: string;
  readonly locale: string;
  readonly status: "active" | "suspended" | "deleted";
  readonly addresses: ReadonlyArray<CustomerAddress>;
  readonly wishlist: Wishlist;
  readonly lastLoginAt?: Date;
  readonly version: number;
}

// ── Domain events ───────────────────────────────────────────

export class CustomerRegistered extends DomainEventBase {
  constructor(params: { aggregateId: CustomerId; email: Email; name: string }) {
    super({ ...params, aggregateType: "Customer", eventType: "customer.registered" });
  }
}

export class CustomerUpdated extends DomainEventBase {
  constructor(params: { aggregateId: CustomerId }) {
    super({ ...params, aggregateType: "Customer", eventType: "customer.updated" });
  }
}

export class CustomerAddressAdded extends DomainEventBase {
  constructor(params: { aggregateId: CustomerId; label: string }) {
    super({ ...params, aggregateType: "Customer", eventType: "customer.address.added" });
  }
}

export class CustomerLoggedIn extends DomainEventBase {
  constructor(params: { aggregateId: CustomerId }) {
    super({ ...params, aggregateType: "Customer", eventType: "customer.logged_in" });
  }
}

export class WishlistItemAdded extends DomainEventBase {
  constructor(params: { aggregateId: CustomerId; productId: ProductId }) {
    super({ ...params, aggregateType: "Customer", eventType: "customer.wishlist.item_added" });
  }
}

export class WishlistItemRemoved extends DomainEventBase {
  constructor(params: { aggregateId: CustomerId; productId: ProductId }) {
    super({ ...params, aggregateType: "Customer", eventType: "customer.wishlist.item_removed" });
  }
}

// ── Factory ─────────────────────────────────────────────────

export function createCustomer(params: {
  id?: CustomerId;
  email: string;
  name: string;
  locale?: string;
}): Result<Customer, DomainError> {
  try {
    const id = params.id ?? asCustomerId(`cust_${Date.now()}`);
    const custEmail = email(params.email);
    const now = new Date();
    const customer: Customer = {
      id,
      email: custEmail,
      name: params.name,
      locale: params.locale ?? "en",
      status: "active",
      version: 1,
      addresses: [],
      wishlist: { id: `wish_${id}`, customerId: id, items: [], createdAt: now, updatedAt: now },
      createdAt: now,
      updatedAt: now,
      domainEvents: [
        new CustomerRegistered({ aggregateId: id, email: custEmail, name: params.name })
      ],
      markEventsAsCommitted() {}
    };
    return ok(customer);
  } catch (e) {
    return err({ code: "CUSTOMER.INVALID", message: (e as Error).message });
  }
}

export type { EntityId, DomainEvent, Result, DomainError, Address };
