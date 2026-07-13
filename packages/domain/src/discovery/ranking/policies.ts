/**
 * @workspace/domain/discovery/ranking/policies
 *
 * Default RankingPolicy implementations.
 */
import type { RankingPolicy, RankingFactor } from "./types";
import type { CatalogEntry, ProductScore } from "./types";

/**
 * Default ranking: uses the evaluation summary score from the catalog entry.
 */
export class DefaultRankingPolicy implements RankingPolicy {
  readonly id = "default-ranking-v1";
  readonly version = "1.0.0";

  score(entry: CatalogEntry): { score: ProductScore; factors: ReadonlyArray<RankingFactor> } {
    const overall = entry.evaluationSummary.overallScore;
    const confidence = entry.evaluationSummary.confidence * 100;

    // Derive a simplified score from the evaluation summary
    const score: ProductScore = {
      commercial: overall,
      quality: overall,
      confidence,
      risk: 100 - overall,
      trend: overall * 0.9,
      competition: 100 - overall,
      supplier: Math.min(100, entry.supplierCount * 20),
      margin: overall * 0.8,
      compliance: overall,
      overall
    };

    const factors: RankingFactor[] = [
      { name: "evaluation_score", weight: 0.4, value: overall, contribution: overall * 0.4 },
      { name: "confidence", weight: 0.25, value: confidence, contribution: confidence * 0.25 },
      {
        name: "supplier_diversity",
        weight: 0.2,
        value: Math.min(100, entry.supplierCount * 20),
        contribution: Math.min(100, entry.supplierCount * 20) * 0.2
      },
      {
        name: "offer_count",
        weight: 0.15,
        value: Math.min(100, entry.offerCount * 10),
        contribution: Math.min(100, entry.offerCount * 10) * 0.15
      }
    ];

    return { score, factors };
  }
}

/**
 * Margin-focused ranking: prioritizes products with higher margin potential.
 */
export class MarginFocusedRankingPolicy implements RankingPolicy {
  readonly id = "margin-focused-ranking-v1";
  readonly version = "1.0.0";

  score(entry: CatalogEntry): { score: ProductScore; factors: ReadonlyArray<RankingFactor> } {
    const base = new DefaultRankingPolicy().score(entry);
    // Boost margin weight
    const factors = base.factors.map((f) =>
      f.name === "evaluation_score"
        ? { ...f, weight: 0.25, contribution: f.value * 0.25 }
        : f.name === "confidence"
          ? { ...f, weight: 0.15, contribution: f.value * 0.15 }
          : f
    );
    // Add margin factor
    factors.push({
      name: "margin_potential",
      weight: 0.35,
      value: base.score.margin,
      contribution: base.score.margin * 0.35
    });

    const overall =
      factors.reduce((s, f) => s + f.contribution, 0) / factors.reduce((s, f) => s + f.weight, 0);

    return {
      score: { ...base.score, overall },
      factors
    };
  }
}

export function createRankingPolicy(
  strategy: "default" | "margin-focused" = "default"
): RankingPolicy {
  switch (strategy) {
    case "default":
      return new DefaultRankingPolicy();
    case "margin-focused":
      return new MarginFocusedRankingPolicy();
  }
}
