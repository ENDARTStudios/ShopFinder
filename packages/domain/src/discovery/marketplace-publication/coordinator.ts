/**
 * @workspace/domain/discovery/marketplace-publication/coordinator
 *
 * PublicationCoordinator — orchestrates plan creation + publishing.
 *
 * Flow:
 *   For each CatalogEntry:
 *     1. PublicationPlanner.planAll(entry, destinations) → PublicationPlan[]
 *     2. For each plan:
 *        a. Apply ListingPolicy.transformPayload(entry) → payload
 *        b. MarketplacePublisher.publish(plan, payload) → MarketplaceListing
 *        c. Emit PlanCreated + ListingPublished (or ListingFailed)
 */
import type {
  PublicationCoordinatorInput,
  PublicationCoordinatorResult,
  PublicationMetrics,
  PublicationPlan,
  MarketplaceListing,
  ListingPolicy,
  MarketplacePublisher,
  MarketplaceDestination,
  PublicationRepository
} from "./types";
import { PublicationPlanner } from "./planner";
import {
  makePublicationPlanCreatedEvent,
  makeListingPublishedEvent,
  makeListingFailedEvent,
  type PublicationEvent
} from "./events";

export interface PublicationEventPublisher {
  publish(events: ReadonlyArray<PublicationEvent>): Promise<void>;
}

export interface PublicationCoordinatorDeps {
  readonly repository: PublicationRepository;
  readonly listingPolicies: ReadonlyMap<MarketplaceDestination, ListingPolicy>;
  readonly publishers: ReadonlyMap<MarketplaceDestination, MarketplacePublisher>;
  readonly events?: PublicationEventPublisher;
}

export class PublicationCoordinator {
  private readonly planner: PublicationPlanner;

  constructor(private readonly deps: PublicationCoordinatorDeps) {
    this.planner = new PublicationPlanner(deps.listingPolicies);
  }

  async process(input: PublicationCoordinatorInput): Promise<PublicationCoordinatorResult> {
    const start = Date.now();
    const plans: PublicationPlan[] = [];
    const listings: MarketplaceListing[] = [];
    let listingsFailed = 0;

    for (const entry of input.catalogEntries) {
      const entryPlans = this.planner.planAll(entry, input.destinations);

      for (const plan of entryPlans) {
        await this.deps.repository.appendPlan(plan);
        plans.push(plan);

        if (this.deps.events) {
          await this.deps.events.publish([
            makePublicationPlanCreatedEvent({
              planId: plan.id,
              catalogEntryId: plan.catalogEntryId,
              destination: plan.destination,
              listingPolicyId: plan.listingPolicyId
            })
          ]);
        }

        const policy = this.deps.listingPolicies.get(plan.destination);
        if (!policy) continue;
        const payload = policy.transformPayload(entry);
        const publisher = this.deps.publishers.get(plan.destination);
        if (!publisher) continue;

        try {
          const listing = await publisher.publish(plan, payload);
          await this.deps.repository.appendListing(listing);
          listings.push(listing);

          if (this.deps.events) {
            await this.deps.events.publish([
              makeListingPublishedEvent({
                listingId: listing.id,
                planId: plan.id,
                catalogEntryId: listing.catalogEntryId,
                destination: listing.destination,
                externalListingId: listing.externalListingId,
                listingUrl: listing.listingUrl
              })
            ]);
          }
        } catch (e) {
          listingsFailed++;
          if (this.deps.events) {
            await this.deps.events.publish([
              makeListingFailedEvent({
                planId: plan.id,
                destination: plan.destination,
                error: e instanceof Error ? e.message : String(e)
              })
            ]);
          }
        }
      }
    }

    const metrics: PublicationMetrics = {
      plansCreated: plans.length,
      listingsPublished: listings.length,
      listingsFailed,
      durationMs: Date.now() - start
    };

    return { plans, listings, metrics, durationMs: Date.now() - start };
  }
}

export function createPublicationCoordinator(
  deps: PublicationCoordinatorDeps
): PublicationCoordinator {
  return new PublicationCoordinator(deps);
}
