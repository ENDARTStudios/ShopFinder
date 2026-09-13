/**
 * @workspace/domain/discovery/pricing/policies
 *
 * Default PricingPolicy implementations.
 */
import type {
  PricingPolicy,
  PricingSnapshot,
  PriceDecision,
  PriceDecisionId,
  PriceDecisionType
} from "./types";
import type { CatalogEntry, Money } from "./types";

/**
 * Standard pricing: base price + 30% margin.
 */
export class StandardPricingPolicy implements PricingPolicy {
  readonly id = "standard-pricing-v1";
  readonly name = "Standard Pricing";

  decide(snapshot: PricingSnapshot, entry: CatalogEntry): PriceDecision {
    const cost = snapshot.costPrice.amount;
    const basePrice = snapshot.basePrice;
    const marginAmount = basePrice.amount - cost;
    const marginPercent = cost > 0 ? (marginAmount / cost) * 100 : 0;

    return {
      id: `price_${snapshot.id}` as unknown as PriceDecisionId,
      snapshotId: snapshot.id,
      catalogEntryId: entry.id,
      finalPrice: basePrice,
      originalPrice: basePrice,
      discountPercent: 0,
      decisionType: "standard",
      reason: `Standard pricing: margin ${marginPercent.toFixed(1)}%`,
      margin: { amount: marginAmount, currency: basePrice.currency },
      marginPercent,
      validFrom: new Date(),
      decidedAt: new Date(),
      policyId: this.id,
      schemaVersion: "1.0.0"
    };
  }
}

/**
 * Promo pricing: applies a discount percentage.
 */
export class PromoPricingPolicy implements PricingPolicy {
  readonly id = "promo-pricing-v1";
  readonly name = "Promo Pricing";

  constructor(private readonly discountPercent: number = 15) {}

  decide(snapshot: PricingSnapshot, entry: CatalogEntry): PriceDecision {
    const original = snapshot.basePrice;
    const discountFactor = 1 - this.discountPercent / 100;
    const finalAmount = Math.round(original.amount * discountFactor);
    const finalPrice: Money = { amount: finalAmount, currency: original.currency };
    const cost = snapshot.costPrice.amount;
    const marginAmount = finalAmount - cost;
    const marginPercent = cost > 0 ? (marginAmount / cost) * 100 : 0;

    return {
      id: `price_promo_${snapshot.id}` as unknown as PriceDecisionId,
      snapshotId: snapshot.id,
      catalogEntryId: entry.id,
      finalPrice,
      originalPrice: original,
      discountPercent: this.discountPercent,
      decisionType: "promo",
      reason: `Promo: ${this.discountPercent}% off (margin ${marginPercent.toFixed(1)}%)`,
      margin: { amount: marginAmount, currency: original.currency },
      marginPercent,
      validFrom: new Date(),
      decidedAt: new Date(),
      policyId: this.id,
      schemaVersion: "1.0.0"
    };
  }
}

/**
 * Competitive repricing: undercuts lowest competitor by 2%.
 */
export class CompetitiveRepricingPolicy implements PricingPolicy {
  readonly id = "competitive-repricing-v1";
  readonly name = "Competitive Repricing";

  decide(snapshot: PricingSnapshot, entry: CatalogEntry): PriceDecision {
    const original = snapshot.basePrice;
    let finalAmount = original.amount;

    if (snapshot.competitorPrices.length > 0) {
      const lowestCompetitor = Math.min(...snapshot.competitorPrices.map((c) => c.price.amount));
      finalAmount = Math.round(lowestCompetitor * 0.98); // 2% below competitor
    }

    const cost = snapshot.costPrice.amount;
    // Ensure minimum margin
    const minPrice = Math.round(cost * 1.15); // at least 15% margin
    finalAmount = Math.max(finalAmount, minPrice);

    const finalPrice: Money = { amount: finalAmount, currency: original.currency };
    const marginAmount = finalAmount - cost;
    const marginPercent = cost > 0 ? (marginAmount / cost) * 100 : 0;
    const discountPercent =
      original.amount > 0 ? ((original.amount - finalAmount) / original.amount) * 100 : 0;

    return {
      id: `price_reprice_${snapshot.id}` as unknown as PriceDecisionId,
      snapshotId: snapshot.id,
      catalogEntryId: entry.id,
      finalPrice,
      originalPrice: original,
      discountPercent: Math.max(0, discountPercent),
      decisionType: "repricing",
      reason: `Competitive repricing: ${snapshot.competitorPrices.length} competitors, margin ${marginPercent.toFixed(1)}%`,
      margin: { amount: marginAmount, currency: original.currency },
      marginPercent,
      validFrom: new Date(),
      decidedAt: new Date(),
      policyId: this.id,
      schemaVersion: "1.0.0"
    };
  }
}

export function createPricingPolicy(
  strategy: "standard" | "promo" | "competitive",
  options?: { discountPercent?: number }
): PricingPolicy {
  switch (strategy) {
    case "standard":
      return new StandardPricingPolicy();
    case "promo":
      return new PromoPricingPolicy(options?.discountPercent);
    case "competitive":
      return new CompetitiveRepricingPolicy();
  }
}
