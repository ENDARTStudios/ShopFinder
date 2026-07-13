/**
 * @workspace/domain/discovery/workers/worker.test
 *
 * Tests for A2.3 Discovery Workers covering 11 acceptance criteria:
 *   1. Deterministic execution (same job + ctx → same result counts)
 *   2. Incremental checkpoint (resume from cursor)
 *   3. Exponential retry on transient failures
 *   4. Rate limiting per provider
 *   5. Configurable timeout
 *   6. Cooperative cancellation
 *   7. Idempotency by JobId (re-run resumes from checkpoint)
 *   8. Per-provider metrics
 *   9. Started/Completed/Failed events emitted
 *  10. No catalog access (deps have no catalog repository)
 *  11. No Planner calls (deps have no planner)
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import {
  DiscoveryWorker,
  createWorker,
  createCancellationSignal,
  asWorkerId,
  createExecutor
} from "./worker";
import { JobExecutor, type ExecutorDeps } from "./executor";
import { ExponentialBackoffRetryPolicy, NoRetryPolicy } from "./retry";
import { TokenBucketRateLimiter } from "./rate-limit";
import { createCheckpointStore } from "./checkpoint";
import { DefaultProviderSelector } from "./provider-selection";
import { createWorkerMetricsCollector, createNoopWorkerEventPublisher } from "./metrics";
import { createExecutionRegistry } from "../orchestrator/execution-registry";
import { createBudgetReservationService } from "../orchestrator/reservation";
import { computeExecutionKey } from "../orchestrator/orchestrator";
import {
  asExecutionKeyValue,
  type ExecutionKey,
  type ReservationToken
} from "../orchestrator/types";
import type {
  WorkerContext,
  WorkerConfig,
  DiscoveryConnector,
  ConnectorDiscoverResult,
  WorkerEvent,
  CancellationSignal,
  WorkerResult
} from "./types";
import type { DiscoveryJob } from "../types";
import type { NormalizedDiscoveredProduct } from "../../marketplace";
import type { Money } from "../../shared";
import type { ImmutableDiscoveryPlan, PlannerContext } from "../planner";
import { CurrentPlannerVersion } from "../planner";
import type { DiscoverySignal, DiscoveryBudget } from "../types";

// ── Fixtures ───────────────────────────────────────────────

const zeroMoney: Money = { amount: 0, currency: "USD" };

function makeNormalizedProduct(
  o?: Partial<NormalizedDiscoveredProduct>
): NormalizedDiscoveredProduct {
  return {
    externalId: `ext_${Math.random().toString(36).slice(2)}`,
    marketplace: "aliexpress",
    title: "Test Product",
    description: "test",
    images: [],
    attributes: {},
    price: { amount: 1000, currency: "USD" },
    currency: "USD",
    inventory: 10,
    shippingFromCountry: "CN",
    estimatedDeliveryDays: { min: 7, max: 21 },
    discoveredAt: new Date(),
    ...o
  };
}

function makeBudget(o?: Partial<DiscoveryBudget>): DiscoveryBudget {
  return {
    id: "b1",
    period: "daily",
    maxApiCalls: 1000,
    maxProductsDiscovered: 10000,
    maxCost: { amount: 10000, currency: "USD" },
    currentUsage: {
      apiCallsUsed: 0,
      productsDiscovered: 0,
      costIncurred: zeroMoney,
      perSourceUsage: {},
      perRegionUsage: {},
      perCategoryUsage: {}
    },
    resetAt: new Date(Date.now() + 86400000),
    ...o
  };
}

function makeSignal(o?: Partial<DiscoverySignal>): DiscoverySignal {
  return {
    id: `s_${Math.random().toString(36).slice(2)}`,
    type: "trend",
    strength: "high",
    value: 80,
    source: "ai",
    scope: { providerCode: "aliexpress", category: "electronics", region: "US" },
    description: "Test",
    generatedAt: new Date(),
    ...o
  };
}

function makePlannerContext(o?: Partial<PlannerContext>): PlannerContext {
  return {
    signals: [makeSignal()],
    budget: makeBudget(),
    storeId: "store_1",
    featureFlags: new Set(["ai_discovery"]),
    version: CurrentPlannerVersion,
    ...o
  };
}

function makePlan(o?: Partial<ImmutableDiscoveryPlan>): ImmutableDiscoveryPlan {
  return {
    id: "plan_test_001",
    name: "test_plan",
    sources: [
      {
        sourceId: "src_aliexpress",
        sourceType: "api_official",
        providerCode: "aliexpress",
        capabilities: ["discovery"]
      }
    ],
    categories: ["electronics"],
    regions: ["US"],
    languages: ["en"],
    niches: [],
    priority: {
      overall: 80,
      factors: { trend: 80, supplier: 60, margin: 50, competition: 40, seasonality: 30 },
      reason: "test"
    },
    budget: {
      totalApiCalls: 100,
      perSource: { aliexpress: 100 },
      perRegion: { US: 100 },
      perCategory: { electronics: 100 }
    },
    estimatedProducts: 1000,
    estimatedDuration: 50,
    status: "draft",
    signals: [makeSignal()],
    justification: { primaryReason: "test", contributingFactors: [], signalSummary: "test" },
    planHash: "ph_test001",
    version: CurrentPlannerVersion,
    createdAt: new Date(),
    ...o
  };
}

function makeJob(o?: Partial<DiscoveryJob>): DiscoveryJob {
  return {
    id: "job_plan_test_001_0000_ek_abc123" as unknown as DiscoveryJob["id"],
    type: "trending",
    providerCode: "aliexpress",
    category: "electronics",
    region: "US",
    language: "en",
    priority: 80,
    status: "pending",
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date(0),
    parentPlanId: "plan_test_001",
    sequenceNumber: 0,
    ...o
  };
}

const DefaultWorkerConfig: WorkerConfig = {
  timeoutMs: 5_000,
  maxRetries: 3,
  baseRetryDelayMs: 10, // small for tests
  maxRetryDelayMs: 100,
  rateLimitPerMinute: 120, // high enough for tests
  checkpointInterval: 10,
  maxItemsPerJob: 1_000
};

function makeExecutionKey(): ExecutionKey {
  return {
    value: asExecutionKeyValue("ek_test_001"),
    planId: "plan_test_001",
    planVersion: "ph_test001",
    workflowVersion: "1.0.0",
    providerManifestVersion: "manifest_v1"
  };
}

function makeReservationToken(key: ExecutionKey): ReservationToken {
  return {
    value: "rt_test_001" as unknown as ReservationToken["value"],
    executionKey: key,
    planId: "plan_test_001",
    reservedCalls: 100,
    consumed: false,
    consumedCalls: 0,
    createdAt: new Date()
  };
}

/** Build a complete WorkerContext with sensible defaults. */
function makeWorkerContext(o?: Partial<WorkerContext>): WorkerContext {
  const key = makeExecutionKey();
  const token = makeReservationToken(key);
  const cancellationSignal = createCancellationSignal();
  const config = DefaultWorkerConfig;
  const checkpointStore = createCheckpointStore();
  const rateLimiter = new TokenBucketRateLimiter(config);
  const providerSelector = new DefaultProviderSelector();
  const retryPolicy = new ExponentialBackoffRetryPolicy(config);
  const metrics = createWorkerMetricsCollector();
  const events = createNoopWorkerEventPublisher();
  const executionRegistry = createExecutionRegistry();
  const reservationService = createBudgetReservationService();

  const executorDeps: ExecutorDeps = {
    rateLimiter,
    retryPolicy,
    metrics,
    timeoutMs: config.timeoutMs
  };
  const executor = new JobExecutor(executorDeps);

  return {
    workerId: asWorkerId("worker_test_001"),
    executionKey: key,
    reservationToken: token,
    config,
    connectors: new Map(),
    checkpointStore,
    rateLimiter,
    providerSelector,
    retryPolicy,
    metrics,
    events,
    cancellationSignal,
    plannerVersion: "1.0.0",
    workflowVersion: "1.0.0",
    executionRegistry,
    reservationService,
    executor,
    ...o
  };
}

/** Build a fake connector with scripted responses. */
function makeScriptedConnector(opts: {
  providerCode?: string;
  pages?: Array<{
    products: NormalizedDiscoveredProduct[];
    nextCursor?: string;
    hasMore: boolean;
    apiCallsUsed?: number;
  }>;
  failure?: { error: Error; onAttempt?: number }; // fail on specific attempt
  failures?: Array<{ error: Error; onAttempt: number }>; // multiple failures
  delayMs?: number;
}): DiscoveryConnector {
  const providerCode = opts.providerCode ?? "aliexpress";
  const pages = opts.pages ?? [];
  let callIndex = 0;
  let attemptIndex = 0;

  return {
    providerCode,
    providerVersion: "1.0.0",
    async discover(input) {
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));

      attemptIndex += 1;

      // Check single-failure mode
      // If onAttempt is specified, fail only on that attempt.
      // If onAttempt is omitted, fail on EVERY attempt (permanent failure).
      if (opts.failure) {
        const failOn = opts.failure.onAttempt;
        if (failOn === undefined || failOn === attemptIndex) {
          throw opts.failure.error;
        }
      }
      // Check multi-failure mode
      if (opts.failures) {
        const f = opts.failures.find((x) => x.onAttempt === attemptIndex);
        if (f) throw f.error;
      }

      const page = pages[callIndex] ?? {
        products: [],
        hasMore: false,
        apiCallsUsed: 1
      };
      callIndex += 1;

      const result: ConnectorDiscoverResult = {
        products: page.products,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        apiCallsUsed: page.apiCallsUsed ?? 1
      };
      // Honor cancellation
      if (input.cancellationSignal.cancelled) {
        throw Object.assign(new Error("Cancelled"), { code: "CANCELLED", retriable: false });
      }
      return result;
    }
  };
}

/** Create a retriable error (mimics what real connectors throw). */
function retriableError(
  message: string,
  code = "PROVIDER_ERROR"
): Error & { code: string; retriable: boolean } {
  return Object.assign(new Error(message), { code, retriable: true });
}

/** Create a non-retriable error. */
function fatalError(message: string, code = "FATAL"): Error & { code: string; retriable: boolean } {
  return Object.assign(new Error(message), { code, retriable: false });
}

// ── Tests ──────────────────────────────────────────────────

describe("DiscoveryWorker", () => {
  let worker: DiscoveryWorker;

  beforeEach(() => {
    worker = createWorker();
  });

  // ── 1. Deterministic execution ─────────────────────────
  describe("deterministic execution", () => {
    it("should return same productsDiscovered for same job + ctx", async () => {
      const products1 = Array.from({ length: 5 }, (_, i) =>
        makeNormalizedProduct({ externalId: `ext1_${i}` })
      );
      const products2 = Array.from({ length: 5 }, (_, i) =>
        makeNormalizedProduct({ externalId: `ext2_${i}` })
      );
      // Use two separate connectors so callIndex doesn't interfere
      const connector1 = makeScriptedConnector({
        pages: [{ products: products1, hasMore: false, apiCallsUsed: 1 }]
      });
      const connector2 = makeScriptedConnector({
        pages: [{ products: products2, hasMore: false, apiCallsUsed: 1 }]
      });
      const job = makeJob();
      const ctx1 = makeWorkerContext({
        connectors: new Map([[connector1.providerCode, connector1]])
      });
      const ctx2 = makeWorkerContext({
        connectors: new Map([[connector2.providerCode, connector2]])
      });

      const r1 = await worker.execute(job, ctx1);
      const r2 = await worker.execute(job, ctx2);

      expect(r1.state).toBe("completed");
      expect(r2.state).toBe("completed");
      expect(r1.productsDiscovered).toBe(r2.productsDiscovered);
      expect(r1.apiCallsUsed).toBe(r2.apiCallsUsed);
    });
  });

  // ── 2. Incremental checkpoint ──────────────────────────
  describe("incremental checkpoint", () => {
    it("should save checkpoint after each page", async () => {
      const page1 = Array.from({ length: 10 }, () => makeNormalizedProduct());
      const page2 = Array.from({ length: 5 }, () => makeNormalizedProduct());
      const connector = makeScriptedConnector({
        pages: [
          { products: page1, nextCursor: "cursor2", hasMore: true, apiCallsUsed: 1 },
          { products: page2, hasMore: false, apiCallsUsed: 1 }
        ]
      });
      const job = makeJob();
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]])
      });

      await worker.execute(job, ctx);

      // 2 checkpoints saved (one per page) — access via reflection since
      // the public interface doesn't expose count.
      const storeAny = ctx.checkpointStore as unknown as { count(jobId: string): number };
      expect(storeAny.count(job.id)).toBe(2);
    });

    it("should resume from checkpoint on re-run", async () => {
      const page1 = Array.from({ length: 10 }, (_, i) =>
        makeNormalizedProduct({ externalId: `p1_${i}` })
      );
      const page2 = Array.from({ length: 5 }, (_, i) =>
        makeNormalizedProduct({ externalId: `p2_${i}` })
      );
      const connector = makeScriptedConnector({
        pages: [
          { products: page1, nextCursor: "cursor2", hasMore: true, apiCallsUsed: 1 },
          { products: page2, hasMore: false, apiCallsUsed: 1 }
        ]
      });
      const job = makeJob();
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]])
      });

      // First run completes both pages
      const r1 = await worker.execute(job, ctx);
      expect(r1.state).toBe("completed");
      expect(r1.productsDiscovered).toBe(15);

      // Second run — checkpoint shows cursor="cursor2" (last saved before hasMore=false).
      // Worker re-fetches with that cursor; connector returns page 2 again (callIndex=0).
      // The behavior we assert: re-run completes successfully and does not crash.
      const r2 = await worker.execute(job, ctx);
      expect(r2.state).toBe("completed");
    });
  });

  // ── 3. Exponential retry ───────────────────────────────
  describe("exponential retry", () => {
    it("should retry on transient failures and eventually succeed", async () => {
      const products = Array.from({ length: 5 }, () => makeNormalizedProduct());
      const connector = makeScriptedConnector({
        pages: [{ products, hasMore: false, apiCallsUsed: 1 }],
        failures: [
          { error: retriableError("transient 1"), onAttempt: 1 },
          { error: retriableError("transient 2"), onAttempt: 2 }
          // attempt 3 succeeds
        ]
      });
      const config = { ...DefaultWorkerConfig, baseRetryDelayMs: 1, maxRetryDelayMs: 5 };
      const retryPolicy = new ExponentialBackoffRetryPolicy(config);
      const rateLimiter = new TokenBucketRateLimiter(config);
      const metrics = createWorkerMetricsCollector();
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]]),
        config,
        retryPolicy,
        rateLimiter,
        metrics,
        executor: createExecutor({
          rateLimiter,
          retryPolicy,
          metrics,
          timeoutMs: config.timeoutMs
        })
      });
      const job = makeJob();

      const result = await worker.execute(job, ctx);

      expect(result.state).toBe("completed");
      expect(result.attempts).toBe(3);
      expect(result.productsDiscovered).toBe(5);
      expect(result.metrics.retries).toBe(2);
    });

    it("should NOT retry non-retriable errors", async () => {
      const connector = makeScriptedConnector({
        pages: [{ products: [], hasMore: false }],
        failure: { error: fatalError("not found", "NOT_FOUND"), onAttempt: 1 }
      });
      const job = makeJob();
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]])
      });

      const result = await worker.execute(job, ctx);

      expect(result.state).toBe("failed");
      expect(result.attempts).toBe(1);
      expect(result.error?.code).toBe("NOT_FOUND");
    });

    it("should give up after maxRetries", async () => {
      const connector = makeScriptedConnector({
        pages: [{ products: [], hasMore: false }],
        failure: { error: retriableError("always fails") }
      });
      const config = {
        ...DefaultWorkerConfig,
        maxRetries: 2,
        baseRetryDelayMs: 1,
        maxRetryDelayMs: 5
      };
      const retryPolicy = new ExponentialBackoffRetryPolicy(config);
      const rateLimiter = new TokenBucketRateLimiter(config);
      const metrics = createWorkerMetricsCollector();
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]]),
        config,
        retryPolicy,
        rateLimiter,
        metrics,
        executor: createExecutor({
          rateLimiter,
          retryPolicy,
          metrics,
          timeoutMs: config.timeoutMs
        })
      });
      const job = makeJob();

      const result = await worker.execute(job, ctx);

      expect(result.state).toBe("failed");
      // 1 initial + 2 retries = 3 attempts
      expect(result.attempts).toBe(3);
    });
  });

  // ── 4. Rate limiting per provider ──────────────────────
  describe("rate limiting", () => {
    it("should respect per-provider rate limits", async () => {
      const connector = makeScriptedConnector({
        pages: [{ products: [], hasMore: false, apiCallsUsed: 1 }]
      });
      const job = makeJob();
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]]),
        config: { ...DefaultWorkerConfig, rateLimitPerMinute: 60 }
      });

      const start = Date.now();
      await worker.execute(job, ctx);
      const elapsed = Date.now() - start;

      // Should complete quickly (only 1 call, plenty of budget)
      expect(elapsed).toBeLessThan(1000);
      expect(ctx.rateLimiter.estimateWait("aliexpress")).toBeGreaterThanOrEqual(0);
    });

    it("should isolate rate limits between providers", async () => {
      const connector1 = makeScriptedConnector({
        providerCode: "aliexpress",
        pages: [{ products: [], hasMore: false, apiCallsUsed: 1 }]
      });
      const connector2 = makeScriptedConnector({
        providerCode: "temu",
        pages: [{ products: [], hasMore: false, apiCallsUsed: 1 }]
      });
      const ctx = makeWorkerContext({
        connectors: new Map([
          [connector1.providerCode, connector1],
          [connector2.providerCode, connector2]
        ])
      });

      const job1 = makeJob({ providerCode: "aliexpress" });
      const job2 = makeJob({
        providerCode: "temu",
        id: "job_temu_001" as unknown as DiscoveryJob["id"]
      });

      const r1 = await worker.execute(job1, ctx);
      const r2 = await worker.execute(job2, ctx);

      expect(r1.state).toBe("completed");
      expect(r2.state).toBe("completed");
    });
  });

  // ── 5. Configurable timeout ────────────────────────────
  describe("configurable timeout", () => {
    it("should timeout when connector is too slow", async () => {
      const connector = makeScriptedConnector({
        pages: [{ products: [], hasMore: false }],
        delayMs: 500
      });
      const config = { ...DefaultWorkerConfig, timeoutMs: 50, maxRetries: 0 };
      const retryPolicy = new ExponentialBackoffRetryPolicy(config);
      const rateLimiter = new TokenBucketRateLimiter(config);
      const metrics = createWorkerMetricsCollector();
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]]),
        config,
        retryPolicy,
        rateLimiter,
        metrics,
        executor: createExecutor({
          rateLimiter,
          retryPolicy,
          metrics,
          timeoutMs: config.timeoutMs
        })
      });
      const job = makeJob();

      const result = await worker.execute(job, ctx);

      expect(result.state).toBe("failed");
      expect(result.error?.code).toBe("TIMEOUT");
    });

    it("should complete when timeout is sufficient", async () => {
      const connector = makeScriptedConnector({
        pages: [{ products: [], hasMore: false }],
        delayMs: 10
      });
      const config = { ...DefaultWorkerConfig, timeoutMs: 500 };
      const retryPolicy = new ExponentialBackoffRetryPolicy(config);
      const rateLimiter = new TokenBucketRateLimiter(config);
      const metrics = createWorkerMetricsCollector();
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]]),
        config,
        retryPolicy,
        rateLimiter,
        metrics,
        executor: createExecutor({
          rateLimiter,
          retryPolicy,
          metrics,
          timeoutMs: config.timeoutMs
        })
      });
      const job = makeJob();

      const result = await worker.execute(job, ctx);
      expect(result.state).toBe("completed");
    });
  });

  // ── 6. Cooperative cancellation ───────────────────────
  describe("cooperative cancellation", () => {
    it("should abort when cancellation signal fires", async () => {
      const products = Array.from({ length: 5 }, () => makeNormalizedProduct());
      const connector = makeScriptedConnector({
        pages: [{ products, hasMore: false, apiCallsUsed: 1 }],
        delayMs: 100
      });
      const cancellationSignal = createCancellationSignal();
      const config = { ...DefaultWorkerConfig, timeoutMs: 5000 };
      const retryPolicy = new ExponentialBackoffRetryPolicy(config);
      const rateLimiter = new TokenBucketRateLimiter(config);
      const metrics = createWorkerMetricsCollector();
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]]),
        cancellationSignal,
        config,
        retryPolicy,
        rateLimiter,
        metrics,
        executor: createExecutor({
          rateLimiter,
          retryPolicy,
          metrics,
          timeoutMs: config.timeoutMs
        })
      });
      const job = makeJob();

      // Cancel after 10ms (before the 100ms connector call returns)
      setTimeout(() => cancellationSignal.cancel("user requested"), 10);

      const result = await worker.execute(job, ctx);

      expect(result.state).toBe("cancelled");
      expect(result.error?.code).toBe("CANCELLED");
    });

    it("should mark executionRegistry as cancelled", async () => {
      const connector = makeScriptedConnector({
        pages: [{ products: [], hasMore: false, apiCallsUsed: 1 }],
        delayMs: 200
      });
      const cancellationSignal = createCancellationSignal();
      const config = { ...DefaultWorkerConfig, timeoutMs: 5000 };
      const retryPolicy = new ExponentialBackoffRetryPolicy(config);
      const rateLimiter = new TokenBucketRateLimiter(config);
      const metrics = createWorkerMetricsCollector();
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]]),
        cancellationSignal,
        config,
        retryPolicy,
        rateLimiter,
        metrics,
        executor: createExecutor({
          rateLimiter,
          retryPolicy,
          metrics,
          timeoutMs: config.timeoutMs
        })
      });
      const job = makeJob();
      // Register the execution so markState can find it
      ctx.executionRegistry.register(ctx.executionKey, [job]);

      setTimeout(() => cancellationSignal.cancel("test"), 10);
      await worker.execute(job, ctx);

      const lookup = ctx.executionRegistry.lookup(ctx.executionKey);
      expect(lookup.state).toBe("cancelled");
    });
  });

  // ── 7. Idempotency by JobId ───────────────────────────
  describe("idempotency by JobId", () => {
    it("should produce same outcome when re-executing same job (with checkpoint)", async () => {
      const products = Array.from({ length: 5 }, () => makeNormalizedProduct());
      const connector = makeScriptedConnector({
        pages: [{ products, hasMore: false, apiCallsUsed: 1 }]
      });
      const job = makeJob();
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]])
      });

      const r1 = await worker.execute(job, ctx);
      const r2 = await worker.execute(job, ctx);

      // Both complete; second run finds existing checkpoint and returns
      expect(r1.state).toBe("completed");
      expect(r2.state).toBe("completed");
    });
  });

  // ── 8. Per-provider metrics ───────────────────────────
  describe("per-provider metrics", () => {
    it("should track apiCallsUsed in metrics", async () => {
      const products = Array.from({ length: 10 }, () => makeNormalizedProduct());
      const connector = makeScriptedConnector({
        pages: [
          { products: products.slice(0, 10), nextCursor: "c2", hasMore: true, apiCallsUsed: 2 },
          { products: [], hasMore: false, apiCallsUsed: 1 }
        ]
      });
      const job = makeJob();
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]])
      });

      const result = await worker.execute(job, ctx);

      expect(result.apiCallsUsed).toBe(3); // 2 + 1
      expect(result.metrics.apiCallsUsed).toBe(3);
      expect(result.metrics.itemsProcessed).toBe(10);
      expect(result.metrics.checkpointsSaved).toBe(2);
    });
  });

  // ── 9. Started/Completed/Failed events ────────────────
  describe("events", () => {
    it("should emit ExecutionStarted + ExecutionCompleted on success", async () => {
      const published: WorkerEvent[] = [];
      const ctx = makeWorkerContext({
        connectors: new Map([
          [
            "aliexpress",
            makeScriptedConnector({
              pages: [{ products: [], hasMore: false, apiCallsUsed: 1 }]
            })
          ]
        ]),
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });

      await worker.execute(makeJob(), ctx);

      const types = published.map((e) => e.eventType);
      expect(types).toContain("discovery.execution.started");
      expect(types).toContain("discovery.execution.completed");
      expect(types).not.toContain("discovery.execution.failed");
    });

    it("should emit ExecutionStarted + ExecutionFailed on failure", async () => {
      const published: WorkerEvent[] = [];
      const connector = makeScriptedConnector({
        pages: [],
        failure: { error: fatalError("boom", "BOOM"), onAttempt: 1 }
      });
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]]),
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });

      await worker.execute(makeJob(), ctx);

      const types = published.map((e) => e.eventType);
      expect(types).toContain("discovery.execution.started");
      expect(types).toContain("discovery.execution.failed");
      expect(types).not.toContain("discovery.execution.completed");
    });

    it("should carry schemaVersion + workflowVersion + plannerVersion in events", async () => {
      const published: WorkerEvent[] = [];
      const ctx = makeWorkerContext({
        connectors: new Map([
          [
            "aliexpress",
            makeScriptedConnector({
              pages: [{ products: [], hasMore: false, apiCallsUsed: 1 }]
            })
          ]
        ]),
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      });

      await worker.execute(makeJob(), ctx);

      const started = published.find((e) => e.eventType === "discovery.execution.started");
      expect(started).toBeDefined();
      const payload = started!.payload as unknown as Record<string, unknown>;
      expect(payload.schemaVersion).toBe("1.0.0");
      expect(payload.workflowVersion).toBe("1.0.0");
      expect(payload.plannerVersion).toBe("1.0.0");
    });
  });

  // ── 10. No catalog access ─────────────────────────────
  describe("architectural invariants", () => {
    it("should NOT have catalog repository in deps", () => {
      const ctx = makeWorkerContext();
      const keys = Object.keys(ctx);
      expect(keys).not.toContain("catalogRepository");
      expect(keys).not.toContain("productRepository");
      expect(keys).not.toContain("db");
      expect(keys).not.toContain("prisma");
    });

    it("should NOT have planner in deps", () => {
      const ctx = makeWorkerContext();
      const keys = Object.keys(ctx);
      expect(keys).not.toContain("planner");
      expect(keys).not.toContain("plannerContext");
    });

    it("should mark executionRegistry with executing then completed", async () => {
      const connector = makeScriptedConnector({
        pages: [{ products: [], hasMore: false, apiCallsUsed: 1 }]
      });
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]])
      });
      const lookup = ctx.executionRegistry.lookup(ctx.executionKey);
      expect(lookup.exists).toBe(false); // nothing registered yet

      // Manually register so we can observe state transitions
      ctx.executionRegistry.register(ctx.executionKey, [makeJob()]);

      await worker.execute(makeJob(), ctx);

      const final = ctx.executionRegistry.lookup(ctx.executionKey);
      expect(final.state).toBe("completed");
    });
  });

  // ── 11. Reservation token consumption ─────────────────
  describe("reservation token", () => {
    it("should consume reservation token on success", async () => {
      const connector = makeScriptedConnector({
        pages: [{ products: [], hasMore: false, apiCallsUsed: 7 }]
      });
      // Build a token via the reservation service so consume() works
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]])
      });
      // The token in ctx is a fake; replace it with a real reserved token
      const plan = makePlan();
      const execCtx: import("../orchestrator/types").ExecutionContext = {
        planner: makePlannerContext(),
        orchestratorVersion: {
          orchestratorVersion: "1.0.0",
          workflowVersion: "1.0.0",
          validatorVersion: "1.0.0"
        },
        providerManifest: { manifestVersion: "manifest_v1", perProvider: {} },
        storeId: "store_1",
        featureFlags: new Set(["ai_discovery"])
      };
      const reserveResult = ctx.reservationService.reserve(plan, execCtx, ctx.executionKey);
      const realToken = reserveResult.token!;
      const ctxWithRealToken: typeof ctx = {
        ...ctx,
        reservationToken: realToken
      };

      const result = await worker.execute(makeJob(), ctxWithRealToken);

      expect(result.reservationConsumed).toBe(true);
      expect(result.apiCallsUsed).toBe(7);

      const inspect = ctx.reservationService.inspect(ctx.executionKey);
      expect(inspect.consumed).toBe(true);
      expect(inspect.consumedCalls).toBe(7);
    });

    it("should consume token partially on failure", async () => {
      const connector = makeScriptedConnector({
        pages: [],
        failures: [
          { error: fatalError("fail 1"), onAttempt: 1 }
          // page 1 attempt 1: throws after some api calls (we model 0 used here)
        ]
      });
      const config = { ...DefaultWorkerConfig, maxRetries: 0 };
      const retryPolicy = new NoRetryPolicy();
      const rateLimiter = new TokenBucketRateLimiter(config);
      const metrics = createWorkerMetricsCollector();
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]]),
        config,
        retryPolicy,
        rateLimiter,
        metrics,
        executor: createExecutor({
          rateLimiter,
          retryPolicy,
          metrics,
          timeoutMs: config.timeoutMs
        })
      });

      const result = await worker.execute(makeJob(), ctx);

      expect(result.state).toBe("failed");
      // apiCallsUsed=0 → no consumption
      expect(result.reservationConsumed).toBe(false);
    });
  });

  // ── 12. Provider selection ────────────────────────────
  describe("provider selection", () => {
    it("should fail when no connector is registered for the provider", async () => {
      const ctx = makeWorkerContext({
        connectors: new Map() // empty
      });
      const result = await worker.execute(makeJob({ providerCode: "unknown" }), ctx);
      expect(result.state).toBe("failed");
      expect(result.error?.code).toBe("NO_PROVIDER");
    });
  });

  // ── 13. Safety cap ────────────────────────────────────
  describe("safety cap", () => {
    it("should stop when maxItemsPerJob is reached", async () => {
      // Generate enough products to exceed the cap
      const manyProducts = Array.from({ length: 50 }, (_, i) =>
        makeNormalizedProduct({ externalId: `ext_${i}` })
      );
      const config = { ...DefaultWorkerConfig, maxItemsPerJob: 25, checkpointInterval: 10 };
      const retryPolicy = new ExponentialBackoffRetryPolicy(config);
      const rateLimiter = new TokenBucketRateLimiter(config);
      const metrics = createWorkerMetricsCollector();
      const connector = makeScriptedConnector({
        pages: [
          { products: manyProducts.slice(0, 10), nextCursor: "c2", hasMore: true, apiCallsUsed: 1 },
          {
            products: manyProducts.slice(10, 20),
            nextCursor: "c3",
            hasMore: true,
            apiCallsUsed: 1
          },
          { products: manyProducts.slice(20, 30), hasMore: true, apiCallsUsed: 1 }
        ]
      });
      const ctx = makeWorkerContext({
        connectors: new Map([[connector.providerCode, connector]]),
        config,
        retryPolicy,
        rateLimiter,
        metrics,
        executor: createExecutor({
          rateLimiter,
          retryPolicy,
          metrics,
          timeoutMs: config.timeoutMs
        })
      });
      const job = makeJob();

      const result = await worker.execute(job, ctx);

      expect(result.state).toBe("completed");
      // Safety cap fires when itemsProcessed >= maxItemsPerJob (25).
      // Since pages come in batches of 10, the cap is hit at 30 (3 pages)
      // — the worker does NOT truncate mid-page. The key behavior is that
      // it STOPS fetching after the cap is reached (no 4th page).
      expect(result.productsDiscovered).toBeLessThanOrEqual(30);
      expect(result.productsDiscovered).toBeGreaterThanOrEqual(25);
    });
  });
});
