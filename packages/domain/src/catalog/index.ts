/**
 * @workspace/domain/catalog
 *
 * Bounded Context: Catalog
 * Responsibility: Product definition, variants, categories, attributes, media.
 * Language: Product, Variant, Category, SKU, Slug, Attribute, Media.
 *
 * Aggregate roots: Product, Category
 * Entities: Variant, ProductAttribute, ProductMedia
 * Value objects: SKU, ProductSlug
 * Events: ProductCreated, ProductPublished, ProductUnpublished, ProductPriceChanged,
 *         VariantAdded, VariantRemoved, CategoryCreated
 */

import {
  type ProductId,
  type VariantId,
  type CategoryId,
  type EntityId,
  type AggregateRoot,
  type DomainEvent,
  type Result,
  type DomainError,
  asProductId,
  asVariantId,
  asCategoryId,
  asEntityId,
  ok,
  err,
  DomainEventBase,
  slug,
  type Slug,
  money,
  type Money
} from "../shared";

// ── Value objects ───────────────────────────────────────────

export interface SKU {
  readonly value: string;
}

export function sku(value: string): SKU {
  const upper = value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9\-_]{2,31}$/.test(upper)) {
    throw new RangeError(`Invalid SKU: ${value}`);
  }
  return { value: upper };
}

// ── Entities ────────────────────────────────────────────────

export interface ProductAttribute {
  readonly id: string;
  readonly name: string;
  readonly value: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProductMedia {
  readonly id: string;
  readonly url: string;
  readonly altText: string;
  readonly position: number;
  readonly isPrimary: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Variant — a specific configuration of a Product (size, color, ...).
 *
 * Per Rec 8: Variants are separate from Product. A Product with one variant
 * still has a Variant row — never store variant data on Product.
 *
 * Per Rec 9: Inventory is NOT stored on Variant. See Inventory aggregate
 * (separate, supports multiple suppliers per variant).
 */
export interface Variant {
  readonly id: VariantId;
  readonly sku: SKU;
  readonly attributes: Readonly<Record<string, string>>;
  readonly price: Money;
  readonly compareAtPrice?: Money;
  readonly isActive: boolean;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * VariantOption + VariantValue — normalized attribute storage.
 *
 * Per Rec 8: Instead of free-form Record<string, string> on Variant,
 * attributes are normalized:
 *   VariantOption: { id, name }       e.g. { id: 1, name: "Color" }
 *   VariantValue:  { id, optionId, value } e.g. { id: 1, optionId: 1, value: "Red" }
 *   VariantAttributeValue: { variantId, valueId } (join table)
 *
 * This enables faceted search and avoids duplicate strings.
 */
export interface VariantOption {
  readonly id: string;
  readonly productId: ProductId;
  readonly name: string; // "Color", "Size"
  readonly position: number;
}

export interface VariantValue {
  readonly id: string;
  readonly optionId: string;
  readonly value: string; // "Red", "XL"
  readonly position: number;
}

/**
 * Inventory — stock for a Variant, sourced from a specific ProductOffer.
 *
 * Per Rec 9: Inventory is separate from Product AND Variant because:
 *   - A variant can have inventory from multiple suppliers (multiple offers).
 *   - Inventory can be reserved (cart), committed (order), or available.
 *   - Inventory syncs from suppliers independently of product edits.
 *
 * Aggregate root: Inventory (one per variant per location/offer).
 */
export interface Inventory {
  readonly id: string;
  readonly variantId: VariantId;
  readonly productOfferId?: string; // which supplier's stock this represents
  readonly available: number; // units available for new orders
  readonly reserved: number; // units held in active carts
  readonly committed: number; // units in placed orders (not yet shipped)
  readonly reorderedAt?: Date; // last low-stock alert
  readonly version: number;
}

/**
 * InventoryReservation — per Ajuste 4.
 *
 * When a customer adds items to cart AND proceeds to checkout, inventory is
 * reserved with an expiry. This prevents overselling when two customers
 * race for the last item.
 *
 * Lifecycle:
 *   active → (checkout completes) → committed
 *   active → (expires)            → expired (stock returns to available)
 *   active → (cart abandoned)     → cancelled (stock returns to available)
 *
 * Aggregate root: InventoryReservation.
 */
export interface InventoryReservation {
  readonly id: string;
  readonly inventoryId: string; // Inventory row being reserved
  readonly variantId: VariantId;
  readonly cartId?: string; // cart that holds the reservation
  readonly customerId?: string;
  readonly sessionId?: string;
  readonly quantity: number;
  readonly status: "active" | "committed" | "expired" | "cancelled";
  readonly reservedAt: Date;
  readonly expiresAt: Date; // TTL (e.g. 15 min for checkout)
  readonly committedAt?: Date; // when order was placed
  readonly expiredAt?: Date;
  readonly cancelledAt?: Date;
}

// ── Aggregate root: Product ─────────────────────────────────

export interface Product extends AggregateRoot<"ProductId"> {
  readonly sku: SKU;
  readonly slug: Slug;
  readonly title: string;
  readonly description: string;
  readonly status: "draft" | "published" | "archived";
  readonly basePrice: Money;
  readonly categoryId?: CategoryId;
  readonly variants: ReadonlyArray<Variant>;
  readonly attributes: ReadonlyArray<ProductAttribute>;
  readonly media: ReadonlyArray<ProductMedia>;
  readonly tags: ReadonlyArray<string>;
  readonly version: number;
}

// ── Aggregate root: Category ────────────────────────────────

export interface Category extends AggregateRoot<"CategoryId"> {
  readonly slug: Slug;
  readonly name: string;
  readonly parentId?: CategoryId;
  readonly description?: string;
  readonly version: number;
}

// ── Domain events ───────────────────────────────────────────

export class ProductCreated extends DomainEventBase {
  constructor(params: { aggregateId: ProductId; sku: SKU; slug: Slug; title: string }) {
    super({ ...params, aggregateType: "Product", eventType: "catalog.product.created" });
  }
}

export class ProductPublished extends DomainEventBase {
  constructor(params: { aggregateId: ProductId }) {
    super({ ...params, aggregateType: "Product", eventType: "catalog.product.published" });
  }
}

export class ProductUnpublished extends DomainEventBase {
  constructor(params: { aggregateId: ProductId }) {
    super({ ...params, aggregateType: "Product", eventType: "catalog.product.unpublished" });
  }
}

export class ProductPriceChanged extends DomainEventBase {
  constructor(params: { aggregateId: ProductId; oldPrice: Money; newPrice: Money }) {
    super({ ...params, aggregateType: "Product", eventType: "catalog.product.price_changed" });
  }
}

export class VariantAdded extends DomainEventBase {
  constructor(params: { aggregateId: ProductId; variantSku: SKU }) {
    super({ ...params, aggregateType: "Product", eventType: "catalog.variant.added" });
  }
}

export class VariantRemoved extends DomainEventBase {
  constructor(params: { aggregateId: ProductId; variantSku: SKU }) {
    super({ ...params, aggregateType: "Product", eventType: "catalog.variant.removed" });
  }
}

export class CategoryCreated extends DomainEventBase {
  constructor(params: { aggregateId: CategoryId; slug: Slug; name: string }) {
    super({ ...params, aggregateType: "Category", eventType: "catalog.category.created" });
  }
}

// ── Factory functions ───────────────────────────────────────

export function createProduct(params: {
  id?: ProductId;
  sku: string;
  slug: string;
  title: string;
  description: string;
  basePrice: { amount: number; currency: string };
}): Result<Product, DomainError> {
  try {
    const id = params.id ?? asProductId(`prod_${Date.now()}`);
    const product: Product = {
      id,
      sku: sku(params.sku),
      slug: slug(params.slug),
      title: params.title,
      description: params.description,
      status: "draft",
      version: 1,
      basePrice: money(params.basePrice.amount, params.basePrice.currency),
      variants: [],
      attributes: [],
      media: [],
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      domainEvents: [
        new ProductCreated({
          aggregateId: id,
          sku: sku(params.sku),
          slug: slug(params.slug),
          title: params.title
        })
      ],
      markEventsAsCommitted() {
        // events cleared after persistence — implementation in repository
      }
    };
    return ok(product);
  } catch (e) {
    return err({ code: "CATALOG.INVALID_PRODUCT", message: (e as Error).message });
  }
}

export type { EntityId, DomainEvent, Result, DomainError };
