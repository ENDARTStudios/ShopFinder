/**
 * @workspace/domain/shared
 *
 * Base primitives for the domain layer. Every bounded context extends these
 * types. Keeping them in one place ensures consistent identity, equality
 * semantics, and event metadata across the entire model.
 *
 * Principles:
 *  - Entities have identity (id). Equality by id.
 *  - Value objects have no identity. Equality by structural comparison.
 *  - Aggregate roots are the only entry point to an aggregate's state.
 *  - Domain events are immutable facts about state transitions.
 *  - IDs are branded — ProductId is not assignable to OrderId at compile time.
 */

// ── Branded Identity ────────────────────────────────────────
//
// Branded IDs prevent an entire class of bugs: passing a CustomerId where an
// OrderId is expected fails at compile time. Each bounded context declares
// its own branded ID type (ProductId, OrderId, ...) below.
//
// At runtime, all branded IDs are just strings (cuid/uuid). The brand is a
// compile-time-only marker.

declare const __brand: unique symbol;

export interface Brand<T extends string> {
  readonly [__brand]: T;
}

export type BrandedId<T extends string> = string & Brand<T>;

/** Coerce a raw string into a branded ID (use at trust boundaries only). */
export function asId<T extends string>(value: string): BrandedId<T> {
  return value as BrandedId<T>;
}

// ── Concrete branded IDs per bounded context ────────────────
//
// Add new ID types here as new aggregates are introduced.

export type ProductId = BrandedId<"ProductId">;
export type VariantId = BrandedId<"VariantId">;
export type CategoryId = BrandedId<"CategoryId">;

export type CustomerId = BrandedId<"CustomerId">;
export type CustomerAddressId = BrandedId<"CustomerAddressId">;

export type CartId = BrandedId<"CartId">;
export type CartItemId = BrandedId<"CartItemId">;
export type SessionId = BrandedId<"SessionId">;

export type CheckoutSessionId = BrandedId<"CheckoutSessionId">;

export type OrderId = BrandedId<"OrderId">;
export type OrderItemId = BrandedId<"OrderItemId">;
export type FulfillmentId = BrandedId<"FulfillmentId">;

export type PaymentId = BrandedId<"PaymentId">;
export type TransactionId = BrandedId<"TransactionId">;
export type RefundId = BrandedId<"RefundId">;

export type SupplierId = BrandedId<"SupplierId">;
export type SupplierOrderId = BrandedId<"SupplierOrderId">;
export type SupplierProductId = BrandedId<"SupplierProductId">;
export type SupplierIntegrationId = BrandedId<"SupplierIntegrationId">;

// ── Store context (multi-tenant foundation, Ajuste 1) ───────
export type StoreId = BrandedId<"StoreId">;

// ── Identity context (User/Customer split, Ajuste 2) ────────
export type UserId = BrandedId<"UserId">;

// ── Integration context (Ajuste 5) ──────────────────────────
export type IntegrationId = BrandedId<"IntegrationId">;
export type SyncJobId = BrandedId<"SyncJobId">;
export type SyncExecutionId = BrandedId<"SyncExecutionId">;

// ── Generic fallback (for cross-cutting concerns) ───────────
//
// Use BrandedId<"Foo"> for new IDs that don't fit any context above.
// Avoid EntityId in new code — it's kept only for the DomainEvent envelope
// where the aggregate type is polymorphic.

export type EntityId = BrandedId<"EntityId">;
export const asEntityId = (value: string): EntityId => asId<"EntityId">(value);

// Type-safe constructors per context (preferred over asId in business code)
export const asProductId = (v: string): ProductId => asId<"ProductId">(v);
export const asVariantId = (v: string): VariantId => asId<"VariantId">(v);
export const asCategoryId = (v: string): CategoryId => asId<"CategoryId">(v);
export const asCustomerId = (v: string): CustomerId => asId<"CustomerId">(v);
export const asCustomerAddressId = (v: string): CustomerAddressId => asId<"CustomerAddressId">(v);
export const asCartId = (v: string): CartId => asId<"CartId">(v);
export const asCartItemId = (v: string): CartItemId => asId<"CartItemId">(v);
export const asSessionId = (v: string): SessionId => asId<"SessionId">(v);
export const asCheckoutSessionId = (v: string): CheckoutSessionId => asId<"CheckoutSessionId">(v);
export const asOrderId = (v: string): OrderId => asId<"OrderId">(v);
export const asOrderItemId = (v: string): OrderItemId => asId<"OrderItemId">(v);
export const asFulfillmentId = (v: string): FulfillmentId => asId<"FulfillmentId">(v);
export const asPaymentId = (v: string): PaymentId => asId<"PaymentId">(v);
export const asTransactionId = (v: string): TransactionId => asId<"TransactionId">(v);
export const asRefundId = (v: string): RefundId => asId<"RefundId">(v);
export const asSupplierId = (v: string): SupplierId => asId<"SupplierId">(v);
export const asSupplierOrderId = (v: string): SupplierOrderId => asId<"SupplierOrderId">(v);
export const asSupplierProductId = (v: string): SupplierProductId => asId<"SupplierProductId">(v);
export const asSupplierIntegrationId = (v: string): SupplierIntegrationId =>
  asId<"SupplierIntegrationId">(v);

// Store + Identity + Integration constructors (Ajustes 1, 2, 5)
export const asStoreId = (v: string): StoreId => asId<"StoreId">(v);
export const asUserId = (v: string): UserId => asId<"UserId">(v);
export const asIntegrationId = (v: string): IntegrationId => asId<"IntegrationId">(v);
export const asSyncJobId = (v: string): SyncJobId => asId<"SyncJobId">(v);
export const asSyncExecutionId = (v: string): SyncExecutionId => asId<"SyncExecutionId">(v);

// ── Base interfaces ─────────────────────────────────────────

export interface Entity<TId extends string = "EntityId"> {
  readonly id: BrandedId<TId>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AggregateRoot<TId extends string = "EntityId"> extends Entity<TId> {
  /** Uncommitted domain events. Cleared after persistence. */
  readonly domainEvents: ReadonlyArray<DomainEvent>;
  /** Mark events as committed (called by the repository after save). */
  markEventsAsCommitted(): void;
}

export interface ValueObject {
  /** Structural equality — two VOs with same shape are equal. */
  equals(other: this): boolean;
}

// ── Domain Events ───────────────────────────────────────────

export interface DomainEvent {
  /** Unique event id (cuid). */
  readonly eventId: string;
  /** Event type, e.g. "catalog.product.created". */
  readonly eventType: string;
  /** Aggregate that emitted the event. */
  readonly aggregateId: string;
  /** Aggregate type, e.g. "Product". */
  readonly aggregateType: string;
  /** When the event occurred (domain time). */
  readonly occurredAt: Date;
  /** Event version for upcasting. */
  readonly version: number;
}

/** Base class for event factories. */
export abstract class DomainEventBase implements DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly occurredAt: Date;
  readonly version: number;

  constructor(params: {
    aggregateId: string;
    aggregateType: string;
    eventType: string;
    version?: number;
  }) {
    this.eventId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.aggregateId = params.aggregateId;
    this.aggregateType = params.aggregateType;
    this.eventType = params.eventType;
    this.occurredAt = new Date();
    this.version = params.version ?? 1;
  }
}

// ── Result type (avoid throwing in domain layer) ────────────

export type Result<T, E = DomainError> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export interface DomainError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

// ── Re-export value objects + event bus ─────────────────────
export * from "./value-objects";
export * from "./event-bus";
