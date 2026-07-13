/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import { createPricingCoordinator, type PricingCoordinatorDeps } from "./coordinator";
import { createPricingRepository } from "./repository";
import {
  StandardPricingPolicy,
  PromoPricingPolicy,
  CompetitiveRepricingPolicy,
  createPricingPolicy
} from "./policies";
import { captureSnapshot } from "./snapshot";
import type { CatalogEntry, CatalogEntryId } from "../catalog/types";
import type { CanonicalProductId } from "../resolution/types";

function makeCatalogEntry(o?: Partial<CatalogEntry>): CatalogEntry {
  return {
    id: "cat_001" as unknown as CatalogEntryId,
    canonicalProductId: "canon_001" as unknown as CanonicalProductId,
    sku: "SKU-001",
    slug: "wireless-earbuds",
    title: "Wireless Earbuds",
    description: "HQ",
    brand: "Xiaomi",
    canonicalBrandId: "brand_xiaomi",
    category: "ELECTRONICS",
    canonicalCategoryId: "cat_electronics",
    attributes: [],
    variants: [],
    images: [],
    seo: { metaTitle: "E", metaDescription: "H", keywords: [], canonicalUrl: "/e" },
    pricing: {
      minPrice: { amount: 5000, currency: "USD" },
      maxPrice: { amount: 5000, currency: "USD" },
      currency: "USD",
      priceRangeLabel: "$50.00"
    },
    supplierCount: 2,
    offerCount: 3,
    evaluationSummary: {
      overallScore: 72,
      recommendation: "publish",
      confidence: 0.85,
      complianceStatus: "approved"
    },
    materializedAt: new Date(),
    materializerVersion: "1.0.0",
    schemaVersion: "1.0.0",
    ...o
  };
}

describe("A2.13 Pricing Execution", () => {
  let repo: ReturnType<typeof createPricingRepository>;

  beforeEach(() => {
    repo = createPricingRepository();
  });

  it("should capture PricingSnapshot from CatalogEntry", () => {
    const entry = makeCatalogEntry();
    const snapshot = captureSnapshot(entry, { costPrice: { amount: 3000, currency: "USD" } });
    expect(snapshot.catalogEntryId).toBe(entry.id);
    expect(snapshot.basePrice.amount).toBe(5000);
    expect(snapshot.costPrice.amount).toBe(3000);
    expect(snapshot.schemaVersion).toBe("1.0.0");
  });

  it("should make standard pricing decision (no discount)", async () => {
    const deps: PricingCoordinatorDeps = {
      repository: repo,
      policy: new StandardPricingPolicy()
    };
    const coord = createPricingCoordinator(deps);
    const result = await coord.price({ batchId: "b1", catalogEntries: [makeCatalogEntry()] });

    expect(result.decisions.length).toBe(1);
    expect(result.decisions[0]!.discountPercent).toBe(0);
    expect(result.decisions[0]!.decisionType).toBe("standard");
    expect(result.decisions[0]!.schemaVersion).toBe("1.0.0");
  });

  it("should make promo pricing decision with discount", async () => {
    const deps: PricingCoordinatorDeps = {
      repository: repo,
      policy: new PromoPricingPolicy(20)
    };
    const coord = createPricingCoordinator(deps);
    const result = await coord.price({ batchId: "b1", catalogEntries: [makeCatalogEntry()] });

    expect(result.decisions[0]!.discountPercent).toBe(20);
    expect(result.decisions[0]!.finalPrice.amount).toBeLessThan(5000);
    expect(result.decisions[0]!.decisionType).toBe("promo");
    expect(result.metrics.promoCount).toBe(1);
  });

  it("should make competitive repricing decision", async () => {
    const entry = makeCatalogEntry();
    const snapshot = captureSnapshot(entry, {
      costPrice: { amount: 2000, currency: "USD" },
      competitorPrices: [
        { provider: "competitor_a", price: { amount: 4500, currency: "USD" } },
        { provider: "competitor_b", price: { amount: 4800, currency: "USD" } }
      ]
    });
    const policy = new CompetitiveRepricingPolicy();
    const decision = policy.decide(snapshot, entry);

    // Should undercut lowest competitor (4500) by 2% = 4410
    expect(decision.finalPrice.amount).toBeLessThanOrEqual(4500);
    expect(decision.decisionType).toBe("repricing");
  });

  it("should NOT modify CatalogEntry (immutable)", async () => {
    const entry = makeCatalogEntry();
    const entryCopy = { ...entry, pricing: { ...entry.pricing } };
    const deps: PricingCoordinatorDeps = { repository: repo, policy: new StandardPricingPolicy() };
    const coord = createPricingCoordinator(deps);
    await coord.price({ batchId: "b1", catalogEntries: [entry] });
    expect(entry).toEqual(entryCopy);
  });

  it("should track metrics", async () => {
    const deps: PricingCoordinatorDeps = { repository: repo, policy: new StandardPricingPolicy() };
    const coord = createPricingCoordinator(deps);
    const result = await coord.price({
      batchId: "b1",
      catalogEntries: [makeCatalogEntry(), makeCatalogEntry({ id: "cat_002" as any })]
    });
    expect(result.metrics.snapshotsCaptured).toBe(2);
    expect(result.metrics.decisionsMade).toBe(2);
    expect(result.metrics.averageMarginPercent).toBeGreaterThan(0);
  });
});
