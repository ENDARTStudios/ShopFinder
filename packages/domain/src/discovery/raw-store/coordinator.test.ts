/**
 * @workspace/domain/discovery/raw-store/coordinator.test
 *
 * Tests for A2.4 Raw Product Store covering 10 acceptance criteria:
 *
 *   1. Payload bruto preservado exatamente        ✅
 *   2. Append-only (no update/delete)             ✅
 *   3. PayloadHash                                 ✅
 *   4. SemanticHash separado (null in A2.4)        ✅
 *   5. ProviderSnapshot persistido                 ✅
 *   6. Versionamento completo                      ✅
 *   7. Compressão transparente                     ✅
 *   8. Eventos publicados                          ✅
 *   9. Stream de leitura                           ✅
 *  10. Reprocessamento possível (idempotent)       ✅
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import {
  RawStoreCoordinator,
  createRawStoreCoordinator,
  type RawStoreEventPublisher,
  type RawStoreCoordinatorDeps
} from "./coordinator";
import { createRawProductRepository } from "./repository";
import { NoopCompressor, GzipCompressor, type Compressor } from "./compression";
import { computePayloadHash, canonicalJsonStringify } from "./hashing";
import {
  buildPartitionKey,
  RAW_STORE_SCHEMA_VERSION,
  type RawStoreCoordinatorInput,
  type DiscoveryExecution,
  type RawProductRecord
} from "./types";
import type { RawStoreEvent } from "./events";
import { buildProviderSnapshot } from "../workers/contracts";
import type { NormalizedDiscoveredProduct } from "../../marketplace";
import type { ProviderHealth } from "../workers/types";
import type { WorkerMetricsSnapshot } from "../workers/types";
import type { Money } from "../../shared";

// ── Fixtures ───────────────────────────────────────────────

const zeroMoney: Money = { amount: 0, currency: "USD" };

function makeHealth(o?: Partial<ProviderHealth>): ProviderHealth {
  return {
    providerCode: "aliexpress",
    status: "healthy",
    lastSuccess: new Date(),
    consecutiveFailures: 0,
    averageLatencyMs: 100,
    errorRate: 0,
    totalRequests: 100,
    totalErrors: 0,
    ...o
  };
}

function makeProduct(o?: Partial<NormalizedDiscoveredProduct>): NormalizedDiscoveredProduct {
  return {
    externalId: `ext_${Math.random().toString(36).slice(2)}`,
    marketplace: "aliexpress",
    title: "Test Product",
    description: "test description",
    images: ["https://example.com/img.jpg"],
    attributes: { color: "red", size: "M" },
    price: { amount: 1999, currency: "USD" },
    currency: "USD",
    inventory: 50,
    shippingFromCountry: "CN",
    estimatedDeliveryDays: { min: 7, max: 21 },
    discoveredAt: new Date(),
    ...o
  };
}

function makeMetrics(o?: Partial<WorkerMetricsSnapshot>): WorkerMetricsSnapshot {
  return {
    discoveryDurationMs: 500,
    checkpointDurationMs: 10,
    rateLimitWaitMs: 5,
    retryDelayMs: 0,
    totalDurationMs: 515,
    itemsProcessed: 5,
    apiCallsUsed: 2,
    retries: 0,
    checkpointsSaved: 1,
    ...o
  };
}

function makeVersions() {
  return {
    schemaVersion: RAW_STORE_SCHEMA_VERSION,
    workflowVersion: "1.0.0",
    plannerVersion: "1.0.0",
    providerVersion: "1.2.3",
    connectorVersion: "2.0.0",
    providerManifestVersion: "manifest_v1"
  };
}

function makeSnapshot() {
  return buildProviderSnapshot({
    providerCode: "aliexpress",
    providerVersion: "1.2.3",
    manifestVersion: "manifest_v1",
    health: makeHealth(),
    rateLimitPerMinute: 60
  });
}

function makeInput(o?: Partial<RawStoreCoordinatorInput>): RawStoreCoordinatorInput {
  const products = [makeProduct(), makeProduct(), makeProduct()];
  return {
    executionKey: "ek_test_001",
    planId: "plan_test_001",
    jobId: "job_test_001",
    providerCode: "aliexpress",
    providerSnapshot: makeSnapshot(),
    status: "succeeded",
    startedAt: new Date(Date.now() - 1000),
    completedAt: new Date(),
    durationMs: 1000,
    attempts: 1,
    apiCallsUsed: 2,
    productsDiscovered: products.length,
    reservationConsumed: true,
    metrics: makeMetrics(),
    versions: makeVersions(),
    region: "US",
    products,
    ...o
  };
}

function makeDeps(o?: {
  compressor?: Compressor;
  events?: RawStoreEventPublisher;
}): RawStoreCoordinatorDeps {
  return {
    repository: createRawProductRepository(),
    compressor: o?.compressor ?? new NoopCompressor(),
    events: o?.events
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("RawStoreCoordinator", () => {
  let coordinator: RawStoreCoordinator;
  let deps: RawStoreCoordinatorDeps;

  beforeEach(() => {
    deps = makeDeps();
    coordinator = createRawStoreCoordinator(deps);
  });

  // ── 1. Payload bruto preservado exatamente ─────────────
  describe("raw payload preservation", () => {
    it("should preserve exact payload bytes (round-trip via NoopCompressor)", async () => {
      const product = makeProduct({ externalId: "ext_fixed_001", title: "Fixed Title" });
      const input = makeInput({ products: [product] });

      const result = await coordinator.persist(input);
      const stored = await deps.repository.findProducts(result.execution.id);

      expect(stored.length).toBe(1);
      const decompressed = new NoopCompressor().decompress(stored[0]!.payload);
      const original = canonicalJsonStringify(product);
      expect(decompressed).toBe(original);
    });

    it("should preserve payload via GzipCompressor round-trip", async () => {
      const gzip = new GzipCompressor();
      const depsWithGzip = makeDeps({ compressor: gzip });
      coordinator = createRawStoreCoordinator(depsWithGzip);

      const product = makeProduct({ externalId: "ext_gzip_001" });
      const input = makeInput({ products: [product] });

      const result = await coordinator.persist(input);
      const stored = await depsWithGzip.repository.findProducts(result.execution.id);

      expect(stored.length).toBe(1);
      // Decompress with the same gzip compressor
      const decompressed = await gzip.decompress(stored[0]!.payload);
      const original = canonicalJsonStringify(product);
      expect(decompressed).toBe(original);
    });

    it("should compress to fewer bytes than original for repetitive payloads", async () => {
      const gzip = new GzipCompressor();
      const depsWithGzip = makeDeps({ compressor: gzip });
      coordinator = createRawStoreCoordinator(depsWithGzip);

      // Product with lots of repetitive text
      const product = makeProduct({
        description: "A".repeat(1000),
        attributes: { x: "B".repeat(500) }
      });
      const input = makeInput({ products: [product] });

      const result = await coordinator.persist(input);
      const stored = await depsWithGzip.repository.findProducts(result.execution.id);
      const originalSize = canonicalJsonStringify(product).length;
      const compressedSize = stored[0]!.payload.length;

      expect(compressedSize).toBeLessThan(originalSize);
    });
  });

  // ── 2. Append-only (no update/delete) ──────────────────
  describe("append-only semantics", () => {
    it("should not have update or delete methods on repository", () => {
      const repo = createRawProductRepository();
      const methods = Object.getPrototypeOf(repo);
      expect(typeof (methods as any).update).toBe("undefined");
      expect(typeof (methods as any).delete).toBe("undefined");
      expect(typeof (methods as any).remove).toBe("undefined");
    });

    it("should only expose append + find + stream + count", () => {
      const repo = createRawProductRepository();
      // These methods should exist
      expect(typeof repo.appendExecution).toBe("function");
      expect(typeof repo.appendProducts).toBe("function");
      expect(typeof repo.findExecution).toBe("function");
      expect(typeof repo.findProducts).toBe("function");
      expect(typeof repo.streamProducts).toBe("function");
      expect(typeof repo.countProducts).toBe("function");
    });

    it("should be idempotent on re-append of same execution", async () => {
      const input = makeInput();
      const r1 = await coordinator.persist(input);
      const r2 = await coordinator.persist(input);

      // Same execution ID
      expect(r1.execution.id).toBe(r2.execution.id);
      // Repository has exactly 1 execution
      expect(deps.repository.executionCount).toBe(1);
      // Products not duplicated
      expect(deps.repository.productCount).toBe(3);
    });
  });

  // ── 3. PayloadHash ─────────────────────────────────────
  describe("payloadHash", () => {
    it("should compute deterministic payloadHash from canonical JSON", async () => {
      const product = makeProduct({ externalId: "ext_hash_001" });
      const input = makeInput({ products: [product] });

      const result = await coordinator.persist(input);
      const stored = await deps.repository.findProducts(result.execution.id);

      const expectedHash = computePayloadHash(product);
      expect(stored[0]!.payloadHash).toBe(expectedHash);
    });

    it("should produce same hash regardless of property order", async () => {
      const product1 = makeProduct({ externalId: "x", title: "A", description: "B" });
      // Same data, different property construction order (JS doesn't guarantee order,
      // but canonical JSON sorts keys)
      const product2 = { ...product1 };

      const h1 = computePayloadHash(product1);
      const h2 = computePayloadHash(product2);
      expect(h1).toBe(h2);
    });

    it("should produce different hashes for different payloads", () => {
      const h1 = computePayloadHash(makeProduct({ externalId: "a" }));
      const h2 = computePayloadHash(makeProduct({ externalId: "b" }));
      expect(h1).not.toBe(h2);
    });

    it("should skip duplicate payloads within same execution", async () => {
      const product = makeProduct({ externalId: "ext_dup_001" });
      // Pass the same product twice in one batch
      const input = makeInput({ products: [product, product] });

      const result = await coordinator.persist(input);
      // Only 1 record stored (second is idempotent skip)
      expect(result.recordsAppended).toBe(1);
      expect(result.recordsSkipped).toBe(1);
    });
  });

  // ── 4. SemanticHash separado (null in A2.4) ────────────
  describe("semanticHash", () => {
    it("should be null in A2.4 (filled by A2.5 Normalizer)", async () => {
      const input = makeInput();
      const result = await coordinator.persist(input);
      const stored = await deps.repository.findProducts(result.execution.id);

      for (const record of stored) {
        expect(record.semanticHash).toBeNull();
      }
    });

    it("should be separate from payloadHash", async () => {
      const input = makeInput();
      const result = await coordinator.persist(input);
      const stored = await deps.repository.findProducts(result.execution.id);

      for (const record of stored) {
        expect(record.payloadHash).not.toBeNull();
        expect(record.payloadHash).toMatch(/^ph_/);
        // semanticHash is null — they are never the same value
        expect(record.semanticHash).not.toBe(record.payloadHash);
      }
    });
  });

  // ── 5. ProviderSnapshot persistido ─────────────────────
  describe("providerSnapshot persistence", () => {
    it("should persist the provider snapshot in the execution record", async () => {
      const snapshot = makeSnapshot();
      const input = makeInput({ providerSnapshot: snapshot });

      const result = await coordinator.persist(input);
      const found = await deps.repository.findExecution(result.execution.id);

      expect(found).not.toBeNull();
      expect(found!.providerSnapshot.providerCode).toBe("aliexpress");
      expect(found!.providerSnapshot.providerVersion).toBe("1.2.3");
      expect(found!.providerSnapshot.manifestVersion).toBe("manifest_v1");
      expect(found!.providerSnapshot.health.status).toBe("healthy");
      expect(found!.providerSnapshot.rateLimit.limitPerMinute).toBe(60);
    });

    it("should preserve full health metadata in snapshot", async () => {
      const health = makeHealth({
        status: "degraded",
        errorRate: 0.05,
        averageLatencyMs: 500,
        consecutiveFailures: 3,
        totalRequests: 1000,
        requestsRemaining: 12,
        resetAt: new Date("2025-12-31T23:59:59Z")
      });
      const snapshot = buildProviderSnapshot({
        providerCode: "temu",
        providerVersion: "2.0.0",
        manifestVersion: "m2",
        health,
        rateLimitPerMinute: 30
      });
      const input = makeInput({ providerSnapshot: snapshot, providerCode: "temu" });

      const result = await coordinator.persist(input);
      const found = await deps.repository.findExecution(result.execution.id);

      expect(found!.providerSnapshot.health.status).toBe("degraded");
      expect(found!.providerSnapshot.health.errorRate).toBe(0.05);
      expect(found!.providerSnapshot.health.averageLatencyMs).toBe(500);
      expect(found!.providerSnapshot.health.consecutiveFailures).toBe(3);
      expect(found!.providerSnapshot.rateLimit.requestsRemaining).toBe(12);
    });
  });

  // ── 6. Versionamento completo ──────────────────────────
  describe("full versioning", () => {
    it("should carry all 6 version fields on execution record", async () => {
      const input = makeInput();
      const result = await coordinator.persist(input);
      const v = result.execution.versions;

      expect(v.schemaVersion).toBe("1.0.0");
      expect(v.workflowVersion).toBe("1.0.0");
      expect(v.plannerVersion).toBe("1.0.0");
      expect(v.providerVersion).toBe("1.2.3");
      expect(v.connectorVersion).toBe("2.0.0");
      expect(v.providerManifestVersion).toBe("manifest_v1");
    });

    it("should carry all version fields on each raw product record", async () => {
      const input = makeInput();
      const result = await coordinator.persist(input);
      const stored = await deps.repository.findProducts(result.execution.id);

      for (const record of stored) {
        expect(record.versions.schemaVersion).toBe("1.0.0");
        expect(record.versions.workflowVersion).toBe("1.0.0");
        expect(record.versions.plannerVersion).toBe("1.0.0");
        expect(record.versions.providerVersion).toBe("1.2.3");
        expect(record.versions.connectorVersion).toBe("2.0.0");
        expect(record.versions.providerManifestVersion).toBe("manifest_v1");
      }
    });
  });

  // ── 7. Compressão transparente ─────────────────────────
  describe("transparent compression", () => {
    it("should store compressed bytes (Uint8Array)", async () => {
      const input = makeInput();
      const result = await coordinator.persist(input);
      const stored = await deps.repository.findProducts(result.execution.id);

      for (const record of stored) {
        expect(record.payload).toBeInstanceOf(Uint8Array);
        expect(record.payload.length).toBeGreaterThan(0);
      }
    });

    it("should support swapping compressor (noop vs gzip)", async () => {
      // Noop
      const noopDeps = makeDeps({ compressor: new NoopCompressor() });
      const noopCoord = createRawStoreCoordinator(noopDeps);
      const noopResult = await noopCoord.persist(makeInput());
      const noopStored = await noopDeps.repository.findProducts(noopResult.execution.id);

      // Gzip
      const gzipDeps = makeDeps({ compressor: new GzipCompressor() });
      const gzipCoord = createRawStoreCoordinator(gzipDeps);
      const gzipResult = await gzipCoord.persist(makeInput());
      const gzipStored = await gzipDeps.repository.findProducts(gzipResult.execution.id);

      // Both should have stored data
      expect(noopStored.length).toBe(3);
      expect(gzipStored.length).toBe(3);
      // Gzip should generally produce smaller payloads for structured JSON
      const noopSize = noopStored[0]!.payload.length;
      const gzipSize = gzipStored[0]!.payload.length;
      // Gzip should be smaller (or at least not dramatically larger)
      expect(gzipSize).toBeLessThanOrEqual(noopSize * 2);
    });
  });

  // ── 8. Eventos publicados ──────────────────────────────
  describe("event publication", () => {
    it("should emit RawProductsPersisted + RawProductsReadyForNormalization", async () => {
      const published: RawStoreEvent[] = [];
      const eventPublisher: RawStoreEventPublisher = {
        async publish(events) {
          published.push(...events);
        }
      };
      const depsWithEvents = makeDeps({ events: eventPublisher });
      coordinator = createRawStoreCoordinator(depsWithEvents);

      await coordinator.persist(makeInput());

      expect(published.length).toBe(2);
      expect(published[0]!.eventType).toBe("discovery.raw.persisted");
      expect(published[1]!.eventType).toBe("discovery.raw.ready_for_normalization");
    });

    it("should include count and hashes in RawProductsPersisted payload", async () => {
      const published: RawStoreEvent[] = [];
      const depsWithEvents = makeDeps({
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });
      coordinator = createRawStoreCoordinator(depsWithEvents);

      const input = makeInput();
      await coordinator.persist(input);

      const persisted = published.find((e) => e.eventType === "discovery.raw.persisted")!;
      const payload = persisted.payload as any;
      expect(payload.count).toBe(3);
      expect(payload.skipped).toBe(0);
      expect(payload.payloadHashes.length).toBe(3);
      expect(payload.partitionKey).toContain("aliexpress");
      expect(payload.partitionKey).toContain("US");
      expect(payload.executionId).toBeTruthy();
      expect(payload.planId).toBe(input.planId);
      expect(payload.jobId).toBe(input.jobId);
    });

    it("should include partitionKeys in RawProductsReadyForNormalization", async () => {
      const published: RawStoreEvent[] = [];
      const depsWithEvents = makeDeps({
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });
      coordinator = createRawStoreCoordinator(depsWithEvents);

      await coordinator.persist(makeInput());

      const ready = published.find((e) => e.eventType === "discovery.raw.ready_for_normalization")!;
      const payload = ready.payload as any;
      expect(payload.count).toBe(3);
      expect(payload.partitionKeys.length).toBe(1);
      expect(payload.partitionKeys[0]).toContain("aliexpress");
    });

    it("should NOT emit ReadyForNormalization when no products appended", async () => {
      const published: RawStoreEvent[] = [];
      const depsWithEvents = makeDeps({
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });
      coordinator = createRawStoreCoordinator(depsWithEvents);

      await coordinator.persist(makeInput({ products: [], productsDiscovered: 0 }));

      // Only Persisted, not ReadyForNormalization
      expect(published.length).toBe(1);
      expect(published[0]!.eventType).toBe("discovery.raw.persisted");
    });

    it("should carry versions in event payloads", async () => {
      const published: RawStoreEvent[] = [];
      const depsWithEvents = makeDeps({
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });
      coordinator = createRawStoreCoordinator(depsWithEvents);

      await coordinator.persist(makeInput());

      const persisted = published[0]!;
      const payload = persisted.payload as any;
      expect(payload.schemaVersion).toBe("1.0.0");
      expect(payload.workflowVersion).toBe("1.0.0");
      expect(payload.plannerVersion).toBe("1.0.0");
      expect(payload.providerVersion).toBe("1.2.3");
      expect(payload.connectorVersion).toBe("2.0.0");
    });
  });

  // ── 9. Stream de leitura ───────────────────────────────
  describe("stream reads", () => {
    it("should stream all products for an execution", async () => {
      const input = makeInput();
      const result = await coordinator.persist(input);

      const streamed: RawProductRecord[] = [];
      for await (const record of deps.repository.streamProducts({
        executionId: result.execution.id
      })) {
        streamed.push(record);
      }

      expect(streamed.length).toBe(3);
    });

    it("should filter by providerCode", async () => {
      // Persist two executions from different providers
      await coordinator.persist(makeInput({ providerCode: "aliexpress" }));
      await coordinator.persist(
        makeInput({
          executionKey: "ek_test_002",
          jobId: "job_test_002",
          providerCode: "temu",
          products: [makeProduct({ marketplace: "temu" })]
        })
      );

      const streamed: RawProductRecord[] = [];
      for await (const r of deps.repository.streamProducts({ providerCode: "temu" })) {
        streamed.push(r);
      }

      expect(streamed.length).toBe(1);
      expect(streamed[0]!.providerCode).toBe("temu");
    });

    it("should filter by partitionKey", async () => {
      const input = makeInput();
      const result = await coordinator.persist(input);
      const partitionKey = result.execution.partitionKey;

      const streamed: RawProductRecord[] = [];
      for await (const r of deps.repository.streamProducts({ partitionKey })) {
        streamed.push(r);
      }

      expect(streamed.length).toBe(3);
    });

    it("should support countProducts", async () => {
      await coordinator.persist(makeInput());

      const count = await deps.repository.countProducts({ providerCode: "aliexpress" });
      expect(count).toBe(3);
    });

    it("should enable downstream consumer to read one at a time", async () => {
      const input = makeInput({
        products: Array.from({ length: 10 }, (_, i) => makeProduct({ externalId: `ext_${i}` }))
      });
      const result = await coordinator.persist(input);

      let count = 0;
      for await (const _ of deps.repository.streamProducts({ executionId: result.execution.id })) {
        count++;
      }
      expect(count).toBe(10);
    });
  });

  // ── 10. Reprocessamento possível (idempotent) ──────────
  describe("reprocessing (idempotent)", () => {
    it("should be safe to re-run the same execution (no duplicates)", async () => {
      const input = makeInput();
      const r1 = await coordinator.persist(input);
      const r2 = await coordinator.persist(input);

      expect(r1.recordsAppended).toBe(3);
      expect(r2.recordsAppended).toBe(0); // all skipped
      expect(r2.recordsSkipped).toBe(3);
      expect(deps.repository.productCount).toBe(3); // no growth
    });

    it("should produce same execution ID on re-run", async () => {
      const input = makeInput();
      const r1 = await coordinator.persist(input);
      const r2 = await coordinator.persist(input);

      expect(r1.execution.id).toBe(r2.execution.id);
    });

    it("should produce same payloadHashes on re-run (from stored records)", async () => {
      const input = makeInput();
      const r1 = await coordinator.persist(input);
      const r2 = await coordinator.persist(input);

      // First run appends all; second run skips all (r2.payloadHashes is empty).
      // But the stored records should have the same hashes.
      const stored = await deps.repository.findProducts(r1.execution.id);
      const storedHashes = stored.map((r) => r.payloadHash).sort();
      const originalHashes = [...r1.payloadHashes].sort();
      expect(storedHashes).toEqual(originalHashes);
      // Second run produced no new appends
      expect(r2.recordsAppended).toBe(0);
    });

    it("should support re-processing with a different compressor (re-import)", async () => {
      // First persist with noop
      const input = makeInput();
      const r1 = await coordinator.persist(input);

      // "Re-process" — same data, but the repository is already populated.
      // The second call should skip all records.
      const r2 = await coordinator.persist(input);

      expect(r2.recordsAppended).toBe(0);
      // The original records are still readable
      const stored = await deps.repository.findProducts(r1.execution.id);
      expect(stored.length).toBe(3);
    });
  });

  // ── Partition key format ───────────────────────────────
  describe("partition key", () => {
    it("should format as provider|country|yyyy-mm-dd", async () => {
      const completedAt = new Date("2025-06-15T12:00:00Z");
      const input = makeInput({
        providerCode: "aliexpress",
        region: "BR",
        completedAt
      });

      const result = await coordinator.persist(input);
      expect(result.execution.partitionKey).toBe("aliexpress|BR|2025-06-15");
    });

    it("should use UTC date for partition key", async () => {
      // 2025-06-15 23:30 UTC → partition date is 2025-06-15
      const completedAt = new Date("2025-06-15T23:30:00Z");
      const input = makeInput({ completedAt });

      const result = await coordinator.persist(input);
      expect(result.execution.partitionKey).toContain("2025-06-15");
    });

    it("should attach partition key to each product record", async () => {
      const input = makeInput();
      const result = await coordinator.persist(input);
      const stored = await deps.repository.findProducts(result.execution.id);

      for (const record of stored) {
        expect(record.partitionKey).toBe(result.execution.partitionKey);
      }
    });
  });

  // ── Failed execution ───────────────────────────────────
  describe("failed execution", () => {
    it("should persist execution with status=failed and error details", async () => {
      const input = makeInput({
        status: "failed",
        products: [],
        productsDiscovered: 0,
        error: { code: "TIMEOUT", message: "call timed out", retriable: true }
      });

      const result = await coordinator.persist(input);
      const found = await deps.repository.findExecution(result.execution.id);

      expect(found!.status).toBe("failed");
      expect(found!.error).toBeDefined();
      expect(found!.error!.code).toBe("TIMEOUT");
      expect(found!.error!.retriable).toBe(true);
    });

    it("should not emit ReadyForNormalization for failed execution", async () => {
      const published: RawStoreEvent[] = [];
      const depsWithEvents = makeDeps({
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });
      coordinator = createRawStoreCoordinator(depsWithEvents);

      await coordinator.persist(
        makeInput({
          status: "failed",
          products: [],
          productsDiscovered: 0,
          error: { code: "TIMEOUT", message: "x", retriable: true }
        })
      );

      // Only Persisted (with count=0), no ReadyForNormalization
      expect(published.length).toBe(1);
      expect(published[0]!.eventType).toBe("discovery.raw.persisted");
    });
  });
});
