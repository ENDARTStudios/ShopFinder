/**
 * @workspace/domain/discovery/similarity/types
 *
 * Type contracts for Product Similarity & Duplicate Detection (A2.6).
 *
 * Design principles (per architectural review):
 *   R6.  SimilarityEvidence — per-dimension scores (title/brand/image/attribute/price)
 *   R7.  SimilarityPolicy — configurable thresholds (never hardcoded)
 *   R8.  Candidate Cluster — A→Cluster→[A,B,C,D], not just pairs
 *   R9.  Similarity Metrics — pairsCompared, pairsRejected, clustersCreated, etc.
 *   R10. A2.6 discovers only, never resolves (A2.7 resolves)
 *
 * Roadmap adjustment: Duplicate Resolution (A2.7) comes BEFORE AI Evaluation (A2.8).
 * The IA evaluates only the canonical product, not each duplicate offer.
 */
import type { BrandedId } from "../../shared";
import type { NormalizedProductRecord, NormalizedProductRecordId } from "../normalizer/types";

// ── Branded IDs ────────────────────────────────────────────

export type DuplicateCandidateId = BrandedId<"DuplicateCandidateId">;
export type SimilarityClusterId = BrandedId<"SimilarityClusterId">;
export type SimilarityBatchId = BrandedId<"SimilarityBatchId">;

// ── SimilarityEvidence (R6) ────────────────────────────────

/**
 * Per-dimension similarity scores. Enables explainable decisions:
 * "these two products are 93% title-similar, 100% brand-similar,
 * 97% image-similar, 88% attribute-similar, 74% price-similar."
 */
export interface SimilarityEvidence {
  readonly titleSimilarity: number; // 0-1
  readonly brandSimilarity: number; // 0-1
  readonly imageSimilarity: number; // 0-1
  readonly attributeSimilarity: number; // 0-1
  readonly priceSimilarity: number; // 0-1
  readonly overallSimilarity: number; // 0-1, weighted average
  readonly weights: Readonly<SimilarityWeights>;
  readonly explanation: string; // human-readable
}

export interface SimilarityWeights {
  readonly title: number;
  readonly brand: number;
  readonly image: number;
  readonly attribute: number;
  readonly price: number;
}

export const DefaultSimilarityWeights: SimilarityWeights = {
  title: 0.3,
  brand: 0.2,
  image: 0.25,
  attribute: 0.15,
  price: 0.1
};

// ── DuplicateCandidate (R10: discover only, don't resolve) ──

export type CandidateStatus = "pending" | "confirmed" | "rejected" | "merged";

export interface DuplicateCandidate {
  readonly id: DuplicateCandidateId;
  readonly productAId: NormalizedProductRecordId;
  readonly productBId: NormalizedProductRecordId;
  readonly evidence: SimilarityEvidence;
  readonly status: CandidateStatus;
  readonly createdAt: Date;
  readonly batchId: SimilarityBatchId;
}

// ── SimilarityCluster (R8: not just pairs) ─────────────────

export interface SimilarityCluster {
  readonly id: SimilarityClusterId;
  readonly memberIds: ReadonlyArray<NormalizedProductRecordId>;
  readonly evidence: SimilarityEvidence; // average evidence across members
  readonly candidateIds: ReadonlyArray<DuplicateCandidateId>; // candidates that formed this cluster
  readonly createdAt: Date;
  readonly batchId: SimilarityBatchId;
  readonly memberCount: number;
}

// ── SimilarityPolicy (R7: configurable thresholds) ─────────

export interface SimilarityPolicy {
  readonly minimumTitleSimilarity: number;
  readonly minimumBrandSimilarity: number;
  readonly minimumImageSimilarity: number;
  readonly minimumOverallSimilarity: number;
  readonly weights: SimilarityWeights;
  /** Hamming distance threshold for image fingerprint matching (0 = identical). */
  readonly maxImageHammingDistance: number;
}

export const DefaultSimilarityPolicy: SimilarityPolicy = {
  minimumTitleSimilarity: 0.8,
  minimumBrandSimilarity: 0.9,
  minimumImageSimilarity: 0.85,
  minimumOverallSimilarity: 0.85,
  weights: DefaultSimilarityWeights,
  maxImageHammingDistance: 5
};

// ── Similarity Metrics (R9) ────────────────────────────────

export interface SimilarityMetrics {
  readonly pairsCompared: number;
  readonly pairsRejected: number;
  readonly candidatesCreated: number;
  readonly clustersCreated: number;
  readonly averageSimilarity: number;
  readonly averageImageSimilarity: number;
  readonly averageTitleSimilarity: number;
  readonly duplicatesDetected: number;
  readonly durationMs: number;
}

// ── Similarity Algorithm ───────────────────────────────────

export interface SimilarityAlgorithm {
  readonly name: string;
  compareTitle(a: string, b: string): number;
  compareBrand(
    a: string,
    b: string,
    canonicalA?: string | null,
    canonicalB?: string | null
  ): number;
  compareImages(
    a: ReadonlyArray<{ fingerprint: { value: string; algorithm: string } }>,
    b: ReadonlyArray<{ fingerprint: { value: string; algorithm: string } }>
  ): number;
  compareAttributes(
    a: ReadonlyArray<{ name: string; value: string }>,
    b: ReadonlyArray<{ name: string; value: string }>
  ): number;
  comparePrice(a: { band: string }, b: { band: string }): number;
}

// ── Repository ─────────────────────────────────────────────

export interface SimilarityRepository {
  appendCandidate(candidate: DuplicateCandidate): Promise<DuplicateCandidate>;
  appendCluster(cluster: SimilarityCluster): Promise<SimilarityCluster>;
  findCandidatesByProduct(
    productId: NormalizedProductRecordId
  ): Promise<ReadonlyArray<DuplicateCandidate>>;
  findCluster(clusterId: SimilarityClusterId): Promise<SimilarityCluster | null>;
  findClustersByMember(
    productId: NormalizedProductRecordId
  ): Promise<ReadonlyArray<SimilarityCluster>>;
  streamCandidates(filter?: SimilarityStreamFilter): AsyncIterable<DuplicateCandidate>;
  streamClusters(filter?: SimilarityStreamFilter): AsyncIterable<SimilarityCluster>;
  readonly candidateCount: number;
  readonly clusterCount: number;
}

export interface SimilarityStreamFilter {
  readonly batchId?: SimilarityBatchId;
  readonly productId?: NormalizedProductRecordId;
  readonly status?: CandidateStatus;
}

// ── Coordinator ────────────────────────────────────────────

export interface SimilarityCoordinatorInput {
  readonly batchId: string;
  readonly products: ReadonlyArray<NormalizedProductRecord>;
  readonly policy: SimilarityPolicy;
}

export interface SimilarityCoordinatorResult {
  readonly batchId: SimilarityBatchId;
  readonly candidates: ReadonlyArray<DuplicateCandidate>;
  readonly clusters: ReadonlyArray<SimilarityCluster>;
  readonly metrics: SimilarityMetrics;
  readonly durationMs: number;
}

export type { NormalizedProductRecord, NormalizedProductRecordId };
