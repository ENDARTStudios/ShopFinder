/**
 * @workspace/domain/discovery/marketplace-publication/publisher
 *
 * Default MarketplacePublisher implementations for each destination.
 * Each publisher receives a PublicationPlan + transformed payload,
 * calls the marketplace API, and returns a MarketplaceListing.
 */
import type {
  MarketplacePublisher,
  MarketplaceListing,
  MarketplaceListingId,
  PublicationPlan,
  MarketplaceDestination
} from "./types";

export class StubMarketplacePublisher implements MarketplacePublisher {
  constructor(readonly destination: MarketplaceDestination) {}

  async publish(plan: PublicationPlan, _payload: unknown): Promise<MarketplaceListing> {
    return {
      id: `listing_${plan.id}` as unknown as MarketplaceListingId,
      planId: plan.id,
      catalogEntryId: plan.catalogEntryId,
      destination: this.destination,
      externalListingId: `${this.destination}-${Date.now()}`,
      status: "active",
      publishedAt: new Date(),
      listingUrl: `https://${this.destination}.example.com/listings/${plan.catalogEntryId}`,
      schemaVersion: "1.0.0"
    };
  }
}

export function createMarketplacePublisher(
  destination: MarketplaceDestination
): MarketplacePublisher {
  return new StubMarketplacePublisher(destination);
}
