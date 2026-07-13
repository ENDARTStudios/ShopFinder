/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import { createRankingCoordinator, type RankingCoordinatorDeps } from "./coordinator";
import { createRankingRepository } from "./repository";
import { DefaultRankingPolicy, MarginFocusedRankingPolicy, createRankingPolicy } from "./policies";
import type { CatalogEntry, CatalogEntryId } from "../catalog/types";
import type { CanonicalProductId } from "../resolution/types";

function makeCatalogEntry(o?: Partial<CatalogEntry>): CatalogEntry {
  return {
    id: "cat_001" as unknown as CatalogEntryId,
    canonicalProductId: "canon_001" as unknown as CanonicalProductId,
    sku: "SKU-001",
    slug: "earbuds",
    title: "Earbuds",
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
      minPrice: { amount: 2999, currency: "USD" },
      maxPrice: { amount: 3999, currency: "USD" },
      currency: "USD",
      priceRangeLabel: "$29.99"
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

describe("A2.14 Ranking", () => {
  let repo: ReturnType<typeof createRankingRepository>;

  beforeEach(() => {
    repo = createRankingRepository();
  });

  it("should rank products by overall score descending", async () => {
    const deps: RankingCoordinatorDeps = { repository: repo, policy: new DefaultRankingPolicy() };
    const coord = createRankingCoordinator(deps);

    const entries = [
      makeCatalogEntry({
        id: "a" as any,
        evaluationSummary: {
          overallScore: 60,
          recommendation: "publish",
          confidence: 0.7,
          complianceStatus: "approved"
        }
      }),
      makeCatalogEntry({
        id: "b" as any,
        evaluationSummary: {
          overallScore: 90,
          recommendation: "publish",
          confidence: 0.9,
          complianceStatus: "approved"
        }
      }),
      makeCatalogEntry({
        id: "c" as any,
        evaluationSummary: {
          overallScore: 75,
          recommendation: "publish",
          confidence: 0.8,
          complianceStatus: "approved"
        }
      })
    ];

    const result = await coord.rank({ batchId: "b1", catalogEntries: entries });

    expect(result.records.length).toBe(3);
    expect(result.records[0]!.productId).toBe("b" as any); // highest score
    expect(result.records[0]!.rankingPosition).toBe(1);
    expect(result.records[1]!.productId).toBe("c" as any);
    expect(result.records[2]!.productId).toBe("a" as any);
  });

  it("should produce RankingRecord with factors", async () => {
    const deps: RankingCoordinatorDeps = { repository: repo, policy: new DefaultRankingPolicy() };
    const coord = createRankingCoordinator(deps);
    const result = await coord.rank({ batchId: "b1", catalogEntries: [makeCatalogEntry()] });

    const record = result.records[0]!;
    expect(record.score).toBeDefined();
    expect(record.factors.length).toBeGreaterThan(0);
    expect(record.rankingVersion).toBeTruthy();
    expect(record.schemaVersion).toBe("1.0.0");
  });

  it("should NOT modify CatalogEntry", async () => {
    const entry = makeCatalogEntry();
    const entryCopy = { ...entry };
    const deps: RankingCoordinatorDeps = { repository: repo, policy: new DefaultRankingPolicy() };
    const coord = createRankingCoordinator(deps);
    await coord.rank({ batchId: "b1", catalogEntries: [entry] });
    expect(entry).toEqual(entryCopy);
  });

  it("should support swappable policies", () => {
    expect(createRankingPolicy("default")).toBeInstanceOf(DefaultRankingPolicy);
    expect(createRankingPolicy("margin-focused")).toBeInstanceOf(MarginFocusedRankingPolicy);
  });

  it("should track metrics", async () => {
    const deps: RankingCoordinatorDeps = { repository: repo, policy: new DefaultRankingPolicy() };
    const coord = createRankingCoordinator(deps);
    const result = await coord.rank({
      batchId: "b1",
      catalogEntries: [
        makeCatalogEntry({
          evaluationSummary: {
            overallScore: 80,
            recommendation: "publish",
            confidence: 0.9,
            complianceStatus: "approved"
          }
        }),
        makeCatalogEntry({
          id: "b" as any,
          evaluationSummary: {
            overallScore: 60,
            recommendation: "review",
            confidence: 0.6,
            complianceStatus: "approved"
          }
        })
      ]
    });
    expect(result.metrics.productsRanked).toBe(2);
    expect(result.metrics.topScore).toBe(80);
    expect(result.metrics.averageScore).toBeGreaterThan(0);
  });
});
