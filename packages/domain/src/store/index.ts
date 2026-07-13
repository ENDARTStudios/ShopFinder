/**
 * @workspace/domain/store
 *
 * Bounded Context: Store (multi-tenant foundation)
 *
 * Per Ajuste 1: even with a single store initially, modeling Store from day 1
 * enables future white-label, multi-brand, multi-domain, and franchise scenarios
 * at near-zero cost. Every tenant-scoped aggregate references a StoreId.
 *
 * Aggregate root: Store
 * Events: StoreCreated, StoreUpdated, StoreActivated, StoreDeactivated
 *
 * Tenant-scoped aggregates (carry storeId):
 *   Product, Category, Customer, Cart, Order, Payment, Coupon, BlogPost
 *
 * Non-tenant-scoped (global):
 *   User (identity), Supplier, Integration (these span stores)
 */

import {
  type StoreId,
  type EntityId,
  type AggregateRoot,
  type DomainEvent,
  type Result,
  type DomainError,
  asStoreId,
  ok,
  err,
  DomainEventBase,
  slug,
  type Slug
} from "../shared";

// ── Aggregate root: Store ───────────────────────────────────

export interface Store extends AggregateRoot<"StoreId"> {
  readonly name: string;
  readonly slug: Slug;
  readonly defaultCurrency: string; // ISO 4217
  readonly defaultLocale: string; // BCP 47
  readonly domain?: string; // canonical domain (e.g. "shop.example.com")
  readonly status: "active" | "inactive" | "suspended";
  readonly settings: StoreSettings;
}

export interface StoreSettings {
  readonly timezone: string; // IANA (e.g. "America/Sao_Paulo")
  readonly taxInclusive: boolean; // prices include tax?
  readonly roundToMinorUnit: boolean; // round cart totals to cents?
  readonly logoUrl?: string;
  readonly brandColor?: string; // hex
}

// ── Domain events ───────────────────────────────────────────

export class StoreCreated extends DomainEventBase {
  constructor(params: { aggregateId: StoreId; name: string; slug: Slug }) {
    super({ ...params, aggregateType: "Store", eventType: "store.created" });
  }
}

export class StoreUpdated extends DomainEventBase {
  constructor(params: { aggregateId: StoreId }) {
    super({ ...params, aggregateType: "Store", eventType: "store.updated" });
  }
}

export class StoreActivated extends DomainEventBase {
  constructor(params: { aggregateId: StoreId }) {
    super({ ...params, aggregateType: "Store", eventType: "store.activated" });
  }
}

export class StoreDeactivated extends DomainEventBase {
  constructor(params: { aggregateId: StoreId }) {
    super({ ...params, aggregateType: "Store", eventType: "store.deactivated" });
  }
}

// ── Factory ─────────────────────────────────────────────────

export function createStore(params: {
  id?: StoreId;
  name: string;
  slug: string;
  defaultCurrency: string;
  defaultLocale?: string;
  domain?: string;
  timezone?: string;
}): Result<Store, DomainError> {
  try {
    const id = params.id ?? asStoreId(`store_${Date.now()}`);
    const now = new Date();
    const store: Store = {
      id,
      name: params.name,
      slug: slug(params.slug),
      defaultCurrency: params.defaultCurrency.toUpperCase(),
      defaultLocale: params.defaultLocale ?? "en",
      domain: params.domain,
      status: "active",
      settings: {
        timezone: params.timezone ?? "UTC",
        taxInclusive: false,
        roundToMinorUnit: true
      },
      createdAt: now,
      updatedAt: now,
      domainEvents: [
        new StoreCreated({ aggregateId: id, name: params.name, slug: slug(params.slug) })
      ],
      markEventsAsCommitted() {}
    };
    return ok(store);
  } catch (e) {
    return err({ code: "STORE.INVALID", message: (e as Error).message });
  }
}

export type { EntityId, DomainEvent, Result, DomainError };
