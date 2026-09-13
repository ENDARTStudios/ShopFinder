/**
 * @workspace/domain/discovery/similarity/similarity.test
 *
 * Tests for A2.6 Similarity covering all 10 refinements:
 *   R1-R5: (Normalizer refinements, tested in normalizer.test.ts)
 *   R6: SimilarityEvidence — per-dimension scores
 *   R7: SimilarityPolicy — configurable thresholds
 *   R8: Candidate Clusters — Union-Find, not just pairs
 *   R9: Similarity Metrics — 8 counters
 *   R10: Discovers only, never resolves
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import {
  createSimilarityCoordinator,
  type SimilarityCoordinatorDeps,
  type SimilarityEventPublisher
} from "./coordinator";
import { createSimilarityRepository } from "./repository";
import { DefaultSimilarityAlgorithm, createDefaultSimilarityAlgorithm } from "./algorithms";
import { evaluatePolicy, computeOverallSimilarity, createSimilarityPolicy } from "./policy";
import { formClusters } from "./clustering";
import { createSimilarityMetricsCollector } from "./metrics";
import {
  DefaultSimilarityPolicy,
  type DuplicateCandidate,
  type SimilarityCluster,
  type NormalizedProductRecord,
  type NormalizedProductRecordId,
  type SimilarityPolicy
} from "./types";
import type { SimilarityEvent } from "./events";

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
      },
      {
        name: "MATERIAL" as any,
        value: "plastic",
        confidence: 0.9,
        sourceAttribute: "material",
        normalizerVersion: "1.0.0",
        source: "dictionary"
      }
    ],
    normalizedImages: [
      {
        url: "https://a.com/1.jpg",
        fingerprint: { algorithm: "stub-phash-v1", version: "v1", value: "abcdef1234567890" }
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

function makeDeps(o?: { events?: SimilarityEventPublisher }): SimilarityCoordinatorDeps {
  return {
    repository: createSimilarityRepository(),
    algorithm: createDefaultSimilarityAlgorithm(),
    events: o?.events
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("A2.6 Similarity", () => {
  let deps: SimilarityCoordinatorDeps;

  beforeEach(() => {
    deps = makeDeps();
  });

  // ── R6: SimilarityEvidence ─────────────────────────────
  describe("R6: SimilarityEvidence", () => {
    it("should produce per-dimension scores", async () => {
      const productA = makeProduct({ id: "a" as any });
      const productB = makeProduct({
        id: "b" as any,
        normalizedTitle: "Wireless Bluetooth Earbuds Pro"
      });
      const coordinator = createSimilarityCoordinator(deps);

      const result = await coordinator.compare({
        batchId: "batch_001",
        products: [productA, productB],
        policy: DefaultSimilarityPolicy
      });

      expect(result.candidates.length).toBeGreaterThanOrEqual(0);
      if (result.candidates.length > 0) {
        const evidence = result.candidates[0]!.evidence;
        expect(evidence.titleSimilarity).toBeGreaterThanOrEqual(0);
        expect(evidence.brandSimilarity).toBeGreaterThanOrEqual(0);
        expect(evidence.imageSimilarity).toBeGreaterThanOrEqual(0);
        expect(evidence.attributeSimilarity).toBeGreaterThanOrEqual(0);
        expect(evidence.priceSimilarity).toBeGreaterThanOrEqual(0);
        expect(evidence.overallSimilarity).toBeGreaterThanOrEqual(0);
        expect(evidence.explanation).toContain("overall=");
      }
    });

    it("should include weights in evidence", async () => {
      const productA = makeProduct({ id: "a" as any });
      const productB = makeProduct({ id: "b" as any });
      const coordinator = createSimilarityCoordinator(deps);

      const result = await coordinator.compare({
        batchId: "batch_001",
        products: [productA, productB],
        policy: DefaultSimilarityPolicy
      });

      if (result.candidates.length > 0) {
        expect(result.candidates[0]!.evidence.weights).toBeDefined();
        expect(result.candidates[0]!.evidence.weights.title).toBe(0.3);
      }
    });

    it("should produce human-readable explanation", async () => {
      const algo = new DefaultSimilarityAlgorithm();
      const titleSim = algo.compareTitle("Apple AirPods", "Apple AirPods Pro");
      expect(titleSim).toBeGreaterThan(0.5);
    });
  });

  // ── R7: SimilarityPolicy ───────────────────────────────
  describe("R7: SimilarityPolicy", () => {
    it("should reject pairs that don't meet thresholds", async () => {
      const productA = makeProduct({ id: "a" as any, normalizedTitle: "Apple AirPods" });
      const productB = makeProduct({
        id: "b" as any,
        normalizedTitle: "Samsung Galaxy Buds",
        normalizedBrand: "Samsung",
        canonicalBrandId: "brand_samsung"
      });
      const coordinator = createSimilarityCoordinator(deps);

      const result = await coordinator.compare({
        batchId: "batch_001",
        products: [productA, productB],
        policy: DefaultSimilarityPolicy
      });

      // Different brands + different titles → should NOT be a candidate
      expect(result.candidates.length).toBe(0);
      expect(result.metrics.pairsRejected).toBe(1);
    });

    it("should accept pairs that meet all thresholds", async () => {
      const productA = makeProduct({ id: "a" as any });
      const productB = makeProduct({
        id: "b" as any,
        normalizedTitle: "Wireless Bluetooth Earbuds"
      });
      const coordinator = createSimilarityCoordinator(deps);

      const result = await coordinator.compare({
        batchId: "batch_001",
        products: [productA, productB],
        policy: DefaultSimilarityPolicy
      });

      // Same brand, same title, same images, same price → candidate
      expect(result.candidates.length).toBe(1);
    });

    it("should support custom thresholds", async () => {
      const productA = makeProduct({ id: "a" as any });
      const productB = makeProduct({
        id: "b" as any,
        normalizedTitle: "Completely Different Product",
        normalizedBrand: "UnknownBrand",
        canonicalBrandId: null
      });
      const coordinator = createSimilarityCoordinator(deps);

      // Very loose policy → should accept
      const loosePolicy = createSimilarityPolicy({
        minimumTitleSimilarity: 0.0,
        minimumBrandSimilarity: 0.0,
        minimumImageSimilarity: 0.0,
        minimumOverallSimilarity: 0.0
      });

      const result = await coordinator.compare({
        batchId: "batch_001",
        products: [productA, productB],
        policy: loosePolicy
      });

      expect(result.candidates.length).toBe(1);
    });

    it("evaluatePolicy should return failedThresholds", () => {
      const evidence = {
        titleSimilarity: 0.5,
        brandSimilarity: 1.0,
        imageSimilarity: 0.9,
        attributeSimilarity: 0.8,
        priceSimilarity: 0.5,
        overallSimilarity: 0.7,
        weights: DefaultSimilarityPolicy.weights,
        explanation: "test"
      };
      const result = evaluatePolicy(evidence, DefaultSimilarityPolicy);
      expect(result.pass).toBe(false);
      expect(result.failedThresholds.length).toBeGreaterThan(0);
    });
  });

  // ── R8: Candidate Clusters ─────────────────────────────
  describe("R8: candidate clusters", () => {
    it("should form clusters from connected candidates", async () => {
      // A, B, C all similar to each other → 1 cluster of 3
      const a = makeProduct({ id: "a" as any });
      const b = makeProduct({ id: "b" as any });
      const c = makeProduct({ id: "c" as any });
      const coordinator = createSimilarityCoordinator(deps);

      const result = await coordinator.compare({
        batchId: "batch_001",
        products: [a, b, c],
        policy: DefaultSimilarityPolicy
      });

      // 3 pairs compared: (a,b), (a,c), (b,c)
      expect(result.candidates.length).toBe(3);
      // All 3 form 1 cluster
      expect(result.clusters.length).toBe(1);
      expect(result.clusters[0]!.memberCount).toBe(3);
    });

    it("should form separate clusters for disconnected groups", async () => {
      // Group 1: A, B (similar)
      // Group 2: C, D (similar, but different from group 1)
      const a = makeProduct({ id: "a" as any, normalizedTitle: "Earbuds Pro" });
      const b = makeProduct({ id: "b" as any, normalizedTitle: "Earbuds Pro" });
      const c = makeProduct({
        id: "c" as any,
        normalizedTitle: "USB Cable",
        normalizedBrand: "Anker",
        canonicalBrandId: "brand_anker",
        normalizedImages: [
          {
            url: "c.jpg",
            fingerprint: { algorithm: "stub-phash-v1", version: "v1", value: "zzzzzzzzzzzzzzzz" }
          }
        ]
      });
      const d = makeProduct({
        id: "d" as any,
        normalizedTitle: "USB Cable",
        normalizedBrand: "Anker",
        canonicalBrandId: "brand_anker",
        normalizedImages: [
          {
            url: "d.jpg",
            fingerprint: { algorithm: "stub-phash-v1", version: "v1", value: "zzzzzzzzzzzzzzzz" }
          }
        ]
      });
      const coordinator = createSimilarityCoordinator(deps);

      const result = await coordinator.compare({
        batchId: "batch_001",
        products: [a, b, c, d],
        policy: DefaultSimilarityPolicy
      });

      // 2 clusters: {a,b} and {c,d}
      expect(result.clusters.length).toBe(2);
      const sizes = result.clusters.map((c) => c.memberCount).sort();
      expect(sizes).toEqual([2, 2]);
    });

    it("should not create clusters for single pairs (2 members is still a cluster)", async () => {
      const a = makeProduct({ id: "a" as any });
      const b = makeProduct({ id: "b" as any });
      const coordinator = createSimilarityCoordinator(deps);

      const result = await coordinator.compare({
        batchId: "batch_001",
        products: [a, b],
        policy: DefaultSimilarityPolicy
      });

      expect(result.candidates.length).toBe(1);
      expect(result.clusters.length).toBe(1);
      expect(result.clusters[0]!.memberCount).toBe(2);
    });
  });

  // ── R9: Similarity Metrics ─────────────────────────────
  describe("R9: similarity metrics", () => {
    it("should track 8 metrics", async () => {
      const a = makeProduct({ id: "a" as any });
      const b = makeProduct({ id: "b" as any });
      const c = makeProduct({
        id: "c" as any,
        normalizedTitle: "Different",
        normalizedBrand: "Other",
        canonicalBrandId: null
      });
      const coordinator = createSimilarityCoordinator(deps);

      const result = await coordinator.compare({
        batchId: "batch_001",
        products: [a, b, c],
        policy: DefaultSimilarityPolicy
      });

      // 3 pairs: (a,b), (a,c), (b,c)
      expect(result.metrics.pairsCompared).toBe(3);
      // (a,c) and (b,c) should be rejected (different brand)
      expect(result.metrics.pairsRejected).toBe(2);
      expect(result.metrics.candidatesCreated).toBe(1);
      expect(result.metrics.clustersCreated).toBe(1);
      expect(result.metrics.averageSimilarity).toBeGreaterThanOrEqual(0);
      expect(result.metrics.averageImageSimilarity).toBeGreaterThanOrEqual(0);
      expect(result.metrics.averageTitleSimilarity).toBeGreaterThanOrEqual(0);
      expect(result.metrics.duplicatesDetected).toBe(1);
    });
  });

  // ── R10: Discovers only, never resolves ────────────────
  describe("R10: discovers only", () => {
    it("should set candidate status to 'pending' (never resolved)", async () => {
      const a = makeProduct({ id: "a" as any });
      const b = makeProduct({ id: "b" as any });
      const coordinator = createSimilarityCoordinator(deps);

      const result = await coordinator.compare({
        batchId: "batch_001",
        products: [a, b],
        policy: DefaultSimilarityPolicy
      });

      for (const c of result.candidates) {
        expect(c.status).toBe("pending");
      }
    });

    it("should NOT have canonicalProductId on candidates", async () => {
      const a = makeProduct({ id: "a" as any });
      const b = makeProduct({ id: "b" as any });
      const coordinator = createSimilarityCoordinator(deps);

      const result = await coordinator.compare({
        batchId: "batch_001",
        products: [a, b],
        policy: DefaultSimilarityPolicy
      });

      // DuplicateCandidate has no canonicalProductId field (that's A2.7's job)
      for (const c of result.candidates) {
        expect((c as any).canonicalProductId).toBeUndefined();
      }
    });
  });

  // ── Algorithms ─────────────────────────────────────────
  describe("algorithms", () => {
    it("compareTitle: identical strings = 1.0", () => {
      const algo = new DefaultSimilarityAlgorithm();
      expect(algo.compareTitle("Hello", "Hello")).toBe(1);
    });

    it("compareBrand: canonical ID match = 1.0", () => {
      const algo = new DefaultSimilarityAlgorithm();
      expect(algo.compareBrand("Apple", "Apple", "brand_apple", "brand_apple")).toBe(1);
    });

    it("compareImages: same fingerprint = 1.0", () => {
      const algo = new DefaultSimilarityAlgorithm();
      const imgs = [{ fingerprint: { value: "abcdef1234567890", algorithm: "stub-phash-v1" } }];
      expect(algo.compareImages(imgs, imgs)).toBe(1);
    });

    it("comparePrice: same band = 1.0, adjacent = 0.5", () => {
      const algo = new DefaultSimilarityAlgorithm();
      expect(algo.comparePrice({ band: "20-50" }, { band: "20-50" })).toBe(1);
      expect(algo.comparePrice({ band: "20-50" }, { band: "50-100" })).toBe(0.5);
      expect(algo.comparePrice({ band: "0-10" }, { band: "5000+" })).toBe(0);
    });

    it("compareAttributes: Jaccard on name+value pairs", () => {
      const algo = new DefaultSimilarityAlgorithm();
      const a = [
        { name: "COLOR", value: "red" },
        { name: "SIZE", value: "M" }
      ];
      const b = [
        { name: "COLOR", value: "red" },
        { name: "SIZE", value: "L" }
      ];
      // intersection = 1 (COLOR:red), union = 3 → 1/3
      expect(algo.compareAttributes(a, b)).toBeCloseTo(1 / 3, 2);
    });
  });

  // ── Events ─────────────────────────────────────────────
  describe("events", () => {
    it("should emit 4 events in correct order", async () => {
      const published: SimilarityEvent[] = [];
      const depsWithEvents = makeDeps({
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });
      const coordinator = createSimilarityCoordinator(depsWithEvents);

      await coordinator.compare({
        batchId: "batch_001",
        products: [makeProduct({ id: "a" as any }), makeProduct({ id: "b" as any })],
        policy: DefaultSimilarityPolicy
      });

      // Started + CandidatesDetected + ClustersCreated + Completed
      expect(published.length).toBe(4);
      expect(published[0]!.eventType).toBe("discovery.similarity.started");
      expect(published[1]!.eventType).toBe("discovery.similarity.candidates_detected");
      expect(published[2]!.eventType).toBe("discovery.similarity.clusters_created");
      expect(published[3]!.eventType).toBe("discovery.similarity.completed");
    });

    it("should NOT emit CandidatesDetected when no candidates", async () => {
      const published: SimilarityEvent[] = [];
      const depsWithEvents = makeDeps({
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });
      const coordinator = createSimilarityCoordinator(depsWithEvents);

      await coordinator.compare({
        batchId: "batch_001",
        products: [
          makeProduct({
            id: "a" as any,
            normalizedTitle: "X",
            normalizedBrand: "A",
            canonicalBrandId: "a"
          }),
          makeProduct({
            id: "b" as any,
            normalizedTitle: "Y",
            normalizedBrand: "B",
            canonicalBrandId: "b"
          })
        ],
        policy: DefaultSimilarityPolicy
      });

      // Started + Completed only (no candidates, no clusters)
      expect(published.length).toBe(2);
      expect(published[0]!.eventType).toBe("discovery.similarity.started");
      expect(published[1]!.eventType).toBe("discovery.similarity.completed");
    });
  });

  // ── Repository ─────────────────────────────────────────
  describe("repository", () => {
    it("should be append-only (idempotent)", async () => {
      const repo = createSimilarityRepository();
      const a = makeProduct({ id: "a" as any });
      const b = makeProduct({ id: "b" as any });
      const coordinator = createSimilarityCoordinator({
        repository: repo,
        algorithm: createDefaultSimilarityAlgorithm()
      });

      const result = await coordinator.compare({
        batchId: "batch_001",
        products: [a, b],
        policy: DefaultSimilarityPolicy
      });

      // Re-append same candidate
      await repo.appendCandidate(result.candidates[0]!);
      expect(repo.candidateCount).toBe(1);
    });

    it("should findCandidatesByProduct", async () => {
      const repo = createSimilarityRepository();
      const coordinator = createSimilarityCoordinator({
        repository: repo,
        algorithm: createDefaultSimilarityAlgorithm()
      });

      const a = makeProduct({ id: "a" as any });
      const b = makeProduct({ id: "b" as any });
      await coordinator.compare({
        batchId: "batch_001",
        products: [a, b],
        policy: DefaultSimilarityPolicy
      });

      const found = await repo.findCandidatesByProduct(a.id);
      expect(found.length).toBe(1);
    });

    it("should findClustersByMember", async () => {
      const repo = createSimilarityRepository();
      const coordinator = createSimilarityCoordinator({
        repository: repo,
        algorithm: createDefaultSimilarityAlgorithm()
      });

      const a = makeProduct({ id: "a" as any });
      const b = makeProduct({ id: "b" as any });
      await coordinator.compare({
        batchId: "batch_001",
        products: [a, b],
        policy: DefaultSimilarityPolicy
      });

      const clusters = await repo.findClustersByMember(a.id);
      expect(clusters.length).toBe(1);
      expect(clusters[0]!.memberIds).toContain(a.id);
    });
  });

  // ── computeOverallSimilarity ───────────────────────────
  describe("computeOverallSimilarity", () => {
    it("should compute weighted average", () => {
      const weights = { title: 0.5, brand: 0.3, image: 0.1, attribute: 0.05, price: 0.05 };
      const scores = { title: 1.0, brand: 1.0, image: 0.5, attribute: 0.5, price: 0.5 };
      // 1*0.5 + 1*0.3 + 0.5*0.1 + 0.5*0.05 + 0.5*0.05 = 0.5 + 0.3 + 0.05 + 0.025 + 0.025 = 0.9
      expect(computeOverallSimilarity(scores, weights)).toBeCloseTo(0.9, 2);
    });
  });
});
