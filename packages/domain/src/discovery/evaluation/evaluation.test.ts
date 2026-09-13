/**
 * @workspace/domain/discovery/evaluation/evaluation.test
 *
 * Tests for A2.8 AI Evaluation covering all 10 acceptance criteria:
 *   1. IA executa apenas para CanonicalProduct
 *   2. InferenceArtifact persistido separadamente
 *   3. EvaluationResult independente do modelo
 *   4. Cache por versão de produto/modelo/prompt/schema
 *   5. ProductScore composto por 9 componentes
 *   6. DecisionProvider determinístico
 *   7. PolicyEngine continua decidindo publicação
 *   8. Nenhuma chamada ao catálogo
 *   9. Nenhuma alteração em CanonicalProduct
 *  10. Eventos separados para inferência e avaliação
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import {
  createEvaluationCoordinator,
  type EvaluationCoordinatorDeps,
  type EvaluationEventPublisher
} from "./coordinator";
import { createEvaluationRepository } from "./repository";
import { StubInferenceProvider, createStubInferenceProvider } from "./inference-provider";
import { DefaultDecisionProvider, createDefaultDecisionProvider } from "./decision-provider";
import { DefaultPolicyEngine, createDefaultPolicyEngine } from "./policy";
import { DefaultCompliancePreCheck } from "./compliance-check";
import { createInferenceCache } from "./cache";
import {
  computeOverallScore,
  buildProductScore,
  factorsToScore,
  DEFAULT_SCORE_WEIGHTS
} from "./scores";
import type { EvaluationEvent } from "./events";
import type {
  CanonicalProduct,
  CanonicalProductId,
  InferenceArtifact,
  EvaluationResult,
  ProductScore
} from "./types";

// ── Fixtures ───────────────────────────────────────────────

function makeCanonicalProduct(o?: Partial<CanonicalProduct>): CanonicalProduct {
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
      { name: "COLOR", value: "black", confidence: 0.9, sourceProductId: "norm_001" as any }
    ],
    images: [
      {
        url: "https://a.com/1.jpg",
        fingerprint: { algorithm: "phash", version: "v1", value: "abc123" },
        sourceProductId: "norm_001" as any
      }
    ],
    priceRange: {
      min: { amount: 2999, currency: "USD" },
      max: { amount: 3999, currency: "USD" },
      currency: "USD"
    },
    offerCount: 3,
    supplierCodes: ["aliexpress", "temu"],
    primaryProductId: "norm_001" as any,
    builtAt: new Date(),
    schemaVersion: "1.0.0",
    ...o
  };
}

function makeDeps(o?: { events?: EvaluationEventPublisher }): {
  deps: EvaluationCoordinatorDeps;
  repo: ReturnType<typeof createEvaluationRepository>;
} {
  const repo = createEvaluationRepository();
  const deps: EvaluationCoordinatorDeps = {
    repository: repo,
    inferenceProvider: createStubInferenceProvider(),
    decisionProvider: createDefaultDecisionProvider(),
    policyEngine: createDefaultPolicyEngine(),
    cache: createInferenceCache(),
    events: o?.events
  };
  return { deps, repo };
}

// ── Tests ──────────────────────────────────────────────────

describe("A2.8 AI Evaluation", () => {
  let deps: EvaluationCoordinatorDeps;
  let repo: ReturnType<typeof createEvaluationRepository>;

  beforeEach(() => {
    const result = makeDeps();
    deps = result.deps;
    repo = result.repo;
  });

  // ── 1. IA only for CanonicalProduct ─────────────────────
  describe("IA only for CanonicalProduct", () => {
    it("should evaluate CanonicalProduct and produce EvaluationResult", async () => {
      const product = makeCanonicalProduct();
      const coordinator = createEvaluationCoordinator(deps);

      const result = await coordinator.evaluate({
        batchId: "batch_001",
        products: [product]
      });

      expect(result.evaluations.length).toBe(1);
      expect(result.evaluations[0]!.canonicalProductId).toBe(product.id);
    });
  });

  // ── 2. InferenceArtifact persisted separately ───────────
  describe("InferenceArtifact", () => {
    it("should persist InferenceArtifact separately from EvaluationResult", async () => {
      const product = makeCanonicalProduct();
      const coordinator = createEvaluationCoordinator(deps);

      const result = await coordinator.evaluate({
        batchId: "batch_001",
        products: [product]
      });

      const evalResult = result.evaluations[0]!;
      const inference = await repo.findInference(evalResult.inferenceId);

      expect(inference).not.toBeNull();
      expect(inference!.modelId).toBe("stub-model");
      expect(inference!.rawResponse).toBeDefined();
      // InferenceArtifact has raw response; EvaluationResult does NOT
      expect((evalResult as any).rawResponse).toBeUndefined();
    });

    it("should carry model metadata on InferenceArtifact", async () => {
      const product = makeCanonicalProduct();
      const coordinator = createEvaluationCoordinator(deps);

      await coordinator.evaluate({ batchId: "batch_001", products: [product] });

      expect(repo.inferenceCount).toBe(1);
      const evalResult = await repo.findEvaluationByProduct(product.id);
      const inference = await repo.findInference(evalResult!.inferenceId);
      expect(inference!.modelId).toBeTruthy();
      expect(inference!.modelVersion).toBeTruthy();
      expect(inference!.promptVersion).toBeTruthy();
      expect(inference!.latencyMs).toBeGreaterThanOrEqual(0);
      expect(inference!.inputTokens).toBeGreaterThan(0);
      expect(inference!.outputTokens).toBeGreaterThan(0);
      expect(inference!.estimatedCost.amount).toBeGreaterThanOrEqual(0);
    });
  });

  // ── 3. EvaluationResult model-independent ───────────────
  describe("EvaluationResult", () => {
    it("should NOT carry raw model response", async () => {
      const product = makeCanonicalProduct();
      const coordinator = createEvaluationCoordinator(deps);

      const result = await coordinator.evaluate({ batchId: "batch_001", products: [product] });

      const evalResult = result.evaluations[0]!;
      expect(evalResult.productScore).toBeDefined();
      expect(evalResult.aiScoreFactors).toBeDefined();
      expect(evalResult.recommendation).toBeDefined();
      expect(evalResult.confidence).toBeDefined();
      expect(evalResult.explanation).toBeDefined();
      // NO rawResponse, NO modelId, NO inputTokens
      expect((evalResult as any).rawResponse).toBeUndefined();
      expect((evalResult as any).modelId).toBeUndefined();
      expect((evalResult as any).inputTokens).toBeUndefined();
    });

    it("should carry schemaVersion", async () => {
      const product = makeCanonicalProduct();
      const coordinator = createEvaluationCoordinator(deps);

      const result = await coordinator.evaluate({ batchId: "batch_001", products: [product] });
      expect(result.evaluations[0]!.schemaVersion).toBe("1.0.0");
    });
  });

  // ── 4. Cache by versions ────────────────────────────────
  describe("InferenceCache", () => {
    it("should reuse cached EvaluationResult on second run", async () => {
      const product = makeCanonicalProduct();
      const coordinator = createEvaluationCoordinator(deps);

      // First run — inference
      const r1 = await coordinator.evaluate({ batchId: "batch_001", products: [product] });
      expect(r1.metrics.inferencesRun).toBe(1);
      expect(r1.metrics.inferencesCached).toBe(0);

      // Second run — cache hit
      const r2 = await coordinator.evaluate({ batchId: "batch_002", products: [product] });
      expect(r2.metrics.inferencesRun).toBe(0);
      expect(r2.metrics.inferencesCached).toBe(1);
    });

    it("should re-run inference when modelVersion changes", async () => {
      const cache = createInferenceCache();

      // Set a cache entry with model v1
      const key1 = cache.buildKey({
        canonicalProductVersion: "v1",
        modelVersion: "1.0.0",
        promptVersion: "v1",
        schemaVersion: "1.0.0"
      });
      cache.set(key1, "inf_1" as any, "eval_1" as any, "canon_1" as any);

      // Look up with model v2 — should miss
      const key2 = cache.buildKey({
        canonicalProductVersion: "v1",
        modelVersion: "2.0.0", // bumped
        promptVersion: "v1",
        schemaVersion: "1.0.0"
      });
      expect(cache.get(key1)).not.toBeNull(); // hit
      expect(cache.get(key2)).toBeNull(); // miss — different model version
    });
  });

  // ── 5. ProductScore 9 components ────────────────────────
  describe("ProductScore", () => {
    it("should have 9 independent components + derived overall", () => {
      const score = buildProductScore({
        commercial: 80,
        quality: 75,
        confidence: 85,
        risk: 30,
        trend: 70,
        competition: 60,
        supplier: 75,
        margin: 65,
        compliance: 90
      });

      expect(score.commercial).toBe(80);
      expect(score.quality).toBe(75);
      expect(score.confidence).toBe(85);
      expect(score.risk).toBe(30);
      expect(score.trend).toBe(70);
      expect(score.competition).toBe(60);
      expect(score.supplier).toBe(75);
      expect(score.margin).toBe(65);
      expect(score.compliance).toBe(90);
      expect(score.overall).toBeGreaterThan(0);
      expect(score.overall).toBeLessThanOrEqual(100);
    });

    it("should invert risk in overall computation", () => {
      const lowRisk = buildProductScore({
        commercial: 50,
        quality: 50,
        confidence: 50,
        risk: 10,
        trend: 50,
        competition: 50,
        supplier: 50,
        margin: 50,
        compliance: 50
      });
      const highRisk = buildProductScore({
        commercial: 50,
        quality: 50,
        confidence: 50,
        risk: 90,
        trend: 50,
        competition: 50,
        supplier: 50,
        margin: 50,
        compliance: 50
      });
      // Lower risk → higher overall
      expect(lowRisk.overall).toBeGreaterThan(highRisk.overall);
    });

    it("should produce EvaluationResult with ProductScore", async () => {
      const product = makeCanonicalProduct();
      const coordinator = createEvaluationCoordinator(deps);

      const result = await coordinator.evaluate({ batchId: "batch_001", products: [product] });
      const score = result.evaluations[0]!.productScore;

      expect(score.commercial).toBeGreaterThanOrEqual(0);
      expect(score.quality).toBeGreaterThanOrEqual(0);
      expect(score.compliance).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeGreaterThanOrEqual(0);
    });
  });

  // ── 6. DecisionProvider deterministic ───────────────────
  describe("DecisionProvider", () => {
    it("should produce same EvaluationResult for same artifact + product", async () => {
      const product = makeCanonicalProduct();
      const coordinator = createEvaluationCoordinator(deps);

      const r1 = await coordinator.evaluate({ batchId: "b1", products: [product] });
      const r2 = await coordinator.evaluate({ batchId: "b2", products: [product] });

      // Second run is cached, so evaluation is the same
      expect(r1.evaluations[0]!.id).toBe(r2.evaluations[0]!.id);
      expect(r1.evaluations[0]!.productScore.overall).toBe(r2.evaluations[0]!.productScore.overall);
    });
  });

  // ── 7. PolicyEngine decides ─────────────────────────────
  describe("PolicyEngine", () => {
    it("should produce ApprovalDecision (publish/review/reject)", async () => {
      const product = makeCanonicalProduct();
      const coordinator = createEvaluationCoordinator(deps);

      const result = await coordinator.evaluate({ batchId: "batch_001", products: [product] });

      expect(result.decisions.length).toBe(1);
      const decision = result.decisions[0]!.decision;
      expect(["publish", "review", "reject"]).toContain(decision.action);
      expect(decision.reason).toBeTruthy();
      expect(decision.decidedBy).toBe("policy-engine");
    });

    it("should persist DecisionTrace with rule results", async () => {
      const product = makeCanonicalProduct();
      const coordinator = createEvaluationCoordinator(deps);

      const result = await coordinator.evaluate({ batchId: "batch_001", products: [product] });

      const trace = await repo.findTraceByEvaluation(result.evaluations[0]!.id);
      expect(trace).not.toBeNull();
      expect(trace!.ruleResults.length).toBeGreaterThan(0);
      expect(trace!.finalDecision).toBeDefined();
      expect(trace!.policyVersion).toBe("1.0.0");
    });

    it("should reject products with low compliance", async () => {
      // Use a custom provider that returns low compliance
      const lowComplianceProvider: import("./types").InferenceProvider = {
        modelId: "test",
        modelVersion: "1.0.0",
        promptVersion: "v1",
        async infer(product) {
          return {
            id: `inf_${product.id}` as any,
            canonicalProductId: product.id,
            modelId: "test",
            modelVersion: "1.0.0",
            promptVersion: "v1",
            schemaVersion: "1.0.0",
            startedAt: new Date(),
            completedAt: new Date(),
            latencyMs: 10,
            inputTokens: 100,
            outputTokens: 50,
            estimatedCost: { amount: 1, currency: "USD" },
            rawResponse: {
              scores: {
                commercial: 50,
                quality: 50,
                confidence: 50,
                risk: 50,
                trend: 50,
                competition: 50,
                supplier: 50,
                margin: 50,
                compliance: 30
              },
              factors: [],
              recommendation: "reject",
              confidence: 0.4,
              explanation: ["low compliance"]
            }
          };
        }
      };
      const cache = createInferenceCache();
      const c = createEvaluationCoordinator({
        repository: createEvaluationRepository(),
        inferenceProvider: lowComplianceProvider,
        decisionProvider: createDefaultDecisionProvider(),
        policyEngine: createDefaultPolicyEngine(),
        cache
      });

      const result = await c.evaluate({ batchId: "b1", products: [makeCanonicalProduct()] });
      expect(result.decisions[0]!.decision.action).toBe("reject");
    });
  });

  // ── 8. No catalog calls ─────────────────────────────────
  describe("architectural invariants", () => {
    it("should NOT have catalog/repository dependencies in deps", () => {
      const keys = Object.keys(deps);
      expect(keys).not.toContain("catalogRepository");
      expect(keys).not.toContain("productRepository");
      expect(keys).not.toContain("db");
    });

    it("should NOT modify CanonicalProduct", async () => {
      const product = makeCanonicalProduct();
      const productCopy = {
        ...product,
        attributes: [...product.attributes],
        images: [...product.images]
      };
      const coordinator = createEvaluationCoordinator(deps);

      await coordinator.evaluate({ batchId: "batch_001", products: [product] });

      expect(product).toEqual(productCopy);
    });
  });

  // ── 9. Compliance PreCheck ──────────────────────────────
  describe("Compliance PreCheck", () => {
    it("should block products with empty title", async () => {
      const product = makeCanonicalProduct({ title: "" });
      const coordinator = createEvaluationCoordinator(deps);

      const result = await coordinator.evaluate({ batchId: "batch_001", products: [product] });

      expect(result.blocked.length).toBe(1);
      expect(result.evaluations.length).toBe(0);
      expect(result.metrics.productsBlocked).toBe(1);
      expect(result.metrics.inferencesRun).toBe(0); // no inference wasted
    });

    it("should block products with prohibited keywords", async () => {
      const product = makeCanonicalProduct({ title: "Counterfeit AirPods" });
      const coordinator = createEvaluationCoordinator(deps);

      const result = await coordinator.evaluate({ batchId: "batch_001", products: [product] });

      expect(result.blocked.length).toBe(1);
    });

    it("should block products with no images", async () => {
      const product = makeCanonicalProduct({ images: [] });
      const coordinator = createEvaluationCoordinator(deps);

      const result = await coordinator.evaluate({ batchId: "batch_001", products: [product] });

      expect(result.blocked.length).toBe(1);
    });

    it("should block products with zero price", async () => {
      const product = makeCanonicalProduct({
        priceRange: {
          min: { amount: 0, currency: "USD" },
          max: { amount: 0, currency: "USD" },
          currency: "USD"
        }
      });
      const coordinator = createEvaluationCoordinator(deps);

      const result = await coordinator.evaluate({ batchId: "batch_001", products: [product] });

      expect(result.blocked.length).toBe(1);
    });
  });

  // ── 10. Events separated ────────────────────────────────
  describe("events", () => {
    it("should emit InferenceStarted + InferenceCompleted + EvaluationCompleted", async () => {
      const published: EvaluationEvent[] = [];
      const { deps: depsWithEvents } = makeDeps({
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });
      const coordinator = createEvaluationCoordinator(depsWithEvents);

      await coordinator.evaluate({ batchId: "batch_001", products: [makeCanonicalProduct()] });

      const types = published.map((e) => e.eventType);
      expect(types).toContain("discovery.evaluation.inference_started");
      expect(types).toContain("discovery.evaluation.inference_completed");
      expect(types).toContain("discovery.evaluation.completed");
    });

    it("should emit EvaluationCached for cache hits", async () => {
      const published: EvaluationEvent[] = [];
      const { deps: depsWithEvents } = makeDeps({
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });
      const coordinator = createEvaluationCoordinator(depsWithEvents);

      const product = makeCanonicalProduct();
      // First run
      await coordinator.evaluate({ batchId: "b1", products: [product] });
      published.length = 0;
      // Second run (cache hit)
      await coordinator.evaluate({ batchId: "b2", products: [product] });

      const types = published.map((e) => e.eventType);
      expect(types).toContain("discovery.evaluation.cached");
      expect(types).not.toContain("discovery.evaluation.inference_started");
    });

    it("should emit EvaluationRejected for blocked products", async () => {
      const published: EvaluationEvent[] = [];
      const { deps: depsWithEvents } = makeDeps({
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });
      const coordinator = createEvaluationCoordinator(depsWithEvents);

      await coordinator.evaluate({
        batchId: "b1",
        products: [makeCanonicalProduct({ title: "" })]
      });

      const types = published.map((e) => e.eventType);
      expect(types).toContain("discovery.evaluation.rejected");
      expect(types).not.toContain("discovery.evaluation.inference_started");
    });

    it("should carry versions in event payloads", async () => {
      const published: EvaluationEvent[] = [];
      const { deps: depsWithEvents } = makeDeps({
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });
      const coordinator = createEvaluationCoordinator(depsWithEvents);

      await coordinator.evaluate({ batchId: "b1", products: [makeCanonicalProduct()] });

      const inferenceStarted = published.find(
        (e) => e.eventType === "discovery.evaluation.inference_started"
      )!;
      const payload = inferenceStarted.payload as any;
      expect(payload.schemaVersion).toBe("1.0.0");
      expect(payload.modelVersion).toBeTruthy();
      expect(payload.promptVersion).toBeTruthy();
      expect(payload.decisionProviderVersion).toBeTruthy();
      expect(payload.policyVersion).toBeTruthy();
    });
  });

  // ── Scores module ───────────────────────────────────────
  describe("scores module", () => {
    it("computeOverallScore should weight components", () => {
      const score = computeOverallScore({
        commercial: 100,
        quality: 100,
        confidence: 100,
        risk: 0,
        trend: 100,
        competition: 100,
        supplier: 100,
        margin: 100,
        compliance: 100
      });
      // All 100 except risk=0 (inverted to 100) → overall = 100
      expect(score).toBeCloseTo(100, 0);
    });

    it("factorsToScore should default missing to 50", () => {
      const score = factorsToScore([
        { name: "commercial", value: 80, weight: 1, explanation: "test" }
      ]);
      expect(score.commercial).toBe(80);
      expect(score.quality).toBe(50); // default
    });
  });
});
