/**
 * @workspace/domain/discovery/resolution/repository
 *
 * In-memory ResolutionRepository. Append-only.
 */
import type {
  ResolutionRepository,
  CanonicalIdentity,
  ConflictRecord,
  CanonicalProduct,
  CanonicalIdentityId,
  CanonicalProductId,
  SimilarityClusterId,
  ResolutionStreamFilter
} from "./types";

class InMemoryResolutionRepository implements ResolutionRepository {
  private readonly identitiesById = new Map<string, CanonicalIdentity>();
  private readonly identitiesByCluster = new Map<string, CanonicalIdentity>();
  private readonly conflictsById = new Map<string, ConflictRecord>();
  private readonly conflictsByCluster = new Map<string, ConflictRecord[]>();
  private readonly productsById = new Map<string, CanonicalProduct>();
  private readonly productsByIdentity = new Map<string, CanonicalProduct>();

  async appendIdentity(identity: CanonicalIdentity): Promise<CanonicalIdentity> {
    if (this.identitiesById.has(identity.id)) return this.identitiesById.get(identity.id)!;
    this.identitiesById.set(identity.id, identity);
    this.identitiesByCluster.set(identity.clusterId, identity);
    return identity;
  }

  async appendConflict(conflict: ConflictRecord): Promise<ConflictRecord> {
    if (this.conflictsById.has(conflict.id)) return this.conflictsById.get(conflict.id)!;
    this.conflictsById.set(conflict.id, conflict);
    const list = this.conflictsByCluster.get(conflict.clusterId) ?? [];
    list.push(conflict);
    this.conflictsByCluster.set(conflict.clusterId, list);
    return conflict;
  }

  async appendCanonicalProduct(product: CanonicalProduct): Promise<CanonicalProduct> {
    if (this.productsById.has(product.id)) return this.productsById.get(product.id)!;
    this.productsById.set(product.id, product);
    this.productsByIdentity.set(product.identityId, product);
    return product;
  }

  async findIdentity(id: CanonicalIdentityId): Promise<CanonicalIdentity | null> {
    return this.identitiesById.get(id) ?? null;
  }

  async findIdentityByCluster(clusterId: SimilarityClusterId): Promise<CanonicalIdentity | null> {
    return this.identitiesByCluster.get(clusterId) ?? null;
  }

  async findConflictsByCluster(
    clusterId: SimilarityClusterId
  ): Promise<ReadonlyArray<ConflictRecord>> {
    return this.conflictsByCluster.get(clusterId) ?? [];
  }

  async findCanonicalProduct(id: CanonicalProductId): Promise<CanonicalProduct | null> {
    return this.productsById.get(id) ?? null;
  }

  async findCanonicalProductByIdentity(
    identityId: CanonicalIdentityId
  ): Promise<CanonicalProduct | null> {
    return this.productsByIdentity.get(identityId) ?? null;
  }

  async *streamIdentities(filter?: ResolutionStreamFilter): AsyncIterable<CanonicalIdentity> {
    for (const id of this.identitiesById.values()) {
      if (filter?.batchId && id.batchId !== filter.batchId) continue;
      if (filter?.clusterId && id.clusterId !== filter.clusterId) continue;
      yield id;
    }
  }

  async *streamConflicts(filter?: ResolutionStreamFilter): AsyncIterable<ConflictRecord> {
    for (const c of this.conflictsById.values()) {
      if (filter?.batchId && c.batchId !== filter.batchId) continue;
      if (filter?.clusterId && c.clusterId !== filter.clusterId) continue;
      yield c;
    }
  }

  get identityCount(): number {
    return this.identitiesById.size;
  }
  get conflictCount(): number {
    return this.conflictsById.size;
  }
  get canonicalProductCount(): number {
    return this.productsById.size;
  }

  clear(): void {
    this.identitiesById.clear();
    this.identitiesByCluster.clear();
    this.conflictsById.clear();
    this.conflictsByCluster.clear();
    this.productsById.clear();
    this.productsByIdentity.clear();
  }
}

export function createResolutionRepository(): ResolutionRepository {
  return new InMemoryResolutionRepository();
}
