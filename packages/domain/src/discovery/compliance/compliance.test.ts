/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import {
  createComplianceCoordinator,
  type ComplianceCoordinatorDeps,
  type ComplianceEventPublisher
} from "./coordinator";
import { createComplianceRepository } from "./repository";
import { DEFAULT_COMPLIANCE_RULES } from "./rules";
import type { ComplianceEvent } from "./events";
import type { CanonicalProduct, CanonicalProductId } from "../resolution/types";
import type {
  EvaluationResult,
  EvaluationId,
  ApprovalDecision,
  InferenceId,
  ProductScore
} from "../evaluation/types";

function makeProduct(o?: Partial<CanonicalProduct>): CanonicalProduct {
  return {
    id: "canon_001" as unknown as CanonicalProductId,
    identityId: "ident_001" as any,
    clusterId: "cluster_001" as any,
    title: "Wireless Earbuds",
    brand: "Xiaomi",
    canonicalBrandId: "brand_xiaomi",
    category: "ELECTRONICS",
    canonicalCategoryId: "cat_electronics",
    attributes: [{ name: "COLOR", value: "black", confidence: 0.9, sourceProductId: "n1" as any }],
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
    supplierCodes: ["aliexpress"],
    primaryProductId: "n1" as any,
    builtAt: new Date(),
    schemaVersion: "1.0.0",
    ...o
  };
}

function makeEvaluation(o?: Partial<EvaluationResult>): EvaluationResult {
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
    schemaVersion: "1.0.0",
    ...o
  };
}

function makeDecision(action: "publish" | "review" | "reject" = "publish"): ApprovalDecision {
  return {
    action,
    reason: "test",
    conditions: [],
    decidedBy: "policy-engine",
    decidedAt: new Date()
  };
}

describe("A2.9 Compliance PostCheck", () => {
  let repo: ReturnType<typeof createComplianceRepository>;
  let deps: ComplianceCoordinatorDeps;

  beforeEach(() => {
    repo = createComplianceRepository();
    deps = { repository: repo };
  });

  it("should approve products that pass all rules", async () => {
    const coord = createComplianceCoordinator(deps);
    const result = await coord.check({
      batchId: "b1",
      evaluations: [
        {
          product: makeProduct(),
          evaluation: makeEvaluation(),
          aiDecision: makeDecision()
        }
      ]
    });
    expect(result.approved.length).toBe(1);
    expect(result.metrics.approved).toBe(1);
  });

  it("should reject products with low compliance score", async () => {
    const coord = createComplianceCoordinator(deps);
    const result = await coord.check({
      batchId: "b1",
      evaluations: [
        {
          product: makeProduct(),
          evaluation: makeEvaluation({
            productScore: {
              commercial: 50,
              quality: 50,
              confidence: 50,
              risk: 50,
              trend: 50,
              competition: 50,
              supplier: 50,
              margin: 50,
              compliance: 30,
              overall: 48
            } as ProductScore
          }),
          aiDecision: makeDecision()
        }
      ]
    });
    expect(result.rejected.length).toBe(1);
  });

  it("should require review for products with warnings (unknown brand)", async () => {
    const coord = createComplianceCoordinator(deps);
    const result = await coord.check({
      batchId: "b1",
      evaluations: [
        {
          product: makeProduct({ brand: "UNKNOWN", canonicalBrandId: null }),
          evaluation: makeEvaluation(),
          aiDecision: makeDecision()
        }
      ]
    });
    expect(result.requiresReview.length).toBe(1);
  });

  it("should emit appropriate events", async () => {
    const published: ComplianceEvent[] = [];
    const depsWithEvents: ComplianceCoordinatorDeps = {
      repository: repo,
      events: {
        async publish(events) {
          published.push(...events);
        }
      }
    };
    const coord = createComplianceCoordinator(depsWithEvents);
    await coord.check({
      batchId: "b1",
      evaluations: [
        { product: makeProduct(), evaluation: makeEvaluation(), aiDecision: makeDecision() }
      ]
    });
    const types = published.map((e) => e.eventType);
    expect(types).toContain("discovery.compliance.post_check_completed");
    expect(types).toContain("discovery.compliance.approved");
  });

  it("should persist results in repository", async () => {
    const coord = createComplianceCoordinator(deps);
    const result = await coord.check({
      batchId: "b1",
      evaluations: [
        { product: makeProduct(), evaluation: makeEvaluation(), aiDecision: makeDecision() }
      ]
    });
    expect(repo.postCheckCount).toBe(1);
    const found = await repo.findPostCheckByProduct(makeProduct().id);
    expect(found).not.toBeNull();
  });

  it("should evaluate all 8 default rules", async () => {
    const coord = createComplianceCoordinator(deps);
    const result = await coord.check({
      batchId: "b1",
      evaluations: [
        { product: makeProduct(), evaluation: makeEvaluation(), aiDecision: makeDecision() }
      ]
    });
    expect(result.results[0]!.rules.length).toBe(8);
    expect(result.metrics.rulesEvaluated).toBe(8);
  });
});
