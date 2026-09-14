/**
 * @workspace/domain/discovery/resolution/policies
 *
 * 5 ResolutionPolicy implementations.
 * Each picks the primary NormalizedProductRecord from a SimilarityCluster
 * using a different strategy. All are deterministic.
 */
import type {
  ResolutionPolicy,
  SimilarityCluster,
  NormalizedProductRecord,
  NormalizedProductRecordId
} from "./types";

/**
 * Pick the record with the highest normalizer confidenceScore.
 */
export class HighestConfidencePolicy implements ResolutionPolicy {
  readonly name = "highest-confidence";

  resolve(
    cluster: SimilarityCluster,
    products: ReadonlyMap<NormalizedProductRecordId, NormalizedProductRecord>
  ): { primaryProductId: NormalizedProductRecordId; reason: string; confidence: number } {
    let best: NormalizedProductRecord | null = null;
    for (const pid of cluster.memberIds) {
      const p = products.get(pid);
      if (!p) continue;
      if (!best || p.confidenceScore > best.confidenceScore) best = p;
    }
    if (!best) {
      // Fallback: first member
      return {
        primaryProductId: cluster.memberIds[0]!,
        reason: "fallback: no products found, first member",
        confidence: 0
      };
    }
    return {
      primaryProductId: best.id,
      reason: `highest confidence: ${best.confidenceScore.toFixed(2)}`,
      confidence: best.confidenceScore
    };
  }
}

/**
 * Prefer records from a ranked list of marketplaces.
 * Example: ["aliexpress", "temu", "shopee"] — first match wins.
 */
export class BestMarketplacePolicy implements ResolutionPolicy {
  readonly name = "best-marketplace";

  constructor(private readonly marketplaceRanking: ReadonlyArray<string>) {}

  resolve(
    cluster: SimilarityCluster,
    products: ReadonlyMap<NormalizedProductRecordId, NormalizedProductRecord>
  ): { primaryProductId: NormalizedProductRecordId; reason: string; confidence: number } {
    for (const code of this.marketplaceRanking) {
      for (const pid of cluster.memberIds) {
        const p = products.get(pid);
        if (p && p.providerCode === code) {
          return {
            primaryProductId: p.id,
            reason: `best marketplace: ${code} (rank ${this.marketplaceRanking.indexOf(code) + 1})`,
            confidence: 0.85
          };
        }
      }
    }
    // Fallback: first member
    return {
      primaryProductId: cluster.memberIds[0]!,
      reason: "fallback: no ranked marketplace found",
      confidence: 0.3
    };
  }
}

/**
 * Pick the record with the most non-empty fields (title, brand, category,
 * attributes, images).
 */
export class HighestCompletenessPolicy implements ResolutionPolicy {
  readonly name = "highest-completeness";

  resolve(
    cluster: SimilarityCluster,
    products: ReadonlyMap<NormalizedProductRecordId, NormalizedProductRecord>
  ): { primaryProductId: NormalizedProductRecordId; reason: string; confidence: number } {
    let best: NormalizedProductRecord | null = null;
    let bestScore = -1;

    for (const pid of cluster.memberIds) {
      const p = products.get(pid);
      if (!p) continue;
      const score = this.completenessScore(p);
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    if (!best) {
      return {
        primaryProductId: cluster.memberIds[0]!,
        reason: "fallback: no products found",
        confidence: 0
      };
    }

    return {
      primaryProductId: best.id,
      reason: `highest completeness: ${bestScore} fields filled`,
      confidence: Math.min(1, bestScore / 10)
    };
  }

  private completenessScore(p: NormalizedProductRecord): number {
    let score = 0;
    if (p.normalizedTitle) score++;
    if (p.normalizedBrand && p.normalizedBrand !== "UNKNOWN") score++;
    if (p.canonicalBrandId) score++;
    if (p.normalizedCategory && p.normalizedCategory !== "UNCATEGORIZED") score++;
    if (p.canonicalCategoryId) score++;
    if (p.normalizedAttributes.length > 0) score++;
    if (p.normalizedImages.length > 0) score++;
    if (p.normalizedPrice.band) score++;
    if (p.confidenceScore > 0.8) score++;
    if (p.warnings.length === 0) score++;
    return score;
  }
}

/**
 * Pick the record with the lowest price (best deal for the customer).
 */
export class LowestPricePolicy implements ResolutionPolicy {
  readonly name = "lowest-price";

  resolve(
    cluster: SimilarityCluster,
    products: ReadonlyMap<NormalizedProductRecordId, NormalizedProductRecord>
  ): { primaryProductId: NormalizedProductRecordId; reason: string; confidence: number } {
    let best: NormalizedProductRecord | null = null;

    for (const pid of cluster.memberIds) {
      const p = products.get(pid);
      if (!p) continue;
      if (!best || p.normalizedPrice.originalAmount < best.normalizedPrice.originalAmount) {
        best = p;
      }
    }

    if (!best) {
      return {
        primaryProductId: cluster.memberIds[0]!,
        reason: "fallback: no products found",
        confidence: 0
      };
    }

    return {
      primaryProductId: best.id,
      reason: `lowest price: ${best.normalizedPrice.originalAmount} ${best.normalizedPrice.currency}`,
      confidence: 0.75
    };
  }
}

/**
 * Weighted combination: 40% confidence + 30% completeness + 20% marketplace rank + 10% price.
 */
export class WeightedHybridPolicy implements ResolutionPolicy {
  readonly name = "weighted-hybrid";

  constructor(
    private readonly marketplaceRanking: ReadonlyArray<string> = [],
    private readonly weights: {
      confidence: number;
      completeness: number;
      marketplace: number;
      price: number;
    } = {
      confidence: 0.4,
      completeness: 0.3,
      marketplace: 0.2,
      price: 0.1
    }
  ) {}

  resolve(
    cluster: SimilarityCluster,
    products: ReadonlyMap<NormalizedProductRecordId, NormalizedProductRecord>
  ): { primaryProductId: NormalizedProductRecordId; reason: string; confidence: number } {
    let best: NormalizedProductRecord | null = null;
    let bestScore = -1;

    for (const pid of cluster.memberIds) {
      const p = products.get(pid);
      if (!p) continue;
      const score = this.score(p);
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    if (!best) {
      return {
        primaryProductId: cluster.memberIds[0]!,
        reason: "fallback: no products found",
        confidence: 0
      };
    }

    return {
      primaryProductId: best.id,
      reason: `weighted hybrid: score=${bestScore.toFixed(3)}`,
      confidence: Math.min(1, bestScore)
    };
  }

  private score(p: NormalizedProductRecord): number {
    const conf = p.confidenceScore * this.weights.confidence;
    const completeness = Math.min(1, p.normalizedAttributes.length / 5) * this.weights.completeness;
    const marketRank = this.marketplaceRanking.includes(p.providerCode)
      ? (1 - this.marketplaceRanking.indexOf(p.providerCode) / this.marketplaceRanking.length) *
        this.weights.marketplace
      : 0;
    const price = (1 / (1 + p.normalizedPrice.originalAmount / 10000)) * this.weights.price;
    return conf + completeness + marketRank + price;
  }
}

// ── Factory ────────────────────────────────────────────────

export function createResolutionPolicy(
  strategy:
    | "highest-confidence"
    | "best-marketplace"
    | "highest-completeness"
    | "lowest-price"
    | "weighted-hybrid",
  options?: { marketplaceRanking?: ReadonlyArray<string> }
): ResolutionPolicy {
  switch (strategy) {
    case "highest-confidence":
      return new HighestConfidencePolicy();
    case "best-marketplace":
      return new BestMarketplacePolicy(options?.marketplaceRanking ?? []);
    case "highest-completeness":
      return new HighestCompletenessPolicy();
    case "lowest-price":
      return new LowestPricePolicy();
    case "weighted-hybrid":
      return new WeightedHybridPolicy(options?.marketplaceRanking);
  }
}
