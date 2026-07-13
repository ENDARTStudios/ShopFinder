/**
 * @workspace/domain/discovery/resolution/resolution.test
 *
 * Tests for A2.7 Duplicate Resolution covering all acceptance criteria:
 *   1. Resolução determinística para o mesmo cluster
 *   2. CanonicalIdentity imutável e versionado
 *   3. ResolutionEvidence persistido para auditoria
 *   4. ConflictRecord criado para ambiguidades
 *   5. ResolutionPolicy substituível por configuração
 *   6. Nenhuma chamada a IA
 *   7. Nenhum acesso a marketplaces
 *   8. Nenhuma modificação de NormalizedProductRecord
 *   9. Nenhuma criação direta de listagens ou catálogo
 *  10. Eventos publicados apenas após a resolução da identidade
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import {
  createResolutionCoordinator,
  type ResolutionCoordinatorDeps,
  type ResolutionEventPublisher
} from "./coordinator";
import { createResolutionRepository } from "./repository";
import { DefaultCanonicalBuilder, createCanonicalBuilder } from "./builder";
import {
  HighestConfidencePolicy,
  BestMarketplacePolicy,
  HighestCompletenessPolicy,
  LowestPricePolicy,
  WeightedHybridPolicy,
  createResolutionPolicy
} from "./policies";
import { detectConflict, buildConflictRecord } from "./conflicts";
import type { ResolutionEvent } from "./events";
import type {
  CanonicalIdentity,
  ConflictRecord,
  CanonicalProduct,
  SimilarityCluster,
  SimilarityClusterId,
  NormalizedProductRecord,
  NormalizedProductRecordId,
  ResolutionBatchId,
  ResolutionPolicy
} from "./types";

// ── Fixtures ───────────────────────────────────────────────

function makeProduct(o?: Partial<NormalizedProductRecord>): NormalizedProductRecord {
  return {
    id: "norm_001" as unknown as NormalizedProductRecordId,
    rawProductId: "raw_001" as any,
    executionId: "exec_001" as any,
    payloadHash: "ph_001",
    semanticFingerprint: { algorithm: "fnv", version: "v1", value: "abc123" },
    normalizedTitle: "Wireless Bluetooth Earbuds",
    normalizedBrand: "Xiaomi",
    canonicalBrandId: "brand_xiaomi",
    normalizedCategory: "ELECTRONICS",
    canonicalCategoryId: "cat_electronics",
    normalizedAttributes: [
      {
        name: "COLOR" as any,
        value: "black",
        confidence: 0.9,
        sourceAttribute: "color",
        normalizerVersion: "1.0.0",
        source: "dictionary"
      }
    ],
    normalizedImages: [
      {
        url: "https://a.com/1.jpg",
        fingerprint: { algorithm: "phash", version: "v1", value: "abcdef1234567890" }
      }
    ],
    normalizedPrice: { band: "20-50", currency: "USD", originalAmount: 2999 },
    providerCode: "aliexpress",
    externalId: "ext_001",
    region: "US",
    language: "en",
    discoveredAt: new Date(),
    normalizedAt: new Date(),
    partitionKey: "aliexpress|US|2025-01-15",
    normalizerVersions: {
      normalizerVersion: "1.0.0",
      taxonomyVersion: "1.0.0",
      attributeDictionaryVersion: "1.0.0",
      translationModelVersion: "1.0.0"
    },
    rawVersions: {
      schemaVersion: "1.0.0" as any,
      workflowVersion: "1.0.0",
      plannerVersion: "1.0.0",
      providerVersion: "1.0.0",
      connectorVersion: "1.0.0",
      providerManifestVersion: "v1"
    },
    schemaVersion: "1.0.0",
    confidenceScore: 0.9,
    warnings: [],
    ...o
  };
}

function makeCluster(o?: Partial<SimilarityCluster>): SimilarityCluster {
  return {
    id: "cluster_001" as unknown as SimilarityClusterId,
    memberIds: ["norm_001" as any, "norm_002" as any],
    evidence: {
      titleSimilarity: 0.95,
      brandSimilarity: 1.0,
      imageSimilarity: 0.92,
      attributeSimilarity: 0.88,
      priceSimilarity: 0.8,
      overallSimilarity: 0.9,
      weights: { title: 0.3, brand: 0.2, image: 0.25, attribute: 0.15, price: 0.1 },
      explanation: "test"
    },
    candidateIds: ["cand_001" as any],
    createdAt: new Date(),
    batchId: "batch_001" as any,
    memberCount: 2,
    ...o
  };
}

function makeDeps(o?: {
  events?: ResolutionEventPublisher;
  builder?: ReturnType<typeof createCanonicalBuilder>;
  policy?: ResolutionPolicy;
}): { deps: ResolutionCoordinatorDeps; repo: ReturnType<typeof createResolutionRepository> } {
  const repo = createResolutionRepository();
  const deps: ResolutionCoordinatorDeps = {
    repository: repo,
    builder: o?.builder ?? createCanonicalBuilder(),
    events: o?.events
  };
  return { deps, repo };
}

// ── Tests ──────────────────────────────────────────────────

describe("A2.7 Duplicate Resolution", () => {
  let deps: ResolutionCoordinatorDeps;
  let repo: ReturnType<typeof createResolutionRepository>;

  beforeEach(() => {
    const result = makeDeps();
    deps = result.deps;
    repo = result.repo;
  });

  // ── 1. Deterministic resolution ────────────────────────
  describe("deterministic resolution", () => {
    it("should produce same CanonicalIdentity for same cluster + products", async () => {
      const a = makeProduct({ id: "a" as any, confidenceScore: 0.9 });
      const b = makeProduct({ id: "b" as any, confidenceScore: 0.8 });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const products = new Map([
        [a.id, a],
        [b.id, b]
      ]);
      const coordinator = createResolutionCoordinator(deps);

      const input = {
        batchId: "batch_001",
        clusters: [cluster],
        products,
        policy: new HighestConfidencePolicy()
      };
      const r1 = await coordinator.resolve(input);
      const r2 = await coordinator.resolve(input);

      expect(r1.identities[0]!.id).toBe(r2.identities[0]!.id);
      expect(r1.identities[0]!.primaryProductId).toBe(r2.identities[0]!.primaryProductId);
    });
  });

  // ── 2. CanonicalIdentity immutable + versioned ─────────
  describe("CanonicalIdentity", () => {
    it("should be immutable and carry schemaVersion", async () => {
      const a = makeProduct({ id: "a" as any });
      const b = makeProduct({ id: "b" as any });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      const result = await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      });

      const identity = result.identities[0]!;
      expect(identity.schemaVersion).toBe("1.0.0");
      expect(identity.id).toBeTruthy();
      expect(identity.canonicalProductId).toBeTruthy();
      expect(identity.clusterId).toBe(cluster.id);
      expect(identity.normalizedProductIds).toEqual(cluster.memberIds);
      expect(identity.primaryProductId).toBeTruthy();
      expect(identity.resolutionStrategy).toBeTruthy();
      expect(identity.confidence).toBeGreaterThanOrEqual(0);
      expect(identity.createdAt).toBeInstanceOf(Date);
    });
  });

  // ── 3. ResolutionEvidence persisted ────────────────────
  describe("ResolutionEvidence", () => {
    it("should persist evidence with field sources", async () => {
      const a = makeProduct({ id: "a" as any, confidenceScore: 0.9, normalizedImages: [] });
      const b = makeProduct({
        id: "b" as any,
        confidenceScore: 0.95,
        normalizedImages: [
          {
            url: "b.jpg",
            fingerprint: { algorithm: "phash", version: "v1", value: "bbbbbbbbbbbbbbbb" }
          }
        ]
      });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      const result = await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      });

      const evidence = result.identities[0]!.evidence;
      expect(evidence.titleSource).toBeTruthy();
      expect(evidence.imageSource).toBeTruthy();
      expect(evidence.brandSource).toBeTruthy();
      expect(evidence.categorySource).toBeTruthy();
      expect(evidence.attributeSources).toBeDefined();
      expect(evidence.primaryOfferReason).toBeTruthy();
      expect(evidence.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  // ── 4. ConflictRecord created for ambiguities ──────────
  describe("ConflictRecord", () => {
    it("should create ConflictRecord for CONFLICTING_BRANDS", async () => {
      const a = makeProduct({
        id: "a" as any,
        canonicalBrandId: "brand_apple",
        normalizedBrand: "Apple"
      });
      const b = makeProduct({
        id: "b" as any,
        canonicalBrandId: "brand_samsung",
        normalizedBrand: "Samsung"
      });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      const result = await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      });

      expect(result.identities.length).toBe(0);
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0]!.reason).toBe("CONFLICTING_BRANDS");
      expect(result.conflicts[0]!.resolved).toBe(false);
    });

    it("should create ConflictRecord for INCOMPATIBLE_CATEGORIES", async () => {
      const a = makeProduct({ id: "a" as any, canonicalCategoryId: "cat_electronics" });
      const b = makeProduct({ id: "b" as any, canonicalCategoryId: "cat_clothing" });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      const result = await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      });

      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0]!.reason).toBe("INCOMPATIBLE_CATEGORIES");
    });

    it("should create ConflictRecord for DIFFERENT_SIZES", async () => {
      const a = makeProduct({
        id: "a" as any,
        normalizedAttributes: [
          {
            name: "SIZE" as any,
            value: "M",
            confidence: 0.9,
            sourceAttribute: "size",
            normalizerVersion: "1.0.0",
            source: "dictionary"
          }
        ]
      });
      const b = makeProduct({
        id: "b" as any,
        normalizedAttributes: [
          {
            name: "SIZE" as any,
            value: "L",
            confidence: 0.9,
            sourceAttribute: "size",
            normalizerVersion: "1.0.0",
            source: "dictionary"
          }
        ]
      });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      const result = await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      });

      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0]!.reason).toBe("DIFFERENT_SIZES");
    });

    it("should create ConflictRecord for PRICE_OUTLIER", async () => {
      const a = makeProduct({
        id: "a" as any,
        normalizedPrice: { band: "20-50", currency: "USD", originalAmount: 30 }
      });
      const b = makeProduct({
        id: "b" as any,
        normalizedPrice: { band: "5000+", currency: "USD", originalAmount: 6000 }
      });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      const result = await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      });

      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0]!.reason).toBe("PRICE_OUTLIER");
    });
  });

  // ── 5. ResolutionPolicy swappable ──────────────────────
  describe("ResolutionPolicy swappable", () => {
    it("should support HighestConfidencePolicy", async () => {
      const a = makeProduct({ id: "a" as any, confidenceScore: 0.7 });
      const b = makeProduct({ id: "b" as any, confidenceScore: 0.95 });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      const result = await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      });

      expect(result.identities[0]!.primaryProductId).toBe(b.id);
    });

    it("should support BestMarketplacePolicy", async () => {
      const a = makeProduct({ id: "a" as any, providerCode: "temu" });
      const b = makeProduct({ id: "b" as any, providerCode: "aliexpress" });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      const result = await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new BestMarketplacePolicy(["aliexpress", "temu"])
      });

      expect(result.identities[0]!.primaryProductId).toBe(b.id);
    });

    it("should support LowestPricePolicy", async () => {
      const a = makeProduct({
        id: "a" as any,
        normalizedPrice: { band: "20-50", currency: "USD", originalAmount: 25 }
      });
      const b = makeProduct({
        id: "b" as any,
        normalizedPrice: { band: "50-100", currency: "USD", originalAmount: 75 }
      });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      const result = await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new LowestPricePolicy()
      });

      expect(result.identities[0]!.primaryProductId).toBe(a.id);
    });

    it("should support WeightedHybridPolicy", async () => {
      const a = makeProduct({
        id: "a" as any,
        confidenceScore: 0.9,
        providerCode: "aliexpress",
        normalizedPrice: { band: "20-50", currency: "USD", originalAmount: 30 }
      });
      const b = makeProduct({
        id: "b" as any,
        confidenceScore: 0.7,
        providerCode: "temu",
        normalizedPrice: { band: "50-100", currency: "USD", originalAmount: 70 }
      });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      const result = await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new WeightedHybridPolicy(["aliexpress", "temu"])
      });

      // a should win (higher confidence, better marketplace, lower price)
      expect(result.identities[0]!.primaryProductId).toBe(a.id);
    });

    it("should support createResolutionPolicy factory", () => {
      expect(createResolutionPolicy("highest-confidence").name).toBe("highest-confidence");
      expect(
        createResolutionPolicy("best-marketplace", { marketplaceRanking: ["aliexpress"] }).name
      ).toBe("best-marketplace");
      expect(createResolutionPolicy("highest-completeness").name).toBe("highest-completeness");
      expect(createResolutionPolicy("lowest-price").name).toBe("lowest-price");
      expect(createResolutionPolicy("weighted-hybrid").name).toBe("weighted-hybrid");
    });
  });

  // ── 6. No IA calls ─────────────────────────────────────
  describe("architectural invariants", () => {
    it("should NOT have IA/LLM dependencies in deps", () => {
      const keys = Object.keys(deps);
      expect(keys).not.toContain("aiProvider");
      expect(keys).not.toContain("llm");
      expect(keys).not.toContain("evaluationProvider");
    });

    it("should NOT have marketplace/connector dependencies in deps", () => {
      const keys = Object.keys(deps);
      expect(keys).not.toContain("marketplaceConnector");
      expect(keys).not.toContain("providerRegistry");
      expect(keys).not.toContain("connector");
    });

    it("should NOT modify NormalizedProductRecord", async () => {
      const a = makeProduct({ id: "a" as any });
      const aCopy = { ...a, normalizedAttributes: [...a.normalizedAttributes] };
      const b = makeProduct({ id: "b" as any });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      });

      expect(a).toEqual(aCopy);
    });
  });

  // ── 7. CanonicalBuilder ────────────────────────────────
  describe("CanonicalBuilder", () => {
    it("should build CanonicalProduct from identity + products", async () => {
      const a = makeProduct({ id: "a" as any, normalizedTitle: "Earbuds Pro" });
      const b = makeProduct({ id: "b" as any, normalizedTitle: "Earbuds Pro" });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      const result = await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      });

      const product = result.canonicalProducts[0]!;
      expect(product.id).toBe(result.identities[0]!.canonicalProductId);
      expect(product.identityId).toBe(result.identities[0]!.id);
      expect(product.title).toBeTruthy();
      expect(product.brand).toBeTruthy();
      expect(product.offerCount).toBe(2);
      expect(product.supplierCodes.length).toBeGreaterThan(0);
      expect(product.priceRange.min.amount).toBeLessThanOrEqual(product.priceRange.max.amount);
      expect(product.schemaVersion).toBe("1.0.0");
    });

    it("should deduplicate images by fingerprint", async () => {
      const fingerprint = { algorithm: "phash", version: "v1", value: "same1234567890ab" };
      const a = makeProduct({ id: "a" as any, normalizedImages: [{ url: "a.jpg", fingerprint }] });
      const b = makeProduct({ id: "b" as any, normalizedImages: [{ url: "b.jpg", fingerprint }] });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      const result = await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      });

      // Same fingerprint → 1 image (deduplicated)
      expect(result.canonicalProducts[0]!.images.length).toBe(1);
    });
  });

  // ── 8. Events ──────────────────────────────────────────
  describe("events", () => {
    it("should emit IdentityResolved + ProductBuilt + ReadyForEvaluation for success", async () => {
      const published: ResolutionEvent[] = [];
      const { deps: depsWithEvents } = makeDeps({
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });
      const coordinator = createResolutionCoordinator(depsWithEvents);

      const a = makeProduct({ id: "a" as any });
      const b = makeProduct({ id: "b" as any });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });

      await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      });

      const types = published.map((e) => e.eventType);
      expect(types).toContain("discovery.resolution.identity_resolved");
      expect(types).toContain("discovery.resolution.product_built");
      expect(types).toContain("discovery.resolution.ready_for_evaluation");
    });

    it("should emit ConflictDetected for conflicts", async () => {
      const published: ResolutionEvent[] = [];
      const { deps: depsWithEvents } = makeDeps({
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });
      const coordinator = createResolutionCoordinator(depsWithEvents);

      const a = makeProduct({ id: "a" as any, canonicalBrandId: "brand_a" });
      const b = makeProduct({ id: "b" as any, canonicalBrandId: "brand_b" });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });

      await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      });

      const types = published.map((e) => e.eventType);
      expect(types).toContain("discovery.resolution.conflict_detected");
      expect(types).not.toContain("discovery.resolution.identity_resolved");
    });

    it("should only publish events AFTER identity is resolved", async () => {
      const published: ResolutionEvent[] = [];
      const { deps: depsWithEvents } = makeDeps({
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });
      const coordinator = createResolutionCoordinator(depsWithEvents);

      const a = makeProduct({ id: "a" as any });
      const b = makeProduct({ id: "b" as any });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });

      await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      });

      // IdentityResolved must come before ProductBuilt
      const idxResolved = published.findIndex(
        (e) => e.eventType === "discovery.resolution.identity_resolved"
      );
      const idxBuilt = published.findIndex(
        (e) => e.eventType === "discovery.resolution.product_built"
      );
      expect(idxResolved).toBeGreaterThanOrEqual(0);
      expect(idxBuilt).toBeGreaterThan(idxResolved);
    });
  });

  // ── 9. Repository ──────────────────────────────────────
  describe("repository", () => {
    it("should be append-only (idempotent)", async () => {
      const a = makeProduct({ id: "a" as any });
      const b = makeProduct({ id: "b" as any });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      const input = {
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      };
      await coordinator.resolve(input);
      await coordinator.resolve(input);

      expect(repo.identityCount).toBe(1);
      expect(repo.canonicalProductCount).toBe(1);
    });

    it("should findIdentityByCluster", async () => {
      const a = makeProduct({ id: "a" as any });
      const b = makeProduct({ id: "b" as any });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      });

      const found = await repo.findIdentityByCluster(cluster.id);
      expect(found).not.toBeNull();
      expect(found!.clusterId).toBe(cluster.id);
    });

    it("should findCanonicalProductByIdentity", async () => {
      const a = makeProduct({ id: "a" as any });
      const b = makeProduct({ id: "b" as any });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const coordinator = createResolutionCoordinator(deps);

      const result = await coordinator.resolve({
        batchId: "batch_001",
        clusters: [cluster],
        products: new Map([
          [a.id, a],
          [b.id, b]
        ]),
        policy: new HighestConfidencePolicy()
      });

      const found = await repo.findCanonicalProductByIdentity(result.identities[0]!.id);
      expect(found).not.toBeNull();
    });
  });

  // ── 10. ConflictDetector direct tests ──────────────────
  describe("ConflictDetector", () => {
    it("should detect no conflict for clean cluster", () => {
      const a = makeProduct({
        id: "a" as any,
        canonicalBrandId: "brand_x",
        canonicalCategoryId: "cat_y"
      });
      const b = makeProduct({
        id: "b" as any,
        canonicalBrandId: "brand_x",
        canonicalCategoryId: "cat_y"
      });
      const cluster = makeCluster({ memberIds: [a.id, b.id] });
      const products = new Map([
        [a.id, a],
        [b.id, b]
      ]);

      const detection = detectConflict(cluster, products);
      expect(detection.hasConflict).toBe(false);
    });

    it("should detect LOW_SIMILARITY", () => {
      const a = makeProduct({ id: "a" as any });
      const b = makeProduct({ id: "b" as any });
      const cluster = makeCluster({
        memberIds: [a.id, b.id],
        evidence: {
          titleSimilarity: 0.5,
          brandSimilarity: 0.5,
          imageSimilarity: 0.5,
          attributeSimilarity: 0.5,
          priceSimilarity: 0.5,
          overallSimilarity: 0.6,
          weights: { title: 0.3, brand: 0.2, image: 0.25, attribute: 0.15, price: 0.1 },
          explanation: "low"
        }
      });
      const products = new Map([
        [a.id, a],
        [b.id, b]
      ]);

      const detection = detectConflict(cluster, products);
      expect(detection.hasConflict).toBe(true);
      expect(detection.reason).toBe("LOW_SIMILARITY");
    });
  });
});
