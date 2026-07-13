/**
 * @workspace/domain/marketplace — Canonical product model
 */
import type { Money, EntityId } from "../shared";

export type CanonicalProductId = import("../shared").BrandedId<"CanonicalProductId">;
export type SupplierProductId = import("../shared").BrandedId<"SupplierProductId">;
export type MarketplaceListingId = import("../shared").BrandedId<"MarketplaceListingId">;
export type BrandId = import("../shared").BrandedId<"BrandId">;
export type SupplierOfferId = import("../shared").BrandedId<"SupplierOfferId">;

export type ProductLifecycleState =
  | "discovered"
  | "normalized"
  | "duplicate_pending"
  | "deduplicated"
  | "ai_pending"
  | "ai_approved"
  | "ai_rejected"
  | "policy_pending"
  | "approved"
  | "rejected"
  | "catalog_pending"
  | "published"
  | "boosted"
  | "declining"
  | "archived"
  | "blocked";

export interface CanonicalProduct {
  readonly id: CanonicalProductId;
  readonly storeId: EntityId;
  readonly title: string;
  readonly slug: string;
  readonly description: string;
  readonly brand?: string;
  readonly categoryPath: string[];
  readonly attributes: Record<string, string>;
  readonly images: string[];
  readonly lifecycleState: ProductLifecycleState;
  readonly aiScore?: number;
  readonly confidenceScore?: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
export interface AIScoreFactors {
  trendScore: number;
  competitionScore: number;
  reviewScore: number;
  deliveryScore: number;
  marginScore: number;
  supplierReliabilityScore: number;
  stockScore: number;
  refundRateScore: number;
  growthVelocityScore: number;
  priceStabilityScore: number;
  demandScore: number;
  seasonalityScore: number;
  socialPopularityScore: number;
  seoPotentialScore: number;
  crossSellPotentialScore: number;
}
export interface NormalizedDiscoveredProduct {
  readonly externalId: string;
  readonly marketplace: string;
  readonly supplierName?: string;
  readonly sourceUrl?: string;
  readonly title: string;
  readonly description: string;
  readonly category?: string;
  readonly brand?: string;
  readonly images: string[];
  readonly attributes: Record<string, string>;
  readonly variants?: NormalizedProductVariant[];
  readonly price: Money;
  readonly compareAtPrice?: Money;
  readonly currency: string;
  readonly inventory: number;
  readonly shippingCost?: Money;
  readonly shippingFromCountry: string;
  readonly estimatedDeliveryDays: { min: number; max: number };
  readonly rating?: number;
  readonly reviewCount?: number;
  readonly salesCount?: number;
  readonly discoveredAt: Date;
  readonly confidenceScore?: number;
}
export interface NormalizedProductVariant {
  readonly externalVariantId: string;
  readonly sku: string;
  readonly title?: string;
  readonly attributes: Record<string, string>;
  readonly price: Money;
  readonly inventory: number;
  readonly images?: string[];
}
export interface SupplierOffer {
  readonly id: SupplierOfferId;
  readonly canonicalProductId: CanonicalProductId;
  readonly supplierProductId: SupplierProductId;
  readonly sourceType: string;
  readonly price: Money;
  readonly compareAtPrice?: Money;
  readonly currency: string;
  readonly inventory: number;
  readonly fulfillmentOptions: FulfillmentOption[];
  readonly isActive: boolean;
  readonly lastUpdated: Date;
  readonly rank?: number;
}
export interface FulfillmentOption {
  readonly id: string;
  readonly offerId: SupplierOfferId;
  readonly method: "standard" | "express" | "same_day" | "pickup" | "freight";
  readonly cost: Money;
  readonly estimatedDays: { min: number; max: number };
  readonly shipsFromCountry: string;
  readonly shipsToCountries: string[];
  readonly carrier?: string;
  readonly trackingAvailable: boolean;
  readonly isActive: boolean;
}
export interface Brand {
  readonly id: BrandId;
  readonly name: string;
  readonly slug: string;
  readonly logoUrl?: string;
  readonly isVerified: boolean;
}
