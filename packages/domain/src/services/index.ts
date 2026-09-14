/**
 * @workspace/domain/services
 *
 * Domain Service interfaces. Domain Services encapsulate business logic that
 * doesn't naturally belong to a single aggregate — typically cross-aggregate
 * calculations or external concerns (pricing rules, tax, shipping, currency
 * conversion, recommendations).
 *
 * Interfaces only. Implementations live in application services (apps/web/src/modules)
 * or in dedicated infrastructure packages.
 */

import type { Money, Address, Percentage } from "../shared";
import type { Cart } from "../cart";
import type { Product, Variant } from "../catalog";
import type { Order } from "../order";
import type { Supplier } from "../supplier";

// ── Pricing ─────────────────────────────────────────────────

export interface PricingService {
  /** Compute the unit price for a product variant, applying any active discounts. */
  computeUnitPrice(product: Product, variant?: Variant): Money;
  /** Compute the line total for a quantity of a variant. */
  computeLineTotal(unitPrice: Money, quantity: number): Money;
  /** Compute cart subtotal (sum of line totals, before shipping/tax/discount). */
  computeCartSubtotal(cart: Cart): Money;
  /** Apply a discount code to a subtotal. Returns the discounted amount + remaining. */
  applyDiscount(
    subtotal: Money,
    discountCode: string
  ): { discounted: Money; remaining: Money; invalidCode?: boolean };
}

// ── Shipping ────────────────────────────────────────────────

export interface ShippingQuote {
  readonly methodCode: string;
  readonly methodName: string;
  readonly cost: Money;
  readonly estimatedDays: { min: number; max: number };
}

export interface ShippingService {
  /** Get available shipping methods for a cart + destination. */
  getQuotes(params: { cart: Cart; destination: Address }): Promise<ShippingQuote[]>;
  /** Compute shipping cost for a specific method. */
  computeCost(methodCode: string, cart: Cart, destination: Address): Promise<Money>;
}

// ── Tax ─────────────────────────────────────────────────────

export interface TaxService {
  /** Compute tax for an order based on billing address + line items. */
  computeTax(params: {
    subtotal: Money;
    shippingAddress: Address;
    billingAddress: Address;
    lineItems: ReadonlyArray<{ productId: string; amount: Money; taxCategory?: string }>;
  }): Promise<{
    taxTotal: Money;
    breakdown: ReadonlyArray<{ category: string; rate: Percentage; amount: Money }>;
  }>;
}

// ── Currency ────────────────────────────────────────────────

export interface CurrencyService {
  /** Convert a Money amount from one currency to another. */
  convert(amount: Money, toCurrency: string): Promise<Money>;
  /** Get the exchange rate between two currencies. */
  getRate(from: string, to: string): Promise<number>;
  /** List supported currencies. */
  listSupported(): ReadonlyArray<string>;
}

// ── Recommendation ──────────────────────────────────────────

export interface RecommendationService {
  /** Get related products for a given product. */
  getRelated(productId: string, opts?: { limit?: number }): Promise<Product[]>;
  /** Get personalized recommendations for a customer. */
  getForCustomer(customerId: string, opts?: { limit?: number }): Promise<Product[]>;
  /** Get trending products. */
  getTrending(opts?: { limit?: number; since?: Date }): Promise<Product[]>;
  /** Get "frequently bought together" for a product. */
  getFrequentlyBoughtTogether(productId: string, opts?: { limit?: number }): Promise<Product[][]>;
}

// ── Re-exports ──────────────────────────────────────────────
export type { Money, Address, Percentage, Cart, Product, Variant, Order, Supplier };
