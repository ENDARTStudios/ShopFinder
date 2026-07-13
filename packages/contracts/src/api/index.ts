/**
 * @workspace/contracts/api
 *
 * API contracts — request/response shapes for every Route Handler.
 * These are the public API surface; clients (frontend, mobile, external)
 * depend on these types.
 *
 * Convention: one object per endpoint, grouped by resource.
 */

// ── Catalog API ─────────────────────────────────────────────

export interface ListProductsRequest {
  query?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest" | "popular";
  minPrice?: number;
  maxPrice?: number;
}

export interface ListProductsResponse {
  items: import("../dto").ProductListItemDTO[];
  pagination: import("../dto").PaginationDTO;
}

export interface GetProductRequest {
  slug: string;
}

export interface GetProductResponse {
  product: import("../dto").ProductDetailDTO;
}

// ── Cart API ────────────────────────────────────────────────

export interface AddToCartRequest {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface AddToCartResponse {
  cart: import("../dto").CartDTO;
}

export interface UpdateCartItemRequest {
  itemId: string;
  quantity: number;
}

export interface GetCartResponse {
  cart: import("../dto").CartDTO;
}

// ── Checkout API ────────────────────────────────────────────

export interface StartCheckoutRequest {
  cartId: string;
}

export interface StartCheckoutResponse {
  checkoutSessionId: string;
}

export interface SetShippingAddressRequest {
  checkoutSessionId: string;
  address: import("../dto").AddressDTO;
}

export interface SelectShippingMethodRequest {
  checkoutSessionId: string;
  methodCode: string;
}

export interface CompleteCheckoutRequest {
  checkoutSessionId: string;
  paymentMethod: {
    type: "card" | "paypal";
    // For card: Stripe/PayPal payment intent id (PCI-compliant flow)
    paymentIntentId: string;
  };
}

export interface CompleteCheckoutResponse {
  orderId: string;
  orderNumber: string;
}

// ── Order API ───────────────────────────────────────────────

export interface ListOrdersRequest {
  page?: number;
  pageSize?: number;
  status?: string;
}

export interface ListOrdersResponse {
  items: import("../dto").OrderListItemDTO[];
  pagination: import("../dto").PaginationDTO;
}

export interface GetOrderRequest {
  id: string;
}

export interface GetOrderResponse {
  order: import("../dto").OrderDetailDTO;
}

export interface CancelOrderRequest {
  id: string;
  reason?: string;
}

// ── Customer API ────────────────────────────────────────────

export interface RegisterCustomerRequest {
  email: string;
  password: string;
  name: string;
  locale?: string;
}

export interface RegisterCustomerResponse {
  customer: import("../dto").CustomerDTO;
}

export interface GetCustomerResponse {
  customer: import("../dto").CustomerDTO;
}

export interface AddCustomerAddressRequest {
  label: string;
  address: import("../dto").AddressDTO;
  isDefault?: boolean;
}

// ── Admin API ───────────────────────────────────────────────

export interface AdminCreateProductRequest {
  sku: string;
  slug: string;
  title: string;
  description: string;
  basePrice: { amount: number; currency: string };
  categoryId?: string;
  variants?: Array<{
    sku: string;
    attributes: Record<string, string>;
    price: { amount: number; currency: string };
    inventory: number;
  }>;
}

export interface AdminCreateProductResponse {
  product: import("../dto").ProductDetailDTO;
}

// ── Webhook API (supplier & payment) ────────────────────────

export interface SupplierWebhookPayload {
  supplierCode: string;
  eventType: string;
  timestamp: string;
  data: Record<string, unknown>;
  signature: string;
}

export interface PaymentWebhookPayload {
  provider: "stripe" | "paypal";
  eventType: string;
  eventId: string;
  data: Record<string, unknown>;
  signature: string;
}
