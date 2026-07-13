/**
 * @workspace/domain/discovery/marketplace-publication/planner
 *
 * PublicationPlanner — creates PublicationPlans from CatalogEntries.
 * One plan per (catalogEntry × destination) pair.
 */
import type {
  PublicationPlan,
  PublicationPlanId,
  MarketplaceDestination,
  CatalogEntry,
  ListingPolicy
} from "./types";

export class PublicationPlanner {
  constructor(
    private readonly listingPolicies: ReadonlyMap<MarketplaceDestination, ListingPolicy>
  ) {}

  plan(entry: CatalogEntry, destination: MarketplaceDestination): PublicationPlan | null {
    const policy = this.listingPolicies.get(destination);
    if (!policy || !policy.shouldPublish(entry)) return null;

    return {
      id: `plan_${entry.id}_${destination}` as unknown as PublicationPlanId,
      catalogEntryId: entry.id,
      destination,
      listingPolicyId: policy.id,
      payloadVersion: entry.schemaVersion,
      retryPolicyId: "default-retry-v1",
      createdAt: new Date(),
      schemaVersion: "1.0.0"
    };
  }

  planAll(
    entry: CatalogEntry,
    destinations: ReadonlyArray<MarketplaceDestination>
  ): ReadonlyArray<PublicationPlan> {
    const plans: PublicationPlan[] = [];
    for (const dest of destinations) {
      const plan = this.plan(entry, dest);
      if (plan) plans.push(plan);
    }
    return plans;
  }
}

export function createPublicationPlanner(
  policies: ReadonlyMap<MarketplaceDestination, ListingPolicy>
): PublicationPlanner {
  return new PublicationPlanner(policies);
}
