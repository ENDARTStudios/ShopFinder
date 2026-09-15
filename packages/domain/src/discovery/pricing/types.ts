/**
 * @workspace/domain/discovery/pricing/types
 *
 * A2.13 — Pricing Execution.
 *
 * CatalogEntry stays immutable. The effective price is a separate
 * PriceDecision artifact, enabling repricing, promotions, currency,
 * region, and marketplace variations without recreating the catalog.
 *
 * Flow:
 *   CatalogEntry → PricingSnapshot → PriceDecision → Publication
 */
import type { BrandedId } from "../../shared";
import type { Money } from "../../shared";
import type { CatalogEntryId, CatalogEntry } from "../catalog/types";

export type PricingSnapshotId = BrandedId<"PricingSnapshotId">;
export type PriceDecisionId = BrandedId<"PriceDecisionId">;

export interface PricingSnapshot {
  readonly id: PricingSnapshotId;
  readonly catalogEntryId: CatalogEntryId;
  readonly basePrice: Money;
  readonly costPrice: Money;
  readonly competitorPrices: ReadonlyArray<{ provider: string; price: Money }>;
  readonly marketConditions: {
    readonly demandLevel: "low" | "medium" | "high";
    readonly competitionLevel: "low" | "medium" | "high";
    readonly seasonalityFactor: number;
  };
  readonly capturedAt: Date;
  readonly schemaVersion: "1.0.0";
}

export type PriceDecisionType =
  | "standard"
  | "promo"
  | "repricing"
  | "clearance"
  | "regional_adjustment"
  | "marketplace_adjustment";

export interface PriceDecision {
  readonly id: PriceDecisionId;
  readonly snapshotId: PricingSnapshotId;
  readonly catalogEntryId: CatalogEntryId;
  readonly finalPrice: Money;
  readonly originalPrice: Money;
  readonly discountPercent: number;
  readonly decisionType: PriceDecisionType;
  readonly reason: string;
  readonly margin: { amount: number; currency: string };
  readonly marginPercent: number;
  readonly region?: string;
  readonly marketplace?: string;
  readonly validFrom: Date;
  readonly validUntil?: Date;
  readonly decidedAt: Date;
  readonly policyId: string;
  readonly schemaVersion: "1.0.0";
}

export interface PricingPolicy {
  readonly id: string;
  readonly name: string;
  decide(snapshot: PricingSnapshot, entry: CatalogEntry): PriceDecision;
}

export interface PricingRepository {
  appendSnapshot(snapshot: PricingSnapshot): Promise<PricingSnapshot>;
  appendDecision(decision: PriceDecision): Promise<PriceDecision>;
  findSnapshot(id: PricingSnapshotId): Promise<PricingSnapshot | null>;
  findDecision(id: PriceDecisionId): Promise<PriceDecision | null>;
  findDecisionsByProduct(productId: CatalogEntryId): Promise<ReadonlyArray<PriceDecision>>;
  readonly snapshotCount: number;
  readonly decisionCount: number;
}

export interface PricingCoordinatorInput {
  readonly batchId: string;
  readonly catalogEntries: ReadonlyArray<CatalogEntry>;
}

export interface PricingCoordinatorResult {
  readonly snapshots: ReadonlyArray<PricingSnapshot>;
  readonly decisions: ReadonlyArray<PriceDecision>;
  readonly metrics: PricingMetrics;
  readonly durationMs: number;
}

export interface PricingMetrics {
  readonly snapshotsCaptured: number;
  readonly decisionsMade: number;
  readonly averageMarginPercent: number;
  readonly promoCount: number;
  readonly repricingCount: number;
  readonly durationMs: number;
}

export type { CatalogEntryId, CatalogEntry, Money };
