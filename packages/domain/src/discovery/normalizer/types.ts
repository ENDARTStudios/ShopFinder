/**
 * @workspace/domain/discovery/normalizer/types
 *
 * Type contracts for the Product Normalizer (A2.5).
 *
 * Design principles (per architectural review):
 *   1. Normalizer produces a NEW artifact (NormalizedProductRecord),
 *      never modifies RawProductRecord.
 *   2. semanticHash lives on NormalizedProductRecord, NOT on Raw.
 *   3. Full normalizer versioning: normalizerVersion, taxonomyVersion,
 *      attributeDictionaryVersion, translationModelVersion.
 *   4. Normalization in 7 stages: Title → Brand → Category → Attribute
 *      → Image → Price → SemanticHasher.
 *   5. CanonicalAttribute is marketplace-agnostic (COLOR, not AliExpressColor).
 *   6. Price is normalized to bands (0-10, 10-20, ...), not absolute.
 *   7. Image hashing uses Perceptual Hash (phash), not just SHA.
 *   8. Normalization metrics track quality (titlesNormalized, brandsResolved, etc.)
 *   9. 4 events: NormalizationStarted, NormalizationCompleted,
 *      NormalizedProductsCreated, SemanticHashesGenerated.
 *  10. ProductNormalizer.normalize(record: RawProductRecord) accepts the
 *      full record (provider, execution, versions, country, language, snapshot).
 */
import type { BrandedId } from "../../shared";
import type { Money } from "../../shared";
import type { RawProductRecord, DiscoveryExecutionId } from "../raw-store/types";
import type { NormalizedDiscoveredProduct } from "../../marketplace";

// ── Branded IDs ────────────────────────────────────────────

export type NormalizedProductRecordId = BrandedId<"NormalizedProductRecordId">;
export type NormalizationBatchId = BrandedId<"NormalizationBatchId">;

// ── Normalizer versioning (R3) ─────────────────────────────

/**
 * Every NormalizedProductRecord carries the full normalizer version stack.
 * Bumping any of these enables reprocessing with the new version while
 * keeping old records for comparison/audit.
 */
export interface NormalizerVersions {
  readonly normalizerVersion: string;
  readonly taxonomyVersion: string;
  readonly attributeDictionaryVersion: string;
  readonly translationModelVersion: string;
}

export const DefaultNormalizerVersions: NormalizerVersions = {
  normalizerVersion: "1.0.0",
  taxonomyVersion: "1.0.0",
  attributeDictionaryVersion: "1.0.0",
  translationModelVersion: "1.0.0"
};

export const NORMALIZER_SCHEMA_VERSION = "1.0.0" as const;

// ── Canonical attribute (R5: marketplace-agnostic) ─────────

/**
 * Canonical attribute names. These are marketplace-agnostic —
 * the marketplace sends "颜色", "Color", "Colour", "Cor" → all
 * map to COLOR. Never "AliExpressColor" or "ShopeeColor".
 */
export const CanonicalAttributeName = {
  COLOR: "COLOR",
  SIZE: "SIZE",
  MATERIAL: "MATERIAL",
  BRAND: "BRAND",
  WEIGHT: "WEIGHT",
  DIMENSIONS: "DIMENSIONS",
  GENDER: "GENDER",
  STYLE: "STYLE",
  PATTERN: "PATTERN",
  SLEEVE_LENGTH: "SLEEVE_LENGTH",
  NECKLINE: "NECKLINE",
  OCCASION: "OCCASION",
  SEASON: "SEASON",
  CAPACITY: "CAPACITY",
  VOLTAGE: "VOLTAGE",
  POWER: "POWER",
  CONNECTOR_TYPE: "CONNECTOR_TYPE"
} as const;

export type CanonicalAttributeName =
  (typeof CanonicalAttributeName)[keyof typeof CanonicalAttributeName];

export interface CanonicalAttribute {
  readonly name: CanonicalAttributeName;
  readonly value: string;
  readonly confidence: number; // 0-1
  readonly sourceAttribute: string; // original marketplace attribute name
  /** R3: Which normalizer version produced this attribute. */
  readonly normalizerVersion: string;
  /** R3: How this attribute was derived: "dictionary" | "inferred" | "ai" | "manual". */
  readonly source: "dictionary" | "inferred" | "ai" | "manual";
}

// ── Price band (R6: normalize to bands, not absolute) ──────

export type PriceBand =
  | "0-10"
  | "10-20"
  | "20-50"
  | "50-100"
  | "100-250"
  | "250-500"
  | "500-1000"
  | "1000-2500"
  | "2500-5000"
  | "5000+";

export interface NormalizedPrice {
  readonly band: PriceBand;
  readonly currency: string;
  /** Original price preserved for reference, but band is the canonical form. */
  readonly originalAmount: number;
}

// ── Fingerprint (R1+R2: algorithm-versioned, swappable) ────

/**
 * A versioned fingerprint. The algorithm + version identify HOW the
 * fingerprint was computed; the value is the actual hash/embedding.
 *
 * This enables swapping algorithms without schema migration:
 *   v1: { algorithm: "fnv", version: "v1", value: "..." }
 *   v2: { algorithm: "simhash", version: "v2", value: "..." }
 *   v3: { algorithm: "embedding-cosine", version: "v3", value: "..." }
 */
export interface Fingerprint {
  readonly algorithm: string;
  readonly version: string;
  readonly value: string;
}

/** Semantic fingerprint — for product-level deduplication. */
export type SemanticFingerprint = Fingerprint;

/** Image fingerprint — for visual deduplication. */
export type ImageFingerprint = Fingerprint;

// ── Image (R2: uses ImageFingerprint) ──────────────────────

export interface NormalizedImage {
  readonly url: string;
  /** R2: Perceptual fingerprint for deduplication (algorithm-versioned). */
  readonly fingerprint: ImageFingerprint;
}

// ── NormalizedProductRecord (R1: new artifact) ─────────────

export interface NormalizedProductRecord {
  readonly id: NormalizedProductRecordId;
  readonly rawProductId: RawProductRecord["id"];
  readonly executionId: DiscoveryExecutionId;
  readonly payloadHash: string;
  /** R1: Versioned semantic fingerprint (replaces plain semanticHash string). */
  readonly semanticFingerprint: SemanticFingerprint;

  // Normalized fields
  readonly normalizedTitle: string;
  readonly normalizedBrand: string;
  /** R4: Resolved canonical brand ID (null if not resolved to a known brand). */
  readonly canonicalBrandId: string | null;
  readonly normalizedCategory: string;
  /** R5: Resolved canonical category ID (null if not mapped to taxonomy). */
  readonly canonicalCategoryId: string | null;
  readonly normalizedAttributes: ReadonlyArray<CanonicalAttribute>;
  readonly normalizedImages: ReadonlyArray<NormalizedImage>;
  readonly normalizedPrice: NormalizedPrice;

  // Provenance
  readonly providerCode: string;
  readonly externalId: string;
  readonly region: string;
  readonly language: string;
  readonly discoveredAt: Date;
  readonly normalizedAt: Date;
  readonly partitionKey: string;
  // Versioning
  readonly normalizerVersions: NormalizerVersions;
  readonly rawVersions: RawProductRecord["versions"];
  readonly schemaVersion: typeof NORMALIZER_SCHEMA_VERSION;

  // Quality
  readonly confidenceScore: number; // 0-1, overall normalization confidence
  readonly warnings: ReadonlyArray<string>;
}

// ── Normalization stages (R4) ──────────────────────────────

export type NormalizationStageName =
  "title" | "brand" | "category" | "attribute" | "image" | "price" | "semanticHash";

export interface NormalizationStageResult<T> {
  readonly value: T;
  readonly warnings: ReadonlyArray<string>;
  readonly confidence: number;
}

// ── Normalization metrics (R8) ─────────────────────────────

export interface NormalizationMetrics {
  readonly titlesNormalized: number;
  readonly brandsResolved: number;
  readonly attributesMapped: number;
  readonly categoriesMapped: number;
  readonly imagesProcessed: number;
  readonly semanticHashesCreated: number;
  readonly unknownBrands: number;
  readonly unknownCategories: number;
  readonly attributeCoverage: number; // 0-1, fraction of products with attributes
  readonly durationMs: number;
}

// ── ProductNormalizer interface (R10) ──────────────────────

export interface ProductNormalizer {
  readonly versions: NormalizerVersions;
  normalize(
    record: RawProductRecord,
    product: NormalizedDiscoveredProduct
  ): Promise<NormalizedProductRecord>;
}

// ── Repository ─────────────────────────────────────────────

export interface NormalizedProductRepository {
  append(record: NormalizedProductRecord): Promise<NormalizedProductRecord>;
  appendBatch(
    records: ReadonlyArray<NormalizedProductRecord>
  ): Promise<ReadonlyArray<NormalizedProductRecord>>;
  findById(id: NormalizedProductRecordId): Promise<NormalizedProductRecord | null>;
  findByRawProductId(
    rawProductId: RawProductRecord["id"]
  ): Promise<ReadonlyArray<NormalizedProductRecord>>;
  findBySemanticHash(semanticHash: string): Promise<ReadonlyArray<NormalizedProductRecord>>;
  stream(filter: NormalizedStreamFilter): AsyncIterable<NormalizedProductRecord>;
  count(filter: NormalizedStreamFilter): Promise<number>;
  readonly recordCount: number;
}

export interface NormalizedStreamFilter {
  readonly executionId?: DiscoveryExecutionId;
  readonly providerCode?: string;
  readonly partitionKey?: string;
  readonly since?: Date;
  readonly until?: Date;
}

// ── Coordinator ────────────────────────────────────────────

export interface NormalizationCoordinatorInput {
  readonly executionId: DiscoveryExecutionId;
  readonly rawRecords: ReadonlyArray<{
    record: RawProductRecord;
    product: NormalizedDiscoveredProduct;
  }>;
  readonly region: string;
  readonly language: string;
  readonly versions: NormalizerVersions;
}

export interface NormalizationCoordinatorResult {
  readonly batchId: NormalizationBatchId;
  readonly normalized: ReadonlyArray<NormalizedProductRecord>;
  readonly metrics: NormalizationMetrics;
  readonly durationMs: number;
}

// ── Re-exports ─────────────────────────────────────────────

export type { RawProductRecord, DiscoveryExecutionId, Money, NormalizedDiscoveredProduct };
