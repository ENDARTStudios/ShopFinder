/**
 * @workspace/domain/discovery/evaluation/scores
 *
 * ProductScore composition — 9 independent components, overall derived.
 *
 * The overall score is NEVER persisted as the single truth. It is always
 * recomputed from the 9 components. This allows re-weighting without
 * re-running inference.
 */
import type { ProductScore, AIScoreFactor } from "./types";

export const SCORE_COMPONENTS = [
  "commercial",
  "quality",
  "confidence",
  "risk",
  "trend",
  "competition",
  "supplier",
  "margin",
  "compliance"
] as const;

export type ScoreComponent = (typeof SCORE_COMPONENTS)[number];

/**
 * Weights for deriving the overall score from components.
 * Risk is inverted (higher risk = lower contribution).
 */
export const DEFAULT_SCORE_WEIGHTS: Readonly<Record<ScoreComponent, number>> = {
  commercial: 0.15,
  quality: 0.15,
  confidence: 0.1,
  risk: 0.1, // inverted
  trend: 0.1,
  competition: 0.1,
  supplier: 0.1,
  margin: 0.1,
  compliance: 0.1
};

/**
 * Compute the overall score from 9 components.
 * Risk is inverted (100 - risk) because higher risk is bad.
 */
export function computeOverallScore(
  components: Omit<ProductScore, "overall">,
  weights: Readonly<Record<ScoreComponent, number>> = DEFAULT_SCORE_WEIGHTS
): number {
  const contributions: number[] = [];
  for (const key of SCORE_COMPONENTS) {
    const value = components[key];
    const weight = weights[key];
    // Invert risk (higher risk = lower contribution)
    const adjusted = key === "risk" ? 100 - value : value;
    contributions.push(adjusted * weight);
  }
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
  return totalWeight > 0 ? contributions.reduce((s, c) => s + c, 0) / totalWeight : 0;
}

/**
 * Build a complete ProductScore from components, computing overall.
 */
export function buildProductScore(
  components: Omit<ProductScore, "overall">,
  weights?: Readonly<Record<ScoreComponent, number>>
): ProductScore {
  return {
    ...components,
    overall: computeOverallScore(components, weights)
  };
}

/**
 * Convert AIScoreFactors to ProductScore components.
 * Each factor maps to a component by name (case-insensitive).
 */
export function factorsToScore(
  factors: ReadonlyArray<AIScoreFactor>
): Omit<ProductScore, "overall"> {
  const factorMap = new Map<string, AIScoreFactor>();
  for (const f of factors) {
    factorMap.set(f.name.toLowerCase(), f);
  }

  const getScore = (name: string): number => {
    const f = factorMap.get(name.toLowerCase());
    return f ? f.value : 50; // default to 50 if factor not present
  };

  return {
    commercial: getScore("commercial"),
    quality: getScore("quality"),
    confidence: getScore("confidence"),
    risk: getScore("risk"),
    trend: getScore("trend"),
    competition: getScore("competition"),
    supplier: getScore("supplier"),
    margin: getScore("margin"),
    compliance: getScore("compliance")
  };
}
