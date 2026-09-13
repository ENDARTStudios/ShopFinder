/**
 * @workspace/domain/discovery/similarity/clustering
 *
 * Cluster formation (R8): groups DuplicateCandidates into clusters.
 *
 * Instead of just pairs (A↔B), we form clusters (A,B,C,D) because in
 * the real world the same product appears across dozens of suppliers.
 *
 * Algorithm: Union-Find (disjoint set) on candidate pairs.
 *   - Each candidate (A, B) merges A and B into the same set.
 *   - After processing all candidates, each set becomes a cluster.
 */
import type {
  DuplicateCandidate,
  DuplicateCandidateId,
  SimilarityCluster,
  SimilarityClusterId,
  SimilarityBatchId,
  NormalizedProductRecordId,
  SimilarityEvidence
} from "./types";

/**
 * Union-Find data structure for clustering product IDs.
 */
class UnionFind {
  private parent = new Map<string, string>();
  private rank = new Map<string, number>();

  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
    let root = x;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    // Path compression
    let curr = x;
    while (this.parent.get(curr) !== root) {
      const next = this.parent.get(curr)!;
      this.parent.set(curr, root);
      curr = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    const rankA = this.rank.get(ra) ?? 0;
    const rankB = this.rank.get(rb) ?? 0;
    if (rankA < rankB) {
      this.parent.set(ra, rb);
    } else if (rankA > rankB) {
      this.parent.set(rb, ra);
    } else {
      this.parent.set(rb, ra);
      this.rank.set(ra, rankA + 1);
    }
  }

  /** Get all clusters as arrays of member IDs. */
  getClusters(): ReadonlyArray<ReadonlyArray<string>> {
    const clusters = new Map<string, string[]>();
    for (const [member, _] of this.parent) {
      const root = this.find(member);
      const list = clusters.get(root) ?? [];
      list.push(member);
      clusters.set(root, list);
    }
    return [...clusters.values()].filter((c) => c.length > 1);
  }
}

/**
 * Form clusters from a list of duplicate candidates.
 * Only clusters with 2+ members are returned (singletons aren't clusters).
 */
export function formClusters(
  candidates: ReadonlyArray<DuplicateCandidate>,
  batchId: SimilarityBatchId,
  now: Date = new Date()
): ReadonlyArray<SimilarityCluster> {
  const uf = new UnionFind();
  const candidateByPair = new Map<string, DuplicateCandidate>();

  // Union all candidate pairs
  for (const c of candidates) {
    uf.union(c.productAId, c.productBId);
    const pairKey = [c.productAId, c.productBId].sort().join("|");
    candidateByPair.set(pairKey, c);
  }

  // Extract clusters
  const clusters = uf.getClusters();
  const result: SimilarityCluster[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const members = clusters[i]!;
    const memberSet = new Set(members);

    // Find all candidates that involve members of this cluster
    const clusterCandidateIds: DuplicateCandidateId[] = [];
    const evidences: SimilarityEvidence[] = [];

    for (const c of candidates) {
      if (memberSet.has(c.productAId) && memberSet.has(c.productBId)) {
        clusterCandidateIds.push(c.id);
        evidences.push(c.evidence);
      }
    }

    // Compute average evidence
    const avgEvidence = averageEvidence(evidences);

    const clusterId =
      `cluster_${batchId}_${i.toString().padStart(4, "0")}` as unknown as SimilarityClusterId;
    result.push({
      id: clusterId,
      memberIds: members as ReadonlyArray<NormalizedProductRecordId>,
      evidence: avgEvidence,
      candidateIds: clusterCandidateIds,
      createdAt: now,
      batchId,
      memberCount: members.length
    });
  }

  return result;
}

function averageEvidence(evidences: ReadonlyArray<SimilarityEvidence>): SimilarityEvidence {
  if (evidences.length === 0) {
    return {
      titleSimilarity: 0,
      brandSimilarity: 0,
      imageSimilarity: 0,
      attributeSimilarity: 0,
      priceSimilarity: 0,
      overallSimilarity: 0,
      weights: evidences[0]?.weights ?? {
        title: 0.3,
        brand: 0.2,
        image: 0.25,
        attribute: 0.15,
        price: 0.1
      },
      explanation: "no evidence"
    };
  }

  const n = evidences.length;
  const sum = evidences.reduce(
    (acc, e) => ({
      title: acc.title + e.titleSimilarity,
      brand: acc.brand + e.brandSimilarity,
      image: acc.image + e.imageSimilarity,
      attribute: acc.attribute + e.attributeSimilarity,
      price: acc.price + e.priceSimilarity,
      overall: acc.overall + e.overallSimilarity
    }),
    { title: 0, brand: 0, image: 0, attribute: 0, price: 0, overall: 0 }
  );

  return {
    titleSimilarity: sum.title / n,
    brandSimilarity: sum.brand / n,
    imageSimilarity: sum.image / n,
    attributeSimilarity: sum.attribute / n,
    priceSimilarity: sum.price / n,
    overallSimilarity: sum.overall / n,
    weights: evidences[0]!.weights,
    explanation: `cluster average of ${n} pairs (overall=${(sum.overall / n).toFixed(2)})`
  };
}
