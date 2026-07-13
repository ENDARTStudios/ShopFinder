/**
 * @workspace/domain/discovery/pricing/snapshot
 *
 * PricingSnapshot captures market conditions at a point in time.
 */
import type { PricingSnapshot, PricingSnapshotId, CatalogEntry, Money } from "./types";

export function captureSnapshot(
  entry: CatalogEntry,
  options?: {
    costPrice?: Money;
    competitorPrices?: ReadonlyArray<{ provider: string; price: Money }>;
    demandLevel?: "low" | "medium" | "high";
    competitionLevel?: "low" | "medium" | "high";
    seasonalityFactor?: number;
  }
): PricingSnapshot {
  const basePrice = entry.pricing.minPrice;
  const costPrice = options?.costPrice ?? {
    amount: Math.round(basePrice.amount * 0.6),
    currency: basePrice.currency
  };

  return {
    id: `snap_${entry.id}_${Date.now()}` as unknown as PricingSnapshotId,
    catalogEntryId: entry.id,
    basePrice,
    costPrice,
    competitorPrices: options?.competitorPrices ?? [],
    marketConditions: {
      demandLevel: options?.demandLevel ?? "medium",
      competitionLevel: options?.competitionLevel ?? "medium",
      seasonalityFactor: options?.seasonalityFactor ?? 1.0
    },
    capturedAt: new Date(),
    schemaVersion: "1.0.0"
  };
}
