/**
 * @workspace/domain/repositories
 *
 * Repository contracts — interfaces only. Implementations live in
 * @workspace/database (Prisma-backed) and are injected into application
 * services. Domain code depends on these interfaces, never on Prisma.
 *
 * Convention: one repository per aggregate root. Methods return the
 * aggregate (or null) and accept branded IDs.
 *
 * Persistence conventions (see ADR-0009):
 *   - findById finds active (non-deleted) only.
 *   - findByIdIncludingDeleted finds any (admin restore).
 *   - delete is soft (sets deletedAt).
 *   - restore un-soft-deletes.
 *   - save uses optimistic locking via the aggregate's `version` field.
 */

import type {
  ProductId,
  CategoryId,
  CustomerId,
  CartId,
  CheckoutSessionId,
  OrderId,
  PaymentId,
  SupplierId,
  SupplierOrderId,
  SupplierProductId,
  VariantId
} from "../shared";
import type { Product, Category, Inventory, Variant } from "../catalog";
import type { Customer } from "../customer";
import type { Cart } from "../cart";
import type { CheckoutSession } from "../checkout";
import type { Order } from "../order";
import type { Payment } from "../payment";
import type { Supplier, SupplierOrder, ProductOffer } from "../supplier";

// ── Catalog ─────────────────────────────────────────────────

export interface ProductRepository {
  /** Find active (non-deleted) product by ID. */
  findById(id: ProductId): Promise<Product | null>;
  /** Find including soft-deleted (admin restore). */
  findByIdIncludingDeleted(id: ProductId): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  findByCategory(
    categoryId: CategoryId,
    opts?: { limit?: number; offset?: number }
  ): Promise<Product[]>;
  save(product: Product): Promise<Product>;
  /** Soft delete (sets deletedAt). */
  delete(id: ProductId): Promise<void>;
  /** Restore a soft-deleted product. */
  restore(id: ProductId): Promise<void>;
}

export interface CategoryRepository {
  findById(id: CategoryId): Promise<Category | null>;
  findByIdIncludingDeleted(id: CategoryId): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  findChildren(parentId: CategoryId): Promise<Category[]>;
  save(category: Category): Promise<Category>;
  delete(id: CategoryId): Promise<void>;
  restore(id: CategoryId): Promise<void>;
}

export interface VariantRepository {
  findById(id: VariantId): Promise<Variant | null>;
  findByProductId(productId: ProductId): Promise<Variant[]>;
  findBySku(sku: string): Promise<Variant | null>;
  save(variant: Variant): Promise<Variant>;
  delete(id: VariantId): Promise<void>;
}

/**
 * InventoryRepository — per Rec 9.
 * Inventory is separate from Variant because a variant can have stock
 * from multiple suppliers, and stock has states (available/reserved/committed).
 */
export interface InventoryRepository {
  findByVariantId(variantId: VariantId): Promise<Inventory | null>;
  findByVariantAndOffer(variantId: VariantId, offerId: string): Promise<Inventory | null>;
  save(inventory: Inventory): Promise<Inventory>;
  /** Reserve units (available → reserved). */
  reserve(variantId: VariantId, quantity: number): Promise<Inventory>;
  /** Commit reserved units (reserved → committed). */
  commit(variantId: VariantId, quantity: number): Promise<Inventory>;
  /** Release reserved units (reserved → available). */
  release(variantId: VariantId, quantity: number): Promise<Inventory>;
}

// ── Customer ────────────────────────────────────────────────

export interface CustomerRepository {
  findById(id: CustomerId): Promise<Customer | null>;
  findByIdIncludingDeleted(id: CustomerId): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
  save(customer: Customer): Promise<Customer>;
  delete(id: CustomerId): Promise<void>;
  restore(id: CustomerId): Promise<void>;
}

// ── Cart ────────────────────────────────────────────────────

export interface CartRepository {
  findById(id: CartId): Promise<Cart | null>;
  findByCustomerId(customerId: CustomerId): Promise<Cart | null>;
  findBySessionId(sessionId: string): Promise<Cart | null>;
  save(cart: Cart): Promise<Cart>;
  delete(id: CartId): Promise<void>;
}

// ── Checkout ────────────────────────────────────────────────

export interface CheckoutSessionRepository {
  findById(id: CheckoutSessionId): Promise<CheckoutSession | null>;
  findByCartId(cartId: CartId): Promise<CheckoutSession | null>;
  save(session: CheckoutSession): Promise<CheckoutSession>;
  delete(id: CheckoutSessionId): Promise<void>;
}

// ── Order ───────────────────────────────────────────────────

export interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  findByNumber(number: string): Promise<Order | null>;
  findByCustomerId(
    customerId: CustomerId,
    opts?: { limit?: number; offset?: number }
  ): Promise<Order[]>;
  save(order: Order): Promise<Order>;
  delete(id: OrderId): Promise<void>;
}

// ── Payment ─────────────────────────────────────────────────

export interface PaymentRepository {
  findById(id: PaymentId): Promise<Payment | null>;
  findByOrderId(orderId: OrderId): Promise<Payment | null>;
  save(payment: Payment): Promise<Payment>;
  delete(id: PaymentId): Promise<void>;
}

// ── Supplier ────────────────────────────────────────────────

export interface SupplierRepository {
  findById(id: SupplierId): Promise<Supplier | null>;
  findByIdIncludingDeleted(id: SupplierId): Promise<Supplier | null>;
  findByCode(code: string): Promise<Supplier | null>;
  findAll(opts?: { limit?: number; offset?: number }): Promise<Supplier[]>;
  save(supplier: Supplier): Promise<Supplier>;
  delete(id: SupplierId): Promise<void>;
  restore(id: SupplierId): Promise<void>;
}

export interface SupplierOrderRepository {
  findById(id: SupplierOrderId): Promise<SupplierOrder | null>;
  findByOrderId(orderId: OrderId): Promise<SupplierOrder[]>;
  findBySupplierId(
    supplierId: SupplierId,
    opts?: { limit?: number; offset?: number }
  ): Promise<SupplierOrder[]>;
  save(order: SupplierOrder): Promise<SupplierOrder>;
  delete(id: SupplierOrderId): Promise<void>;
}

/**
 * ProductOfferRepository — per Rec 10.
 * A Product can have N offers from N suppliers. This repository manages them.
 */
export interface ProductOfferRepository {
  findById(id: string): Promise<ProductOffer | null>;
  findByProduct(productId: ProductId): Promise<ProductOffer[]>;
  findByProductAndVariant(productId: ProductId, variantId?: VariantId): Promise<ProductOffer[]>;
  findBySupplier(
    supplierId: SupplierId,
    opts?: { limit?: number; offset?: number }
  ): Promise<ProductOffer[]>;
  /** Find the best offer for a product (cheapest, fastest, or per rule). */
  findBestOffer(
    productId: ProductId,
    variantId?: VariantId,
    rule?: "cheapest" | "fastest"
  ): Promise<ProductOffer | null>;
  save(offer: ProductOffer): Promise<ProductOffer>;
  delete(id: string): Promise<void>;
}

// ── Re-export all ───────────────────────────────────────────
export type {
  ProductId,
  CategoryId,
  CustomerId,
  CartId,
  CheckoutSessionId,
  OrderId,
  PaymentId,
  SupplierId,
  SupplierOrderId,
  SupplierProductId,
  VariantId
} from "../shared";
