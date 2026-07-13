/**
 * @workspace/contracts/dto
 *
 * Data Transfer Objects — the wire shapes for API responses and external
 * integrations. DTOs are NOT domain entities; they are projection views
 * optimized for a specific consumer (API client, webhook, admin UI).
 *
 * Naming convention: <Entity><View>DTO, e.g. ProductListItemDTO, OrderDetailDTO.
 */

// ── Shared ──────────────────────────────────────────────────

export interface PaginationDTO {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedDTO<T> {
  items: T[];
  pagination: PaginationDTO;
}

export interface ErrorDTO {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

// ── Catalog DTOs ────────────────────────────────────────────

export interface ProductListItemDTO {
  id: string;
  sku: string;
  slug: string;
  title: string;
  price: { amount: number; currency: string };
  compareAtPrice?: { amount: number; currency: string };
  primaryImageUrl?: string;
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
}

export interface ProductDetailDTO extends ProductListItemDTO {
  description: string;
  status: "draft" | "published" | "archived";
  variants: ProductVariantDTO[];
  attributes: { name: string; value: string }[];
  media: { url: string; altText: string; position: number }[];
  tags: string[];
  categoryId?: string;
}

export interface ProductVariantDTO {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: { amount: number; currency: string };
  inventory: number;
  isActive: boolean;
}

export interface CategoryDTO {
  id: string;
  slug: string;
  name: string;
  parentId?: string;
  productCount?: number;
}

// ── Customer DTOs ───────────────────────────────────────────

export interface CustomerDTO {
  id: string;
  email: string;
  name: string;
  locale: string;
  status: "active" | "suspended" | "deleted";
  addresses: CustomerAddressDTO[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface CustomerAddressDTO {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

// ── Cart DTOs ───────────────────────────────────────────────

export interface CartDTO {
  id: string;
  items: CartItemDTO[];
  currency: string;
  subtotal: { amount: number; currency: string };
  itemCount: number;
}

export interface CartItemDTO {
  id: string;
  productId: string;
  variantId?: string;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: { amount: number; currency: string };
  lineTotal: { amount: number; currency: string };
  imageUrl?: string;
}

// ── Order DTOs ──────────────────────────────────────────────

export interface OrderListItemDTO {
  id: string;
  number: string;
  status: string;
  grandTotal: { amount: number; currency: string };
  itemCount: number;
  placedAt: string;
}

export interface OrderDetailDTO extends OrderListItemDTO {
  customerId: string;
  items: OrderItemDTO[];
  subtotal: { amount: number; currency: string };
  shippingTotal: { amount: number; currency: string };
  taxTotal: { amount: number; currency: string };
  discountTotal: { amount: number; currency: string };
  shippingAddress: AddressDTO;
  billingAddress: AddressDTO;
  fulfillments: FulfillmentDTO[];
}

export interface OrderItemDTO {
  id: string;
  productId: string;
  variantId?: string;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: { amount: number; currency: string };
  lineTotal: { amount: number; currency: string };
}

export interface FulfillmentDTO {
  id: string;
  supplierId: string;
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface AddressDTO {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

// ── Payment DTOs ────────────────────────────────────────────

export interface PaymentDTO {
  id: string;
  orderId: string;
  amount: { amount: number; currency: string };
  status: string;
  method: { type: string; last4?: string; brand?: string };
  initiatedAt: string;
  capturedAt?: string;
}

// ── Supplier DTOs ───────────────────────────────────────────

export interface SupplierDTO {
  id: string;
  code: string;
  name: string;
  status: string;
  defaultCurrency: string;
  shipsFromCountry: string;
  integration: { status: string; lastSyncAt?: string };
}
