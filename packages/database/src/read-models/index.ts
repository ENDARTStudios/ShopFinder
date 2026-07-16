/**
 * @workspace/database/read-models — Read Models
 *
 * Per Rec 6 of 04B.3 feedback: create specific projections for different
 * read scenarios to avoid repetitive joins and over-fetching.
 *
 * Read models are NOT aggregates — they're optimized query results.
 * They live in the database layer (not domain) because they're persistence-shaped.
 *
 * Read models defined here:
 *   - CatalogReadModel: product list item with minimal fields for catalog grid
 *   - CheckoutReadModel: cart + items + addresses + shipping options
 *   - OrderTimelineReadModel: order events for timeline display
 *   - CustomerDashboardReadModel: customer stats + recent orders
 *   - AdminDashboardReadModel: KPIs + charts data
 */

// ── Catalog Read Model ──────────────────────────────────────

export interface CatalogReadModel {
  productId: string;
  slug: string;
  sku: string;
  title: string;
  priceMinorUnits: bigint;
  currencyCode: string;
  compareAtPriceMinorUnits: bigint | null;
  primaryImageUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  inStock: boolean;
  inventoryCount: number | null;
  categoryId: string | null;
  categorySlug: string | null;
  tags: string[];
}

// ── Checkout Read Model ─────────────────────────────────────

export interface CheckoutReadModel {
  cartId: string;
  customerId: string | null;
  sessionId: string;
  currency: string;
  items: Array<{
    productId: string;
    variantId: string | null;
    sku: string;
    title: string;
    quantity: number;
    unitPriceMinorUnits: bigint;
    unitPriceCurrencyCode: string;
    imageUrl: string | null;
    lineTotalMinorUnits: bigint;
  }>;
  subtotalMinorUnits: bigint;
  itemCount: number;
  shippingAddress: unknown | null;
  billingAddress: unknown | null;
  shippingMethod: unknown | null;
  availableShippingMethods: Array<{
    code: string;
    name: string;
    costMinorUnits: bigint;
    currencyCode: string;
    estimatedDays: { min: number; max: number };
  }>;
}

// ── Order Timeline Read Model ───────────────────────────────

export interface OrderTimelineReadModel {
  orderId: string;
  orderNumber: string;
  status: string;
  events: Array<{
    timestamp: string;
    event: string;
    description: string;
    actor: string | null;
  }>;
}

// ── Customer Dashboard Read Model ───────────────────────────

export interface CustomerDashboardReadModel {
  customerId: string;
  customerName: string;
  customerEmail: string;
  stats: {
    totalOrders: number;
    totalSpentMinorUnits: bigint;
    currencyCode: string;
    averageOrderValueMinorUnits: bigint;
    pendingOrders: number;
    wishlistItemCount: number;
  };
  recentOrders: Array<{
    orderId: string;
    orderNumber: string;
    status: string;
    grandTotalMinorUnits: bigint;
    currencyCode: string;
    itemCount: number;
    placedAt: string;
  }>;
}

// ── Admin Dashboard Read Model ──────────────────────────────

export interface AdminDashboardReadModel {
  kpis: {
    totalRevenueMinorUnits: bigint;
    currencyCode: string;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    averageOrderValueMinorUnits: bigint;
    revenueDelta: number;
    ordersDelta: number;
    customersDelta: number;
  };
  revenueByDay: Array<{
    date: string;
    revenueMinorUnits: bigint;
    orderCount: number;
  }>;
  ordersByStatus: Array<{
    status: string;
    count: number;
  }>;
  topProducts: Array<{
    productId: string;
    title: string;
    sku: string;
    unitsSold: number;
    revenueMinorUnits: bigint;
  }>;
  recentActivity: Array<{
    timestamp: string;
    type: string;
    description: string;
    entityId: string;
  }>;
}

// ── Search Product Projection ───────────────────────────────
//
// Per Rec 5 of 04B.3 feedback: separate projection for search engines.
// This projection is what gets indexed in Meilisearch/Typesense/OpenSearch.
// It's denormalized and flattened for full-text search + faceting.

export interface SearchProductProjection {
  // Identity
  productId: string;
  storeId: string;

  // Searchable text
  title: string;
  description: string;
  sku: string;
  slug: string;

  // Facetable
  categorySlug: string | null;
  categoryName: string | null;
  tags: string[];
  attributes: Array<{ name: string; value: string }>;

  // Sortable / filterable
  priceMinorUnits: bigint;
  currencyCode: string;
  compareAtPriceMinorUnits: bigint | null;

  // Display
  primaryImageUrl: string | null;
  rating: number | null;
  reviewCount: number | null;

  // Inventory
  inStock: boolean;
  totalInventory: number;

  // Variants (flattened for search)
  variants: Array<{
    variantId: string;
    sku: string;
    priceMinorUnits: bigint;
    currencyCode: string;
    attributes: Array<{ name: string; value: string }>;
    inventory: number;
  }>;

  // Supplier info (for multi-supplier search)
  supplierCount: number;
  bestPriceMinorUnits: bigint;
  bestPriceCurrencyCode: string;

  // Metadata
  status: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

// ── Read Model interfaces for query services ────────────────

export interface ReadModelService {
  // Marker interface — query services implement read model builders
  readonly serviceName: string;
}
