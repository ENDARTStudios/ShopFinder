/**
 * @workspace/domain/supplier
 *
 * Bounded Context: Suppliers
 * Responsibility: Dropshipping supplier identity, product mapping, fulfillment
 * orders sent to suppliers, shipment tracking relayed back.
 */

import {
  type SupplierId,
  type SupplierOrderId,
  type SupplierProductId,
  type SupplierIntegrationId,
  type OrderId,
  type ProductId,
  type VariantId,
  type EntityId,
  type AggregateRoot,
  type DomainEvent,
  type Result,
  type DomainError,
  asSupplierId,
  asSupplierOrderId,
  asSupplierProductId,
  asSupplierIntegrationId,
  asOrderId,
  asProductId,
  asVariantId,
  ok,
  err,
  DomainEventBase,
  type Money
} from "../shared";

// ── Value objects ───────────────────────────────────────────

export type SupplierCode =
  | "aliexpress"
  | "cj"
  | "dsers"
  | "zendrop"
  | "spocket"
  | "syncee"
  | "modalyst"
  | "bigbuy"
  | "printful"
  | "printify"
  | "gelato";

export interface ApiCredentials {
  readonly apiKey: string;
  readonly apiSecret?: string;
  readonly webhookSecret?: string;
}

// ── Entities ────────────────────────────────────────────────

export interface SupplierProduct {
  readonly id: SupplierProductId;
  readonly supplierId: SupplierId;
  readonly supplierProductId: string;
  readonly catalogProductId: ProductId;
  readonly baseCost: Money;
  readonly fulfillmentDays: { min: number; max: number };
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SupplierIntegration {
  readonly id: SupplierIntegrationId;
  readonly supplierId: SupplierId;
  readonly code: SupplierCode;
  readonly status: "connected" | "disconnected" | "error";
  readonly lastSyncAt?: Date;
  readonly syncError?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * ProductOffer — a supplier's offer for a catalog product/variant.
 *
 * Per Rec 10: NEVER do Product → Supplier (1:N). Instead, Product → ProductOffer ← Supplier.
 * A single Product can have 12 offers from 12 suppliers, each with its own:
 *   - price (in supplier's currency)
 *   - inventory
 *   - fulfillment days
 *   - ships-from country
 *   - shipping cost
 *
 * The platform picks the best offer per order (cheapest, fastest, or per rule).
 *
 * Aggregate root: ProductOffer (own lifecycle, versioned for optimistic lock).
 */
export interface ProductOffer extends AggregateRoot<"SupplierOrderId"> {
  readonly supplierId: SupplierId;
  readonly productId: ProductId;
  readonly variantId?: VariantId;
  readonly supplierSku: string; // SKU in supplier's system
  readonly externalProvider?: string;
  readonly externalId?: string;
  readonly price: Money; // supplier's price (what we pay)
  readonly compareAtPrice?: Money; // supplier's MSRP (for our margin calc)
  readonly inventory: number; // current stock at supplier
  readonly fulfillmentDays: { min: number; max: number };
  readonly shipsFromCountry: string; // ISO 3166-1 alpha-2
  readonly shippingCost?: Money; // per-unit shipping to default destination
  readonly isActive: boolean;
  readonly lastSyncedAt: Date;
  readonly version: number;
}

/**
 * ProductOfferPriceHistory — per Ajuste 3.
 *
 * Tracks every price change for a ProductOffer. Enables:
 *   - margin analysis (did supplier raise prices?)
 *   - price increase alerts
 *   - supplier reliability scoring
 *   - AI pricing recommendations
 *
 * Append-only table — rows are never updated or deleted.
 */
export interface ProductOfferPriceHistory {
  readonly id: string;
  readonly offerId: string; // ProductOffer id
  readonly price: Money; // snapshot of price at this point in time
  readonly compareAtPrice?: Money;
  readonly inventory: number; // snapshot of inventory
  readonly changedAt: Date; // when the change was detected
  readonly changeSource: "sync" | "manual" | "webhook";
  readonly previousPrice?: Money; // for delta calc
}

// ── Aggregate root: Supplier ────────────────────────────────

export interface Supplier extends AggregateRoot<"SupplierId"> {
  readonly code: SupplierCode;
  readonly name: string;
  readonly integration: SupplierIntegration;
  readonly defaultCurrency: string;
  readonly shipsFromCountry: string;
  readonly status: "active" | "inactive";
  readonly version: number;
}

// ── Aggregate root: SupplierOrder ───────────────────────────

export type SupplierOrderStatus =
  "pending" | "placed" | "accepted" | "shipped" | "delivered" | "cancelled" | "failed";

export interface SupplierOrder extends AggregateRoot<"SupplierOrderId"> {
  readonly supplierId: SupplierId;
  readonly orderId: OrderId;
  readonly supplierOrderRef?: string;
  readonly items: ReadonlyArray<{
    productId: ProductId;
    variantId?: VariantId;
    quantity: number;
    cost: Money;
  }>;
  readonly totalCost: Money;
  readonly status: SupplierOrderStatus;
  readonly trackingNumber?: string;
  readonly trackingUrl?: string;
  readonly placedAt?: Date;
  readonly shippedAt?: Date;
  readonly deliveredAt?: Date;
  readonly version: number;
}

// ── Domain events ───────────────────────────────────────────

export class SupplierConnected extends DomainEventBase {
  constructor(params: { aggregateId: SupplierId; code: SupplierCode }) {
    super({ ...params, aggregateType: "Supplier", eventType: "supplier.connected" });
  }
}

export class SupplierDisconnected extends DomainEventBase {
  constructor(params: { aggregateId: SupplierId }) {
    super({ ...params, aggregateType: "Supplier", eventType: "supplier.disconnected" });
  }
}

export class SupplierProductSynced extends DomainEventBase {
  constructor(params: { aggregateId: SupplierId; productCount: number }) {
    super({ ...params, aggregateType: "Supplier", eventType: "supplier.product.synced" });
  }
}

export class SupplierOrderPlaced extends DomainEventBase {
  constructor(params: { aggregateId: SupplierOrderId; supplierId: SupplierId; orderId: OrderId }) {
    super({ ...params, aggregateType: "SupplierOrder", eventType: "supplier.order.placed" });
  }
}

export class SupplierOrderShipped extends DomainEventBase {
  constructor(params: { aggregateId: SupplierOrderId; trackingNumber?: string }) {
    super({ ...params, aggregateType: "SupplierOrder", eventType: "supplier.order.shipped" });
  }
}

export class SupplierOrderDelivered extends DomainEventBase {
  constructor(params: { aggregateId: SupplierOrderId }) {
    super({ ...params, aggregateType: "SupplierOrder", eventType: "supplier.order.delivered" });
  }
}

// ── Factory ─────────────────────────────────────────────────

export function connectSupplier(params: {
  id?: SupplierId;
  code: SupplierCode;
  name: string;
  defaultCurrency: string;
  shipsFromCountry: string;
}): Result<Supplier, DomainError> {
  try {
    const id = params.id ?? asSupplierId(`sup_${params.code}_${Date.now()}`);
    const now = new Date();
    const supplier: Supplier = {
      id,
      code: params.code,
      name: params.name,
      defaultCurrency: params.defaultCurrency.toUpperCase(),
      shipsFromCountry: params.shipsFromCountry.toUpperCase(),
      status: "active",
      version: 1,
      integration: {
        id: asSupplierIntegrationId(`int_${id}`),
        supplierId: id,
        code: params.code,
        status: "connected",
        lastSyncAt: now,
        createdAt: now,
        updatedAt: now
      },
      createdAt: now,
      updatedAt: now,
      domainEvents: [new SupplierConnected({ aggregateId: id, code: params.code })],
      markEventsAsCommitted() {}
    };
    return ok(supplier);
  } catch (e) {
    return err({ code: "SUPPLIER.INVALID", message: (e as Error).message });
  }
}

export type { EntityId, DomainEvent, Result, DomainError, Money };
