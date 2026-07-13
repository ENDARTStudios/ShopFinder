/**
 * @workspace/domain/queries
 *
 * Query Service interfaces — read-only projections optimized for specific
 * consumers (list views, detail pages, admin dashboards, sitemaps).
 *
 * Separation from Repository (commands):
 *   - Repository  → writes (save, delete) + aggregate reconstitution.
 *   - QueryService → reads (list, search, count, aggregate projections).
 *
 * Why separate:
 *   1. Read models can be denormalized or projected from events.
 *   2. Read queries can hit a replica / search index / cache.
 *   3. Aggregate reconstitution (Repository.findById) is expensive; list
 *      views should never pay that cost.
 *   4. Future CQRS upgrade is mechanical: swap QueryService impl to read
 *      from a dedicated read store.
 *
 * Returns DTOs from @workspace/contracts/dto — never domain aggregates.
 */

import type { ProductId, CategoryId, CustomerId, CartId, OrderId, SupplierId } from "../shared";
import type {
  ProductListItemDTO,
  ProductDetailDTO,
  CategoryDTO,
  CustomerDTO,
  CartDTO,
  OrderListItemDTO,
  OrderDetailDTO,
  SupplierDTO,
  PaginationDTO
} from "@workspace/contracts/dto";

// ── Catalog queries ─────────────────────────────────────────

export interface ProductQueryService {
  /** Paginated list with filters + sort. Returns lightweight list items. */
  list(params: {
    query?: string;
    categoryId?: CategoryId;
    page?: number;
    pageSize?: number;
    sort?: "relevance" | "price_asc" | "price_desc" | "newest" | "popular";
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
  }): Promise<{ items: ProductListItemDTO[]; pagination: PaginationDTO }>;

  /** Single product detail (with variants, media, attributes). */
  detail(slug: string): Promise<ProductDetailDTO | null>;

  /** Related products for a given product (for "you might also like"). */
  related(productId: ProductId, limit?: number): Promise<ProductListItemDTO[]>;

  /** Trending products (most viewed / most sold in a window). */
  trending(limit?: number, since?: Date): Promise<ProductListItemDTO[]>;

  /** Count products matching a filter (for admin dashboard). */
  count(params: { status?: "draft" | "published" | "archived" }): Promise<number>;
}

export interface CategoryQueryService {
  list(): Promise<CategoryDTO[]>;
  tree(): Promise<CategoryDTO[]>; // nested tree
  findBySlug(slug: string): Promise<CategoryDTO | null>;
}

// ── Customer queries ────────────────────────────────────────

export interface CustomerQueryService {
  profile(id: CustomerId): Promise<CustomerDTO | null>;
  list(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<{ items: CustomerDTO[]; pagination: PaginationDTO }>;
  /** Order history for a customer (lightweight). */
  orderHistory(customerId: CustomerId, limit?: number): Promise<OrderListItemDTO[]>;
}

// ── Cart queries ────────────────────────────────────────────

export interface CartQueryService {
  /** Current cart for a customer or session. */
  active(customerId?: CustomerId, sessionId?: string): Promise<CartDTO | null>;
  /** Cart item count (badge in header). */
  itemCount(customerId?: CustomerId, sessionId?: string): Promise<number>;
}

// ── Order queries ───────────────────────────────────────────

export interface OrderQueryService {
  detail(id: OrderId): Promise<OrderDetailDTO | null>;
  detailByNumber(number: string): Promise<OrderDetailDTO | null>;
  list(params: {
    customerId?: CustomerId;
    status?: string;
    page?: number;
    pageSize?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ items: OrderListItemDTO[]; pagination: PaginationDTO }>;

  /** Admin dashboard: order counts by status. */
  countByStatus(): Promise<Record<string, number>>;
  /** Admin dashboard: revenue in a date range. */
  revenueSummary(params: { dateFrom: Date; dateTo: Date }): Promise<{
    total: number;
    count: number;
    averageOrderValue: number;
  }>;
}

// ── Supplier queries ────────────────────────────────────────

export interface SupplierQueryService {
  list(): Promise<SupplierDTO[]>;
  detail(id: SupplierId): Promise<SupplierDTO | null>;
  /** Suppliers that can fulfill a given product. */
  forProduct(productId: ProductId): Promise<SupplierDTO[]>;
}

// ── Re-export branded IDs used in signatures ────────────────
export type { ProductId, CategoryId, CustomerId, CartId, OrderId, SupplierId } from "../shared";
