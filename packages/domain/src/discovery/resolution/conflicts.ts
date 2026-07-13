/**
 * @workspace/domain/discovery/resolution/conflicts
 *
 * ConflictDetector — inspects a SimilarityCluster and its members to
 * determine if the cluster can be auto-resolved or if it needs manual
 * review.
 *
 * Conflict reasons:
 *   - DIFFERENT_SIZES: members have conflicting SIZE attributes
 *   - DIFFERENT_MODELS: members have conflicting model numbers
 *   - CONFLICTING_BRANDS: members map to different canonicalBrandIds
 *   - INCOMPATIBLE_CATEGORIES: members map to different canonicalCategoryIds
 *   - PRICE_OUTLIER: one member's price is >3x the median
 *   - LOW_SIMILARITY: cluster evidence overall < 0.80
 *   - MANUAL_REVIEW_REQUIRED: fallback for ambiguous cases
 */
import type {
  ConflictRecord,
  ConflictReason,
  ConflictRecordId,
  SimilarityCluster,
  NormalizedProductRecord,
  NormalizedProductRecordId,
  ResolutionBatchId
} from "./types";

export interface ConflictDetectionResult {
  readonly hasConflict: boolean;
  readonly reason?: ConflictReason;
  readonly details?: string;
}

/**
 * Detect conflicts in a cluster. Returns null if no conflict (safe to auto-resolve).
 */
export function detectConflict(
  cluster: SimilarityCluster,
  products: ReadonlyMap<NormalizedProductRecordId, NormalizedProductRecord>
): ConflictDetectionResult {
  const members: NormalizedProductRecord[] = [];
  for (const pid of cluster.memberIds) {
    const p = products.get(pid);
    if (p) members.push(p);
  }

  if (members.length < 2) {
    return { hasConflict: false };
  }

  // 1. CONFLICTING_BRANDS — different canonicalBrandIds
  const brandIds = new Set(
    members.map((p) => p.canonicalBrandId).filter((id): id is string => id !== null)
  );
  if (brandIds.size > 1) {
    return {
      hasConflict: true,
      reason: "CONFLICTING_BRANDS",
      details: `Members have ${brandIds.size} different canonical brand IDs: ${[...brandIds].join(", ")}`
    };
  }

  // 2. INCOMPATIBLE_CATEGORIES — different canonicalCategoryIds
  const categoryIds = new Set(
    members.map((p) => p.canonicalCategoryId).filter((id): id is string => id !== null)
  );
  if (categoryIds.size > 1) {
    return {
      hasConflict: true,
      reason: "INCOMPATIBLE_CATEGORIES",
      details: `Members map to ${categoryIds.size} different categories: ${[...categoryIds].join(", ")}`
    };
  }

  // 3. DIFFERENT_SIZES — conflicting SIZE attributes
  const sizes = new Set<string>();
  for (const p of members) {
    const sizeAttr = p.normalizedAttributes.find((a) => a.name === "SIZE");
    if (sizeAttr) sizes.add(sizeAttr.value.toUpperCase());
  }
  if (sizes.size > 1) {
    return {
      hasConflict: true,
      reason: "DIFFERENT_SIZES",
      details: `Members have ${sizes.size} different sizes: ${[...sizes].join(", ")}`
    };
  }

  // 4. PRICE_OUTLIER — one member is >3x the min price
  // Using min (not median) because for small clusters the median
  // can be the outlier itself. Min is always the cheapest offer,
  // and >3x that is suspicious.
  const prices = members.map((p) => p.normalizedPrice.originalAmount).sort((a, b) => a - b);
  const minPrice = prices[0] ?? 0;
  for (const price of prices) {
    if (minPrice > 0 && price > minPrice * 3) {
      return {
        hasConflict: true,
        reason: "PRICE_OUTLIER",
        details: `Price ${price} is >3x the minimum ${minPrice}`
      };
    }
  }

  // 5. LOW_SIMILARITY — cluster evidence overall < 0.80
  if (cluster.evidence.overallSimilarity < 0.8) {
    return {
      hasConflict: true,
      reason: "LOW_SIMILARITY",
      details: `Cluster overall similarity ${cluster.evidence.overallSimilarity.toFixed(2)} < 0.80`
    };
  }

  return { hasConflict: false };
}

/**
 * Build a ConflictRecord from a detected conflict.
 */
export function buildConflictRecord(
  cluster: SimilarityCluster,
  detection: ConflictDetectionResult,
  batchId: ResolutionBatchId,
  now: Date = new Date()
): ConflictRecord {
  if (!detection.hasConflict || !detection.reason || !detection.details) {
    throw new Error("Cannot build ConflictRecord from non-conflict detection");
  }
  return {
    id: `conflict_${cluster.id}` as unknown as ConflictRecordId,
    clusterId: cluster.id,
    reason: detection.reason,
    candidates: cluster.memberIds,
    details: detection.details,
    createdAt: now,
    batchId,
    resolved: false
  };
}
