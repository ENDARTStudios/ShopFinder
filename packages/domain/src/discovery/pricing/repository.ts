/**
 * @workspace/domain/discovery/pricing/repository
 */
import type {
  PricingRepository,
  PricingSnapshot,
  PriceDecision,
  PricingSnapshotId,
  PriceDecisionId,
  CatalogEntryId
} from "./types";

class InMemoryPricingRepository implements PricingRepository {
  private readonly snapshotsById = new Map<string, PricingSnapshot>();
  private readonly decisionsById = new Map<string, PriceDecision>();
  private readonly decisionsByProduct = new Map<string, PriceDecision[]>();

  async appendSnapshot(snapshot: PricingSnapshot): Promise<PricingSnapshot> {
    this.snapshotsById.set(snapshot.id, snapshot);
    return snapshot;
  }

  async appendDecision(decision: PriceDecision): Promise<PriceDecision> {
    this.decisionsById.set(decision.id, decision);
    const list = this.decisionsByProduct.get(decision.catalogEntryId) ?? [];
    list.push(decision);
    this.decisionsByProduct.set(decision.catalogEntryId, list);
    return decision;
  }

  async findSnapshot(id: PricingSnapshotId): Promise<PricingSnapshot | null> {
    return this.snapshotsById.get(id) ?? null;
  }

  async findDecision(id: PriceDecisionId): Promise<PriceDecision | null> {
    return this.decisionsById.get(id) ?? null;
  }

  async findDecisionsByProduct(productId: CatalogEntryId): Promise<ReadonlyArray<PriceDecision>> {
    return this.decisionsByProduct.get(productId) ?? [];
  }

  get snapshotCount(): number {
    return this.snapshotsById.size;
  }
  get decisionCount(): number {
    return this.decisionsById.size;
  }
}

export function createPricingRepository(): PricingRepository {
  return new InMemoryPricingRepository();
}
