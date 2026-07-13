/**
 * @workspace/domain/discovery/resolution/types
 *
 * Type contracts for Duplicate Resolution (A2.7).
 *
 * Design principle (per architectural review):
 *   Resolution answers ONLY "which records represent the same entity?"
 *   It does NOT answer "what should the canonical product look like?"
 *
 * That separation prevents Resolution from knowing catalog details.
 * The CanonicalBuilder (separate module) materializes the CanonicalProduct
 * from the CanonicalIdentity + supplier offers.
 *
 * 5 contracts:
 *   1. CanonicalIdentity   — consolidated identity (id + members + primary)
 *   2. ResolutionEvidence  — explainability (which source for each field)
 *   3. ResolutionPolicy    — swappable strategy (HighestConfidence, etc.)
 *   4. ConflictRecord      — clusters that can't be auto-resolved
 *   5. CanonicalBuilder    — materializes CanonicalProduct from identity
 */
import type { BrandedId } from "../../shared";
import type { NormalizedProductRecord, NormalizedProductRecordId } from "../normalizer/types";
import type { SimilarityCluster, SimilarityClusterId } from "../similarity/types";
import type { Money } from "../../shared";

// ── Branded IDs ────────────────────────────────────────────

export type CanonicalProductId = BrandedId<"CanonicalProductId">;
export type CanonicalIdentityId = BrandedId<"CanonicalIdentityId">;
export type ConflictRecordId = BrandedId<"ConflictRecordId">;
export type ResolutionBatchId = BrandedId<"ResolutionBatchId">;

// ── 1. CanonicalIdentity ───────────────────────────────────

/**
 * Represents ONLY the consolidated identity — which NormalizedProductRecords
 * are the same entity, and which is primary. Does NOT contain catalog fields
 * (title, price, images) — those are materialized by the CanonicalBuilder.
 */
export interface CanonicalIdentity {
  readonly id: CanonicalIdentityId;
  readonly canonicalProductId: CanonicalProductId;
  readonly clusterId: SimilarityClusterId;
  readonly normalizedProductIds: ReadonlyArray<NormalizedProductRecordId>;
  readonly primaryProductId: NormalizedProductRecordId;
  readonly resolutionStrategy: string;
  readonly confidence: number;
  readonly evidence: ResolutionEvidence;
  readonly createdAt: Date;
  readonly batchId: ResolutionBatchId;
  readonly schemaVersion: "1.0.0";
}

// ── 2. ResolutionEvidence ──────────────────────────────────

/**
 * Explainability for the resolution decision.
 * Records WHICH NormalizedProductRecord was used as the source for each
 * canonical field, and WHY the primary offer was chosen.
 */
export interface ResolutionEvidence {
  /** Which product ID provided the title (e.g. highest confidence title). */
  readonly titleSource: NormalizedProductRecordId;
  /** Which product ID provided the primary image. */
  readonly imageSource: NormalizedProductRecordId;
  /** Which product ID provided the brand. */
  readonly brandSource: NormalizedProductRecordId;
  /** Which product ID provided the category. */
  readonly categorySource: NormalizedProductRecordId;
  /** Which product ID provided each canonical attribute (by attribute name). */
  readonly attributeSources: Readonly<Record<string, NormalizedProductRecordId>>;
  /** Human-readable reason why the primary offer was chosen. */
  readonly primaryOfferReason: string;
  /** Overall resolution confidence (0-1). */
  readonly confidence: number;
}

// ── 3. ResolutionPolicy ────────────────────────────────────

/**
 * Swappable strategy for choosing the primary product from a cluster.
 * Implementations:
 *   - HighestConfidence: pick the NormalizedProductRecord with the highest
 *     confidenceScore from the normalizer.
 *   - BestMarketplace: prefer records from a configured marketplace ranking.
 *   - HighestCompleteness: pick the record with the most non-empty fields.
 *   - LowestPrice: pick the record with the lowest price.
 *   - WeightedHybrid: weighted combination of the above.
 */
export interface ResolutionPolicy {
  readonly name: string;
  resolve(
    cluster: SimilarityCluster,
    products: ReadonlyMap<NormalizedProductRecordId, NormalizedProductRecord>
  ): {
    primaryProductId: NormalizedProductRecordId;
    reason: string;
    confidence: number;
  };
}

// ── 4. ConflictRecord ──────────────────────────────────────

export type ConflictReason =
  | "DIFFERENT_SIZES"
  | "DIFFERENT_MODELS"
  | "CONFLICTING_BRANDS"
  | "INCOMPATIBLE_CATEGORIES"
  | "PRICE_OUTLIER"
  | "LOW_SIMILARITY"
  | "MANUAL_REVIEW_REQUIRED";

export interface ConflictRecord {
  readonly id: ConflictRecordId;
  readonly clusterId: SimilarityClusterId;
  readonly reason: ConflictReason;
  readonly candidates: ReadonlyArray<NormalizedProductRecordId>;
  readonly details: string;
  readonly createdAt: Date;
  readonly batchId: ResolutionBatchId;
  readonly resolved: boolean;
  readonly resolvedAt?: Date;
  readonly resolvedBy?: "auto" | "human";
}

// ── 5. CanonicalProduct (built by CanonicalBuilder) ────────

/**
 * The materialized canonical product. Built by CanonicalBuilder AFTER
 * CanonicalIdentity is resolved. Contains the actual catalog fields
 * (title, brand, images, attributes, price) sourced from the primary
 * and enriched from other members.
 */
export interface CanonicalProduct {
  readonly id: CanonicalProductId;
  readonly identityId: CanonicalIdentityId;
  readonly clusterId: SimilarityClusterId;
  readonly title: string;
  readonly brand: string;
  readonly canonicalBrandId: string | null;
  readonly category: string;
  readonly canonicalCategoryId: string | null;
  readonly attributes: ReadonlyArray<{
    name: string;
    value: string;
    confidence: number;
    sourceProductId: NormalizedProductRecordId;
  }>;
  readonly images: ReadonlyArray<{
    url: string;
    fingerprint: { algorithm: string; version: string; value: string };
    sourceProductId: NormalizedProductRecordId;
  }>;
  readonly priceRange: {
    readonly min: Money;
    readonly max: Money;
    readonly currency: string;
  };
  readonly offerCount: number;
  readonly supplierCodes: ReadonlyArray<string>;
  readonly primaryProductId: NormalizedProductRecordId;
  readonly builtAt: Date;
  readonly schemaVersion: "1.0.0";
}

export interface CanonicalBuilder {
  readonly name: string;
  build(
    identity: CanonicalIdentity,
    products: ReadonlyMap<NormalizedProductRecordId, NormalizedProductRecord>
  ): CanonicalProduct;
}

// ── Repository ─────────────────────────────────────────────

export interface ResolutionRepository {
  appendIdentity(identity: CanonicalIdentity): Promise<CanonicalIdentity>;
  appendConflict(conflict: ConflictRecord): Promise<ConflictRecord>;
  appendCanonicalProduct(product: CanonicalProduct): Promise<CanonicalProduct>;
  findIdentity(id: CanonicalIdentityId): Promise<CanonicalIdentity | null>;
  findIdentityByCluster(clusterId: SimilarityClusterId): Promise<CanonicalIdentity | null>;
  findConflictsByCluster(clusterId: SimilarityClusterId): Promise<ReadonlyArray<ConflictRecord>>;
  findCanonicalProduct(id: CanonicalProductId): Promise<CanonicalProduct | null>;
  findCanonicalProductByIdentity(identityId: CanonicalIdentityId): Promise<CanonicalProduct | null>;
  streamIdentities(filter?: ResolutionStreamFilter): AsyncIterable<CanonicalIdentity>;
  streamConflicts(filter?: ResolutionStreamFilter): AsyncIterable<ConflictRecord>;
  readonly identityCount: number;
  readonly conflictCount: number;
  readonly canonicalProductCount: number;
}

export interface ResolutionStreamFilter {
  readonly batchId?: ResolutionBatchId;
  readonly clusterId?: SimilarityClusterId;
}

// ── Coordinator ────────────────────────────────────────────

export interface ResolutionCoordinatorInput {
  readonly batchId: string;
  readonly clusters: ReadonlyArray<SimilarityCluster>;
  readonly products: ReadonlyMap<NormalizedProductRecordId, NormalizedProductRecord>;
  readonly policy: ResolutionPolicy;
}

export interface ResolutionCoordinatorResult {
  readonly batchId: ResolutionBatchId;
  readonly identities: ReadonlyArray<CanonicalIdentity>;
  readonly conflicts: ReadonlyArray<ConflictRecord>;
  readonly canonicalProducts: ReadonlyArray<CanonicalProduct>;
  readonly metrics: ResolutionMetrics;
  readonly durationMs: number;
}

export interface ResolutionMetrics {
  readonly clustersProcessed: number;
  readonly identitiesCreated: number;
  readonly conflictsDetected: number;
  readonly canonicalProductsBuilt: number;
  readonly averageConfidence: number;
  readonly durationMs: number;
}

export type {
  NormalizedProductRecord,
  NormalizedProductRecordId,
  SimilarityCluster,
  SimilarityClusterId,
  Money
};
