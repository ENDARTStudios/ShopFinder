/**
 * @workspace/domain/discovery/marketplace-publication/types
 *
 * A2.12 — Marketplace Publication.
 *
 * Introduces PublicationPlan as an intermediate artifact between
 * CatalogPublished and MarketplaceListing. This allows Shopify, Amazon,
 * Mercado Livre, and WooCommerce to consume the same contract.
 *
 * Flow:
 *   CatalogPublished → PublicationPlanner → PublicationPlan
 *   → MarketplacePublisher → MarketplaceListing
 */
import type { BrandedId } from "../../shared";
import type { CatalogEntryId, CatalogEntry } from "../catalog/types";

export type MarketplaceId = BrandedId<"MarketplaceId">;
export type PublicationPlanId = BrandedId<"PublicationPlanId">;
export type MarketplaceListingId = BrandedId<"MarketplaceListingId">;

export type MarketplaceDestination =
  "shopify" | "amazon" | "mercadolivre" | "woocommerce" | "internal";

export interface PublicationPlan {
  readonly id: PublicationPlanId;
  readonly catalogEntryId: CatalogEntryId;
  readonly destination: MarketplaceDestination;
  readonly listingPolicyId: string;
  readonly payloadVersion: string;
  readonly publishAfter?: Date;
  readonly retryPolicyId: string;
  readonly createdAt: Date;
  readonly schemaVersion: "1.0.0";
}

export interface MarketplaceListing {
  readonly id: MarketplaceListingId;
  readonly planId: PublicationPlanId;
  readonly catalogEntryId: CatalogEntryId;
  readonly destination: MarketplaceDestination;
  readonly externalListingId: string;
  readonly status: "active" | "inactive" | "failed" | "pending";
  readonly publishedAt: Date;
  readonly listingUrl?: string;
  readonly error?: string;
  readonly schemaVersion: "1.0.0";
}

export interface ListingPolicy {
  readonly id: string;
  readonly destination: MarketplaceDestination;
  readonly shouldPublish: (entry: CatalogEntry) => boolean;
  readonly transformPayload: (entry: CatalogEntry) => unknown;
}

export interface PublicationRetryPolicy {
  readonly id: string;
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

export interface MarketplacePublisher {
  readonly destination: MarketplaceDestination;
  publish(plan: PublicationPlan, payload: unknown): Promise<MarketplaceListing>;
}

export interface PublicationRepository {
  appendPlan(plan: PublicationPlan): Promise<PublicationPlan>;
  appendListing(listing: MarketplaceListing): Promise<MarketplaceListing>;
  findPlan(id: PublicationPlanId): Promise<PublicationPlan | null>;
  findListing(id: MarketplaceListingId): Promise<MarketplaceListing | null>;
  findListingsByDestination(
    destination: MarketplaceDestination
  ): Promise<ReadonlyArray<MarketplaceListing>>;
  readonly planCount: number;
  readonly listingCount: number;
}

export interface PublicationCoordinatorInput {
  readonly batchId: string;
  readonly catalogEntries: ReadonlyArray<CatalogEntry>;
  readonly destinations: ReadonlyArray<MarketplaceDestination>;
}

export interface PublicationCoordinatorResult {
  readonly plans: ReadonlyArray<PublicationPlan>;
  readonly listings: ReadonlyArray<MarketplaceListing>;
  readonly metrics: PublicationMetrics;
  readonly durationMs: number;
}

export interface PublicationMetrics {
  readonly plansCreated: number;
  readonly listingsPublished: number;
  readonly listingsFailed: number;
  readonly durationMs: number;
}

export type { CatalogEntryId, CatalogEntry };
