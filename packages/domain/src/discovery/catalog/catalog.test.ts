/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import {
  createCatalogCoordinator,
  type CatalogCoordinatorDeps,
  type CatalogEventPublisher
} from "./coordinator";
import { createCatalogRepository } from "./repository";
import { DefaultCatalogMaterializer, createCatalogMaterializer } from "./materializer";
import { DefaultCatalogPublisher, createCatalogPublisher } from "./publisher";
import type { CatalogEvent } from "./events";
import type { CanonicalProduct, CanonicalProductId } from "../resolution/types";
import type {
  EvaluationResult,
  EvaluationId,
  InferenceId,
  ProductScore
} from "../evaluation/types";
import type { CompliancePostCheckResult, ComplianceCheckId } from "../compliance/types";

function makeProduct(o?: Partial<CanonicalProduct>): CanonicalProduct {
  return {
    id: "canon_001" as unknown as CanonicalProductId,
    identityId: "ident_001" as any,
    clusterId: "cluster_001" as any,
    title: "Wireless Bluetooth Earbuds",
    brand: "Xiaomi",
    canonicalBrandId: "brand_xiaomi",
    category: "ELECTRONICS",
    canonicalCategoryId: "cat_electronics",
    attributes: [
      { name: "COLOR", value: "black", confidence: 0.9, sourceProductId: "n1" as any },
      { name: "SIZE", value: "M", confidence: 0.9, sourceProductId: "n1" as any }
    ],
    images: [
      {
        url: "https://a.com/1.jpg",
        fingerprint: { algorithm: "phash", version: "v1", value: "abc" },
        sourceProductId: "n1" as any
      }
    ],
    priceRange: {
      min: { amount: 2999, currency: "USD" },
      max: { amount: 3999, currency: "USD" },
      currency: "USD"
    },
    offerCount: 3,
    supplierCodes: ["aliexpress", "temu"],
    primaryProductId: "n1" as any,
    builtAt: new Date(),
    schemaVersion: "1.0.0",
    ...o
  };
}

function makeEvaluation(): EvaluationResult {
  return {
    id: "eval_001" as unknown as EvaluationId,
    canonicalProductId: "canon_001" as any,
    inferenceId: "inf_001" as unknown as InferenceId,
    productScore: {
      commercial: 75,
      quality: 80,
      confidence: 85,
      risk: 20,
      trend: 70,
      competition: 60,
      supplier: 75,
      margin: 65,
      compliance: 90,
      overall: 72
    } as ProductScore,
    aiScoreFactors: [],
    recommendation: "publish",
    confidence: 0.85,
    explanation: [],
    evaluatedAt: new Date(),
    schemaVersion: "1.0.0"
  };
}

function makeCompliance(): CompliancePostCheckResult {
  return {
    id: "comp_001" as unknown as ComplianceCheckId,
    canonicalProductId: "canon_001" as any,
    evaluationId: "eval_001" as any,
    status: "approved",
    rules: [],
    finalDecision: {
      action: "publish",
      reason: "ok",
      conditions: [],
      decidedBy: "policy-engine",
      decidedAt: new Date()
    },
    checkedAt: new Date(),
    batchId: "b1" as any,
    schemaVersion: "1.0.0"
  };
}

describe("A2.10 Catalog Materializer + Publisher", () => {
  let repo: ReturnType<typeof createCatalogRepository>;

  beforeEach(() => {
    repo = createCatalogRepository();
  });

  describe("Materializer", () => {
    it("should generate SKU, slug, variants, SEO, pricing", () => {
      const m = new DefaultCatalogMaterializer();
      const entry = m.materialize(makeProduct(), makeEvaluation(), makeCompliance());
      expect(entry.sku).toMatch(/^SKU-/);
      expect(entry.slug).toContain("wireless");
      expect(entry.variants.length).toBeGreaterThan(0);
      expect(entry.seo.metaTitle).toBeTruthy();
      expect(entry.seo.canonicalUrl).toContain("/products/");
      expect(entry.pricing.priceRangeLabel).toBeTruthy();
      expect(entry.schemaVersion).toBe("1.0.0");
    });

    it("should generate variants from COLOR × SIZE", () => {
      const m = new DefaultCatalogMaterializer();
      const entry = m.materialize(makeProduct(), makeEvaluation(), makeCompliance());
      expect(entry.variants.length).toBe(1); // 1 color × 1 size
    });

    it("should mark first image as primary", () => {
      const m = new DefaultCatalogMaterializer();
      const entry = m.materialize(makeProduct(), makeEvaluation(), makeCompliance());
      expect(entry.images[0]!.isPrimary).toBe(true);
    });

    it("should carry evaluationSummary", () => {
      const m = new DefaultCatalogMaterializer();
      const entry = m.materialize(makeProduct(), makeEvaluation(), makeCompliance());
      expect(entry.evaluationSummary.overallScore).toBe(72);
      expect(entry.evaluationSummary.complianceStatus).toBe("approved");
    });
  });

  describe("Publisher", () => {
    it("should publish to internal destination", async () => {
      const m = new DefaultCatalogMaterializer();
      const entry = m.materialize(makeProduct(), makeEvaluation(), makeCompliance());
      const p = new DefaultCatalogPublisher("internal");
      const pub = await p.publish(entry);
      expect(pub.status).toBe("published");
      expect(pub.destination).toBe("internal");
      expect(pub.externalId).toBeTruthy();
    });
  });

  describe("Coordinator", () => {
    it("should materialize + publish + emit events", async () => {
      const published: CatalogEvent[] = [];
      const deps: CatalogCoordinatorDeps = {
        repository: repo,
        materializer: createCatalogMaterializer(),
        publishers: new Map([["internal", createCatalogPublisher("internal")]]),
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      };
      const coord = createCatalogCoordinator(deps);

      const result = await coord.process({
        batchId: "b1",
        approved: [
          { product: makeProduct(), evaluation: makeEvaluation(), compliance: makeCompliance() }
        ],
        destinations: ["internal"]
      });

      expect(result.entries.length).toBe(1);
      expect(result.publications.length).toBe(1);
      expect(result.metrics.entriesCreated).toBe(1);
      const types = published.map((e) => e.eventType);
      expect(types).toContain("discovery.catalog.entry_created");
      expect(types).toContain("discovery.catalog.published");
    });

    it("should support multiple destinations", async () => {
      const deps: CatalogCoordinatorDeps = {
        repository: repo,
        materializer: createCatalogMaterializer(),
        publishers: new Map([
          ["internal", createCatalogPublisher("internal")],
          ["shopify", createCatalogPublisher("shopify")]
        ])
      };
      const coord = createCatalogCoordinator(deps);

      const result = await coord.process({
        batchId: "b1",
        approved: [
          { product: makeProduct(), evaluation: makeEvaluation(), compliance: makeCompliance() }
        ],
        destinations: ["internal", "shopify"]
      });

      expect(result.publications.length).toBe(2);
      expect(result.publications.map((p) => p.destination).sort()).toEqual(["internal", "shopify"]);
    });

    it("should persist entries in repository", async () => {
      const deps: CatalogCoordinatorDeps = {
        repository: repo,
        materializer: createCatalogMaterializer(),
        publishers: new Map([["internal", createCatalogPublisher("internal")]])
      };
      const coord = createCatalogCoordinator(deps);

      await coord.process({
        batchId: "b1",
        approved: [
          { product: makeProduct(), evaluation: makeEvaluation(), compliance: makeCompliance() }
        ],
        destinations: ["internal"]
      });

      expect(repo.entryCount).toBe(1);
      expect(repo.publicationCount).toBe(1);
    });
  });
});
