/**
 * @workspace/domain/discovery/similarity/policy
 *
 * SimilarityPolicy evaluation (R7).
 * Decides whether a pair of products with given SimilarityEvidence
 * constitutes a DuplicateCandidate based on configurable thresholds.
 */
import type { SimilarityPolicy, SimilarityEvidence } from "./types";
import { DefaultSimilarityPolicy } from "./types";

/**
 * Evaluate whether evidence meets the policy thresholds.
 * Returns { pass, reason } for explainability.
 */
export function evaluatePolicy(
  evidence: SimilarityEvidence,
  policy: SimilarityPolicy = DefaultSimilarityPolicy
): { pass: boolean; reason: string; failedThresholds: string[] } {
  const failed: string[] = [];

  if (evidence.titleSimilarity < policy.minimumTitleSimilarity) {
    failed.push(`title ${evidence.titleSimilarity.toFixed(2)} < ${policy.minimumTitleSimilarity}`);
  }
  if (evidence.brandSimilarity < policy.minimumBrandSimilarity) {
    failed.push(`brand ${evidence.brandSimilarity.toFixed(2)} < ${policy.minimumBrandSimilarity}`);
  }
  if (evidence.imageSimilarity < policy.minimumImageSimilarity) {
    failed.push(`image ${evidence.imageSimilarity.toFixed(2)} < ${policy.minimumImageSimilarity}`);
  }
  if (evidence.overallSimilarity < policy.minimumOverallSimilarity) {
    failed.push(
      `overall ${evidence.overallSimilarity.toFixed(2)} < ${policy.minimumOverallSimilarity}`
    );
  }

  if (failed.length > 0) {
    return {
      pass: false,
      reason: `Failed thresholds: ${failed.join(", ")}`,
      failedThresholds: failed
    };
  }

  return {
    pass: true,
    reason: `All thresholds met (overall=${evidence.overallSimilarity.toFixed(2)})`,
    failedThresholds: []
  };
}

/**
 * Compute weighted overall similarity from per-dimension scores.
 */
export function computeOverallSimilarity(
  scores: {
    title: number;
    brand: number;
    image: number;
    attribute: number;
    price: number;
  },
  weights: SimilarityPolicy["weights"]
): number {
  const total =
    scores.title * weights.title +
    scores.brand * weights.brand +
    scores.image * weights.image +
    scores.attribute * weights.attribute +
    scores.price * weights.price;
  const weightSum =
    weights.title + weights.brand + weights.image + weights.attribute + weights.price;
  return weightSum > 0 ? total / weightSum : 0;
}

export function createSimilarityPolicy(overrides?: Partial<SimilarityPolicy>): SimilarityPolicy {
  return { ...DefaultSimilarityPolicy, ...overrides };
}
