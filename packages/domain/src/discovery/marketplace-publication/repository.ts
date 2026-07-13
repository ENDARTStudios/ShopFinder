/**
 * @workspace/domain/discovery/marketplace-publication/repository
 */
import type {
  PublicationRepository,
  PublicationPlan,
  MarketplaceListing,
  PublicationPlanId,
  MarketplaceListingId,
  MarketplaceDestination
} from "./types";

class InMemoryPublicationRepository implements PublicationRepository {
  private readonly plansById = new Map<string, PublicationPlan>();
  private readonly listingsById = new Map<string, MarketplaceListing>();
  private readonly listingsByDestination = new Map<string, MarketplaceListing[]>();

  async appendPlan(plan: PublicationPlan): Promise<PublicationPlan> {
    if (this.plansById.has(plan.id)) return this.plansById.get(plan.id)!;
    this.plansById.set(plan.id, plan);
    return plan;
  }

  async appendListing(listing: MarketplaceListing): Promise<MarketplaceListing> {
    this.listingsById.set(listing.id, listing);
    const list = this.listingsByDestination.get(listing.destination) ?? [];
    list.push(listing);
    this.listingsByDestination.set(listing.destination, list);
    return listing;
  }

  async findPlan(id: PublicationPlanId): Promise<PublicationPlan | null> {
    return this.plansById.get(id) ?? null;
  }

  async findListing(id: MarketplaceListingId): Promise<MarketplaceListing | null> {
    return this.listingsById.get(id) ?? null;
  }

  async findListingsByDestination(
    destination: MarketplaceDestination
  ): Promise<ReadonlyArray<MarketplaceListing>> {
    return this.listingsByDestination.get(destination) ?? [];
  }

  get planCount(): number {
    return this.plansById.size;
  }
  get listingCount(): number {
    return this.listingsById.size;
  }
}

export function createPublicationRepository(): PublicationRepository {
  return new InMemoryPublicationRepository();
}
