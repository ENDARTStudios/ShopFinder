/**
 * @workspace/domain/discovery/similarity/repository
 *
 * In-memory SimilarityRepository. Append-only.
 * Indexed by:
 *   - candidate id
 *   - product id (reverse lookup: which candidates involve this product?)
 *   - cluster id
 *   - cluster member ids (reverse lookup)
 */
import type {
  SimilarityRepository,
  DuplicateCandidate,
  SimilarityCluster,
  DuplicateCandidateId,
  SimilarityClusterId,
  SimilarityStreamFilter,
  NormalizedProductRecordId
} from "./types";

class InMemorySimilarityRepository implements SimilarityRepository {
  private readonly candidatesById = new Map<string, DuplicateCandidate>();
  private readonly candidatesByProduct = new Map<string, DuplicateCandidate[]>();
  private readonly clustersById = new Map<string, SimilarityCluster>();
  private readonly clustersByMember = new Map<string, SimilarityCluster[]>();

  async appendCandidate(candidate: DuplicateCandidate): Promise<DuplicateCandidate> {
    if (this.candidatesById.has(candidate.id)) return this.candidatesById.get(candidate.id)!;
    this.candidatesById.set(candidate.id, candidate);

    for (const pid of [candidate.productAId, candidate.productBId]) {
      const list = this.candidatesByProduct.get(pid) ?? [];
      list.push(candidate);
      this.candidatesByProduct.set(pid, list);
    }
    return candidate;
  }

  async appendCluster(cluster: SimilarityCluster): Promise<SimilarityCluster> {
    if (this.clustersById.has(cluster.id)) return this.clustersById.get(cluster.id)!;
    this.clustersById.set(cluster.id, cluster);

    for (const pid of cluster.memberIds) {
      const list = this.clustersByMember.get(pid) ?? [];
      list.push(cluster);
      this.clustersByMember.set(pid, list);
    }
    return cluster;
  }

  async findCandidatesByProduct(
    productId: NormalizedProductRecordId
  ): Promise<ReadonlyArray<DuplicateCandidate>> {
    return this.candidatesByProduct.get(productId) ?? [];
  }

  async findCluster(clusterId: SimilarityClusterId): Promise<SimilarityCluster | null> {
    return this.clustersById.get(clusterId) ?? null;
  }

  async findClustersByMember(
    productId: NormalizedProductRecordId
  ): Promise<ReadonlyArray<SimilarityCluster>> {
    return this.clustersByMember.get(productId) ?? [];
  }

  async *streamCandidates(filter?: SimilarityStreamFilter): AsyncIterable<DuplicateCandidate> {
    for (const c of this.candidatesById.values()) {
      if (filter?.batchId && c.batchId !== filter.batchId) continue;
      if (
        filter?.productId &&
        c.productAId !== filter.productId &&
        c.productBId !== filter.productId
      )
        continue;
      if (filter?.status && c.status !== filter.status) continue;
      yield c;
    }
  }

  async *streamClusters(filter?: SimilarityStreamFilter): AsyncIterable<SimilarityCluster> {
    for (const c of this.clustersById.values()) {
      if (filter?.batchId && c.batchId !== filter.batchId) continue;
      if (filter?.productId && !c.memberIds.includes(filter.productId)) continue;
      yield c;
    }
  }

  get candidateCount(): number {
    return this.candidatesById.size;
  }
  get clusterCount(): number {
    return this.clustersById.size;
  }

  clear(): void {
    this.candidatesById.clear();
    this.candidatesByProduct.clear();
    this.clustersById.clear();
    this.clustersByMember.clear();
  }
}

export function createSimilarityRepository(): SimilarityRepository {
  return new InMemorySimilarityRepository();
}
