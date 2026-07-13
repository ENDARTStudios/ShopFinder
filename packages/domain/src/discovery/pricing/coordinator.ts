/**
 * @workspace/domain/discovery/pricing/coordinator
 *
 * PricingCoordinator — captures snapshots and makes price decisions.
 * CatalogEntry stays immutable; PriceDecision is a separate artifact.
 */
import type {
  PricingCoordinatorInput,
  PricingCoordinatorResult,
  PricingMetrics,
  PricingSnapshot,
  PriceDecision,
  PricingPolicy,
  PricingRepository
} from "./types";
import { captureSnapshot } from "./snapshot";
import {
  makePricingSnapshotCapturedEvent,
  makePriceDecisionMadeEvent,
  type PricingEvent
} from "./events";

export interface PricingEventPublisher {
  publish(events: ReadonlyArray<PricingEvent>): Promise<void>;
}

export interface PricingCoordinatorDeps {
  readonly repository: PricingRepository;
  readonly policy: PricingPolicy;
  readonly events?: PricingEventPublisher;
}

export class PricingCoordinator {
  constructor(private readonly deps: PricingCoordinatorDeps) {}

  async price(input: PricingCoordinatorInput): Promise<PricingCoordinatorResult> {
    const start = Date.now();
    const snapshots: PricingSnapshot[] = [];
    const decisions: PriceDecision[] = [];
    let totalMargin = 0;
    let promoCount = 0;
    let repricingCount = 0;

    for (const entry of input.catalogEntries) {
      // 1. Capture snapshot
      const snapshot = captureSnapshot(entry);
      await this.deps.repository.appendSnapshot(snapshot);
      snapshots.push(snapshot);

      if (this.deps.events) {
        await this.deps.events.publish([
          makePricingSnapshotCapturedEvent({
            snapshotId: snapshot.id,
            catalogEntryId: entry.id,
            basePrice: { amount: snapshot.basePrice.amount, currency: snapshot.basePrice.currency },
            competitorCount: snapshot.competitorPrices.length
          })
        ]);
      }

      // 2. Make decision
      const decision = this.deps.policy.decide(snapshot, entry);
      await this.deps.repository.appendDecision(decision);
      decisions.push(decision);
      totalMargin += decision.marginPercent;

      if (decision.decisionType === "promo") promoCount++;
      if (decision.decisionType === "repricing") repricingCount++;

      if (this.deps.events) {
        await this.deps.events.publish([
          makePriceDecisionMadeEvent({
            decisionId: decision.id,
            snapshotId: snapshot.id,
            catalogEntryId: entry.id,
            finalPrice: {
              amount: decision.finalPrice.amount,
              currency: decision.finalPrice.currency
            },
            decisionType: decision.decisionType,
            marginPercent: decision.marginPercent,
            policyId: decision.policyId
          })
        ]);
      }
    }

    const metrics: PricingMetrics = {
      snapshotsCaptured: snapshots.length,
      decisionsMade: decisions.length,
      averageMarginPercent: decisions.length > 0 ? totalMargin / decisions.length : 0,
      promoCount,
      repricingCount,
      durationMs: Date.now() - start
    };

    return { snapshots, decisions, metrics, durationMs: Date.now() - start };
  }
}

export function createPricingCoordinator(deps: PricingCoordinatorDeps): PricingCoordinator {
  return new PricingCoordinator(deps);
}
