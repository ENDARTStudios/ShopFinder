/**
 * @workspace/domain/discovery/workers/contracts.test
 *
 * Tests for the 5 cross-cutting contracts (C1-C5).
 *
 *   C1. RetryPolicyConfig + computeRetryDelay + isRetriableError
 *   C2. ProviderSelectionPolicy + 4 strategies (cheapest/fastest/healthiest/weighted/exact)
 *   C3. ErrorTaxonomy + canonicalizeErrorCode + DEFAULT_RETRIABILITY
 *   C4. ProviderSnapshot + buildProviderSnapshot
 *   C5. DiscoveryExecutionResult + toDiscoveryExecutionResult
 */
/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import {
  // C1
  DefaultRetryPolicyConfig,
  computeRetryDelay,
  isRetriableError,
  type RetryPolicyConfig,
  // C2
  CheapestProviderPolicy,
  FastestProviderPolicy,
  HealthiestProviderPolicy,
  WeightedProviderPolicy,
  ExactProviderPolicy,
  createSelectionPolicy,
  type ProviderCandidate,
  type ProviderSelectionInput,
  // C3
  ErrorTaxonomy,
  canonicalizeErrorCode,
  DEFAULT_RETRIABILITY,
  // C4
  buildProviderSnapshot,
  // C5
  DISCOVERY_RESULT_SCHEMA_VERSION
} from "./contracts";
import { ConfigurableRetryPolicy, NoRetryPolicy } from "./retry";
import { WorkerErrors, toDiscoveryExecutionResult, completed as completedResult } from "./result";
import type { WorkerResult, WorkerMetricsSnapshot, ProviderHealth } from "./types";

// ── Fixtures ───────────────────────────────────────────────

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

function makeCandidate(o?: Partial<ProviderCandidate>): ProviderCandidate {
  return {
    providerCode: "aliexpress",
    providerVersion: "1.0.0",
    health: makeHealth(),
    costScore: 50,
    latencyMs: 100,
    priority: 50,
    ...o
  };
}

function makeSelectionInput(candidates: ProviderCandidate[]): ProviderSelectionInput {
  return { capability: "discovery", region: "US", candidates };
}

function makeMetricsSnapshot(o?: Partial<WorkerMetricsSnapshot>): WorkerMetricsSnapshot {
  return {
    discoveryDurationMs: 100,
    checkpointDurationMs: 10,
    rateLimitWaitMs: 5,
    retryDelayMs: 0,
    totalDurationMs: 115,
    itemsProcessed: 10,
    apiCallsUsed: 2,
    retries: 0,
    checkpointsSaved: 1,
    ...o
  };
}

// ═══════════════════════════════════════════════════════════════════
// C1. RetryPolicyConfig
// ═══════════════════════════════════════════════════════════════════

describe("C1: RetryPolicyConfig", () => {
  describe("computeRetryDelay", () => {
    it("should compute fixed backoff (same delay every attempt)", () => {
      const config: RetryPolicyConfig = {
        ...DefaultRetryPolicyConfig,
        backoffStrategy: "fixed",
        baseDelayMs: 1000,
        jitter: false
      };
      expect(computeRetryDelay(config, 1)).toBe(1000);
      expect(computeRetryDelay(config, 2)).toBe(1000);
      expect(computeRetryDelay(config, 3)).toBe(1000);
    });

    it("should compute linear backoff (delay * attempt)", () => {
      const config: RetryPolicyConfig = {
        ...DefaultRetryPolicyConfig,
        backoffStrategy: "linear",
        baseDelayMs: 500,
        jitter: false
      };
      expect(computeRetryDelay(config, 1)).toBe(500);
      expect(computeRetryDelay(config, 2)).toBe(1000);
      expect(computeRetryDelay(config, 3)).toBe(1500);
    });

    it("should compute exponential backoff (base * 2^(attempt-1))", () => {
      const config: RetryPolicyConfig = {
        ...DefaultRetryPolicyConfig,
        backoffStrategy: "exponential",
        baseDelayMs: 100,
        jitter: false
      };
      expect(computeRetryDelay(config, 1)).toBe(100); // 100 * 2^0
      expect(computeRetryDelay(config, 2)).toBe(200); // 100 * 2^1
      expect(computeRetryDelay(config, 3)).toBe(400); // 100 * 2^2
      expect(computeRetryDelay(config, 4)).toBe(800); // 100 * 2^3
    });

    it("should cap at maxDelayMs", () => {
      const config: RetryPolicyConfig = {
        ...DefaultRetryPolicyConfig,
        backoffStrategy: "exponential",
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        jitter: false
      };
      // attempt 4: 1000 * 2^3 = 8000, capped to 5000
      expect(computeRetryDelay(config, 4)).toBe(5000);
    });

    it("should apply jitter within ±20% range", () => {
      const config: RetryPolicyConfig = {
        ...DefaultRetryPolicyConfig,
        backoffStrategy: "fixed",
        baseDelayMs: 1000,
        jitter: true
      };
      for (let i = 0; i < 20; i++) {
        const delay = computeRetryDelay(config, 1);
        expect(delay).toBeGreaterThanOrEqual(800); // 1000 * 0.8
        expect(delay).toBeLessThanOrEqual(1200); // 1000 * 1.2
      }
    });
  });

  describe("isRetriableError", () => {
    it("should defer to error's retriable flag when retryableErrors is empty", () => {
      const config: RetryPolicyConfig = {
        ...DefaultRetryPolicyConfig,
        retryableErrors: []
      };
      expect(isRetriableError(config, "TIMEOUT", true)).toBe(true);
      expect(isRetriableError(config, "TIMEOUT", false)).toBe(false);
    });

    it("should only retry codes in retryableErrors when non-empty", () => {
      const config: RetryPolicyConfig = {
        ...DefaultRetryPolicyConfig,
        retryableErrors: ["TIMEOUT", "RATE_LIMIT"]
      };
      expect(isRetriableError(config, "TIMEOUT", false)).toBe(true);
      expect(isRetriableError(config, "RATE_LIMIT", false)).toBe(true);
      expect(isRetriableError(config, "AUTH", true)).toBe(false); // not in list
    });
  });

  describe("ConfigurableRetryPolicy", () => {
    it("should respect maxAttempts", () => {
      const policy = new ConfigurableRetryPolicy({
        ...DefaultRetryPolicyConfig,
        maxAttempts: 3,
        backoffStrategy: "fixed",
        baseDelayMs: 1,
        jitter: false
      });
      const retriableError = { code: "TIMEOUT", message: "x", retriable: true };

      expect(policy.maxAttempts).toBe(3);
      expect(policy.nextDelay(1, retriableError)).not.toBeNull();
      expect(policy.nextDelay(2, retriableError)).not.toBeNull();
      expect(policy.nextDelay(3, retriableError)).toBeNull(); // at max
    });

    it("should reject non-retriable errors immediately", () => {
      const policy = new ConfigurableRetryPolicy(DefaultRetryPolicyConfig);
      const fatalError = { code: "AUTH", message: "bad creds", retriable: false };
      expect(policy.nextDelay(1, fatalError)).toBeNull();
    });

    it("should filter by retryableErrors when configured", () => {
      const policy = new ConfigurableRetryPolicy({
        ...DefaultRetryPolicyConfig,
        retryableErrors: ["RATE_LIMIT"]
      });
      const timeoutError = { code: "TIMEOUT", message: "slow", retriable: true };
      const rateLimitError = { code: "RATE_LIMIT", message: "limited", retriable: true };

      expect(policy.nextDelay(1, timeoutError)).toBeNull(); // not in filter
      expect(policy.nextDelay(1, rateLimitError)).not.toBeNull();
    });
  });

  describe("NoRetryPolicy", () => {
    it("should never retry", () => {
      const policy = new NoRetryPolicy();
      const error = { code: "TIMEOUT", message: "x", retriable: true };
      expect(policy.maxAttempts).toBe(1);
      expect(policy.nextDelay(1, error)).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// C2. ProviderSelectionPolicy
// ═══════════════════════════════════════════════════════════════════

describe("C2: ProviderSelectionPolicy", () => {
  describe("CheapestProviderPolicy", () => {
    it("should select the candidate with lowest costScore", () => {
      const policy = new CheapestProviderPolicy();
      const input = makeSelectionInput([
        makeCandidate({ providerCode: "a", costScore: 80 }),
        makeCandidate({ providerCode: "b", costScore: 20 }),
        makeCandidate({ providerCode: "c", costScore: 50 })
      ]);
      const output = policy.select(input);
      expect(output.providerCode).toBe("b");
      expect(output.reason).toContain("cheapest");
      expect(output.rejected.length).toBe(2);
    });

    it("should break ties by priority", () => {
      const policy = new CheapestProviderPolicy();
      const input = makeSelectionInput([
        makeCandidate({ providerCode: "a", costScore: 50, priority: 30 }),
        makeCandidate({ providerCode: "b", costScore: 50, priority: 70 })
      ]);
      const output = policy.select(input);
      expect(output.providerCode).toBe("b"); // higher priority wins tie
    });

    it("should return empty when no candidates", () => {
      const policy = new CheapestProviderPolicy();
      const output = policy.select(makeSelectionInput([]));
      expect(output.providerCode).toBe("");
      expect(output.reason).toBe("No candidates");
    });
  });

  describe("FastestProviderPolicy", () => {
    it("should select the candidate with lowest latencyMs", () => {
      const policy = new FastestProviderPolicy();
      const input = makeSelectionInput([
        makeCandidate({ providerCode: "a", latencyMs: 500 }),
        makeCandidate({ providerCode: "b", latencyMs: 100 }),
        makeCandidate({ providerCode: "c", latencyMs: 300 })
      ]);
      const output = policy.select(input);
      expect(output.providerCode).toBe("b");
      expect(output.reason).toContain("fastest");
    });
  });

  describe("HealthiestProviderPolicy", () => {
    it("should prefer healthy over degraded over offline", () => {
      const policy = new HealthiestProviderPolicy();
      const input = makeSelectionInput([
        makeCandidate({
          providerCode: "a",
          health: makeHealth({ providerCode: "a", status: "degraded", errorRate: 5 })
        }),
        makeCandidate({
          providerCode: "b",
          health: makeHealth({ providerCode: "b", status: "healthy", errorRate: 0 })
        }),
        makeCandidate({
          providerCode: "c",
          health: makeHealth({ providerCode: "c", status: "offline", errorRate: 100 })
        })
      ]);
      const output = policy.select(input);
      expect(output.providerCode).toBe("b");
      expect(output.reason).toContain("healthiest");
    });

    it("should break ties by lowest errorRate", () => {
      const policy = new HealthiestProviderPolicy();
      const input = makeSelectionInput([
        makeCandidate({
          providerCode: "a",
          health: makeHealth({ providerCode: "a", status: "healthy", errorRate: 5 })
        }),
        makeCandidate({
          providerCode: "b",
          health: makeHealth({ providerCode: "b", status: "healthy", errorRate: 1 })
        })
      ]);
      const output = policy.select(input);
      expect(output.providerCode).toBe("b");
    });
  });

  describe("WeightedProviderPolicy", () => {
    it("should compute weighted score and pick highest", () => {
      const policy = new WeightedProviderPolicy();
      // Default weights: priority 0.5, cost 0.25, reliability 0.25
      // a: 50*0.5 + (100-50)*0.25 + (100-0)*0.25 = 25 + 12.5 + 25 = 62.5
      // b: 80*0.5 + (100-20)*0.25 + (100-0)*0.25 = 40 + 20 + 25 = 85
      const input = makeSelectionInput([
        makeCandidate({
          providerCode: "a",
          priority: 50,
          costScore: 50,
          health: makeHealth({ providerCode: "a", errorRate: 0 })
        }),
        makeCandidate({
          providerCode: "b",
          priority: 80,
          costScore: 20,
          health: makeHealth({ providerCode: "b", errorRate: 0 })
        })
      ]);
      const output = policy.select(input);
      expect(output.providerCode).toBe("b");
      expect(output.reason).toContain("weighted");
    });

    it("should accept custom weights", () => {
      const policy = new WeightedProviderPolicy({ priority: 0.1, cost: 0.8, reliability: 0.1 });
      // With cost-heavy weights, cheapest wins despite lower priority
      const input = makeSelectionInput([
        makeCandidate({ providerCode: "a", priority: 90, costScore: 80 }),
        makeCandidate({ providerCode: "b", priority: 10, costScore: 10 })
      ]);
      const output = policy.select(input);
      expect(output.providerCode).toBe("b");
    });
  });

  describe("ExactProviderPolicy", () => {
    it("should return the matching candidate", () => {
      const policy = new ExactProviderPolicy("temu");
      const input = makeSelectionInput([
        makeCandidate({ providerCode: "aliexpress" }),
        makeCandidate({ providerCode: "temu" }),
        makeCandidate({ providerCode: "shopee" })
      ]);
      const output = policy.select(input);
      expect(output.providerCode).toBe("temu");
      expect(output.reason).toContain("exact match");
      expect(output.rejected.length).toBe(2);
    });

    it("should return empty when no match", () => {
      const policy = new ExactProviderPolicy("unknown");
      const input = makeSelectionInput([makeCandidate({ providerCode: "aliexpress" })]);
      const output = policy.select(input);
      expect(output.providerCode).toBe("");
      expect(output.reason).toContain("No candidate matches");
    });
  });

  describe("createSelectionPolicy factory", () => {
    it("should create each strategy type", () => {
      expect(createSelectionPolicy("cheapest").strategy).toBe("cheapest");
      expect(createSelectionPolicy("fastest").strategy).toBe("fastest");
      expect(createSelectionPolicy("healthiest").strategy).toBe("healthiest");
      expect(createSelectionPolicy("weighted").strategy).toBe("weighted");
      expect(createSelectionPolicy("exact", { requestedCode: "x" }).strategy).toBe("exact");
    });

    it("should throw for exact without requestedCode", () => {
      expect(() => createSelectionPolicy("exact")).toThrow("requestedCode");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// C3. ErrorTaxonomy
// ═══════════════════════════════════════════════════════════════════

describe("C3: ErrorTaxonomy", () => {
  it("should expose 11 standardized codes", () => {
    const codes = Object.values(ErrorTaxonomy);
    expect(codes.length).toBe(11);
    expect(codes).toContain("RATE_LIMIT");
    expect(codes).toContain("NETWORK");
    expect(codes).toContain("AUTH");
    expect(codes).toContain("TIMEOUT");
    expect(codes).toContain("INVALID_RESPONSE");
    expect(codes).toContain("BAD_DATA");
    expect(codes).toContain("NOT_FOUND");
    expect(codes).toContain("CANCELLED");
    expect(codes).toContain("NO_PROVIDER");
    expect(codes).toContain("OVER_QUOTA");
    expect(codes).toContain("UNKNOWN");
  });

  describe("canonicalizeErrorCode", () => {
    it("should pass through canonical codes", () => {
      expect(canonicalizeErrorCode("TIMEOUT")).toBe("TIMEOUT");
      expect(canonicalizeErrorCode("RATE_LIMIT")).toBe("RATE_LIMIT");
      expect(canonicalizeErrorCode("AUTH")).toBe("AUTH");
    });

    it("should migrate legacy codes", () => {
      expect(canonicalizeErrorCode("PROVIDER_ERROR")).toBe("NETWORK");
      expect(canonicalizeErrorCode("RATE_LIMITED")).toBe("RATE_LIMIT");
    });

    it("should map unknown codes to UNKNOWN", () => {
      expect(canonicalizeErrorCode("SOMETHING_WEIRD")).toBe("UNKNOWN");
      expect(canonicalizeErrorCode("")).toBe("UNKNOWN");
    });
  });

  describe("DEFAULT_RETRIABILITY", () => {
    it("should mark transient errors as retriable", () => {
      expect(DEFAULT_RETRIABILITY.RATE_LIMIT).toBe(true);
      expect(DEFAULT_RETRIABILITY.NETWORK).toBe(true);
      expect(DEFAULT_RETRIABILITY.TIMEOUT).toBe(true);
      expect(DEFAULT_RETRIABILITY.INVALID_RESPONSE).toBe(true);
      expect(DEFAULT_RETRIABILITY.OVER_QUOTA).toBe(true);
    });

    it("should mark permanent errors as non-retriable", () => {
      expect(DEFAULT_RETRIABILITY.AUTH).toBe(false);
      expect(DEFAULT_RETRIABILITY.BAD_DATA).toBe(false);
      expect(DEFAULT_RETRIABILITY.NOT_FOUND).toBe(false);
      expect(DEFAULT_RETRIABILITY.CANCELLED).toBe(false);
      expect(DEFAULT_RETRIABILITY.NO_PROVIDER).toBe(false);
      expect(DEFAULT_RETRIABILITY.UNKNOWN).toBe(false);
    });
  });

  describe("WorkerErrors factory", () => {
    it("should produce errors with canonical codes", () => {
      expect(WorkerErrors.timeout(1000).code).toBe("TIMEOUT");
      expect(WorkerErrors.network("fail").code).toBe("NETWORK");
      expect(WorkerErrors.rateLimit("aliexpress").code).toBe("RATE_LIMIT");
      expect(WorkerErrors.auth("bad").code).toBe("AUTH");
      expect(WorkerErrors.invalidResponse("bad").code).toBe("INVALID_RESPONSE");
      expect(WorkerErrors.badData("bad").code).toBe("BAD_DATA");
      expect(WorkerErrors.notFound("thing").code).toBe("NOT_FOUND");
      expect(WorkerErrors.cancelled().code).toBe("CANCELLED");
      expect(WorkerErrors.unknown(new Error("x")).code).toBe("UNKNOWN");
      expect(WorkerErrors.noProvider("p").code).toBe("NO_PROVIDER");
      expect(WorkerErrors.overQuota("p").code).toBe("OVER_QUOTA");
    });

    it("should set retriable flag from DEFAULT_RETRIABILITY", () => {
      expect(WorkerErrors.timeout(1000).retriable).toBe(true);
      expect(WorkerErrors.auth("bad").retriable).toBe(false);
    });

    it("fromCode should canonicalize legacy codes", () => {
      const err = WorkerErrors.fromCode("PROVIDER_ERROR", "connection reset");
      expect(err.code).toBe("NETWORK");
      expect(err.retriable).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// C4. ProviderSnapshot
// ═══════════════════════════════════════════════════════════════════

describe("C4: ProviderSnapshot", () => {
  it("should build an immutable snapshot from provider state", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    const health = makeHealth({
      providerCode: "aliexpress",
      status: "healthy",
      errorRate: 0.02,
      averageLatencyMs: 250,
      consecutiveFailures: 0,
      totalRequests: 1500,
      requestsRemaining: 45,
      resetAt: new Date("2025-01-01T00:01:00Z")
    });
    const snapshot = buildProviderSnapshot({
      providerCode: "aliexpress",
      providerVersion: "1.2.3",
      manifestVersion: "manifest_v2",
      health,
      rateLimitPerMinute: 60,
      now
    });

    expect(snapshot.providerCode).toBe("aliexpress");
    expect(snapshot.providerVersion).toBe("1.2.3");
    expect(snapshot.manifestVersion).toBe("manifest_v2");
    expect(snapshot.capturedAt).toBe(now);
    expect(snapshot.health.status).toBe("healthy");
    expect(snapshot.health.errorRate).toBe(0.02);
    expect(snapshot.health.averageLatencyMs).toBe(250);
    expect(snapshot.rateLimit.requestsRemaining).toBe(45);
    expect(snapshot.rateLimit.limitPerMinute).toBe(60);
  });

  it("should produce unique IDs per snapshot", () => {
    const health = makeHealth();
    const s1 = buildProviderSnapshot({
      providerCode: "a",
      providerVersion: "1",
      manifestVersion: "m1",
      health,
      rateLimitPerMinute: 60
    });
    const s2 = buildProviderSnapshot({
      providerCode: "a",
      providerVersion: "1",
      manifestVersion: "m1",
      health,
      rateLimitPerMinute: 60
    });
    expect(s1.id).not.toBe(s2.id);
  });
});

// ═══════════════════════════════════════════════════════════════════
// C5. DiscoveryExecutionResult
// ═══════════════════════════════════════════════════════════════════

describe("C5: DiscoveryExecutionResult", () => {
  it("should map a completed WorkerResult to succeeded", () => {
    const wr: WorkerResult = completedResult({
      jobId: "job_001",
      providerCode: "aliexpress",
      productsDiscovered: 42,
      hasMore: false,
      attempts: 1,
      durationMs: 1500,
      apiCallsUsed: 3,
      reservationConsumed: true,
      metrics: makeMetricsSnapshot()
    });
    const snapshot = buildProviderSnapshot({
      providerCode: "aliexpress",
      providerVersion: "1.0.0",
      manifestVersion: "m1",
      health: makeHealth(),
      rateLimitPerMinute: 60
    });

    const result = toDiscoveryExecutionResult({
      workerResult: wr,
      planId: "plan_001",
      executionKey: "ek_abc",
      providerSnapshot: snapshot,
      workflowVersion: "1.0.0",
      plannerVersion: "1.0.0"
    });

    expect(result.jobId).toBe("job_001");
    expect(result.planId).toBe("plan_001");
    expect(result.executionKey).toBe("ek_abc");
    expect(result.providerId).toBe("aliexpress");
    expect(result.status).toBe("succeeded");
    expect(result.durationMs).toBe(1500);
    expect(result.attempts).toBe(1);
    expect(result.apiCallsUsed).toBe(3);
    expect(result.productsDiscovered).toBe(42);
    expect(result.productsNormalized).toBe(42);
    expect(result.hasMore).toBe(false);
    expect(result.warnings.length).toBe(0);
    expect(result.errors.length).toBe(0);
    expect(result.schemaVersion).toBe(DISCOVERY_RESULT_SCHEMA_VERSION);
    expect(result.workflowVersion).toBe("1.0.0");
    expect(result.plannerVersion).toBe("1.0.0");
    expect(result.metrics.itemsProcessed).toBe(10);
    expect(result.metrics.checkpointsSaved).toBe(1);
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it("should map a failed WorkerResult to failed with error details", () => {
    const wr: WorkerResult = {
      state: "failed",
      jobId: "job_002",
      providerCode: "temu",
      productsDiscovered: 0,
      hasMore: false,
      attempts: 3,
      durationMs: 5000,
      apiCallsUsed: 2,
      reservationConsumed: false,
      error: WorkerErrors.timeout(5000),
      metrics: makeMetricsSnapshot({ retries: 2 })
    };
    const snapshot = buildProviderSnapshot({
      providerCode: "temu",
      providerVersion: "2.0.0",
      manifestVersion: "m2",
      health: makeHealth({ providerCode: "temu" }),
      rateLimitPerMinute: 30
    });

    const result = toDiscoveryExecutionResult({
      workerResult: wr,
      planId: "plan_002",
      executionKey: "ek_def",
      providerSnapshot: snapshot,
      workflowVersion: "1.0.0",
      plannerVersion: "1.0.0",
      warnings: ["provider was degraded"]
    });

    expect(result.status).toBe("failed");
    expect(result.attempts).toBe(3);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]!.code).toBe("TIMEOUT");
    expect(result.errors[0]!.retriable).toBe(true);
    expect(result.warnings).toEqual(["provider was degraded"]);
    expect(result.metrics.retries).toBe(2);
  });

  it("should map a cancelled WorkerResult to cancelled", () => {
    const wr: WorkerResult = {
      state: "cancelled",
      jobId: "job_003",
      providerCode: "shopee",
      productsDiscovered: 0,
      hasMore: false,
      attempts: 1,
      durationMs: 50,
      apiCallsUsed: 0,
      reservationConsumed: false,
      error: WorkerErrors.cancelled("user requested"),
      metrics: makeMetricsSnapshot()
    };
    const snapshot = buildProviderSnapshot({
      providerCode: "shopee",
      providerVersion: "1.0.0",
      manifestVersion: "m1",
      health: makeHealth({ providerCode: "shopee" }),
      rateLimitPerMinute: 60
    });

    const result = toDiscoveryExecutionResult({
      workerResult: wr,
      planId: "plan_003",
      executionKey: "ek_ghi",
      providerSnapshot: snapshot,
      workflowVersion: "1.0.0",
      plannerVersion: "1.0.0"
    });

    expect(result.status).toBe("cancelled");
    expect(result.errors[0]!.code).toBe("CANCELLED");
    expect(result.errors[0]!.retriable).toBe(false);
  });

  it("should canonicalize legacy error codes in the mapping", () => {
    const wr: WorkerResult = {
      state: "failed",
      jobId: "job_004",
      providerCode: "aliexpress",
      productsDiscovered: 0,
      hasMore: false,
      attempts: 1,
      durationMs: 100,
      apiCallsUsed: 0,
      reservationConsumed: false,
      error: { code: "PROVIDER_ERROR", message: "legacy", retriable: true },
      metrics: makeMetricsSnapshot()
    };
    const snapshot = buildProviderSnapshot({
      providerCode: "aliexpress",
      providerVersion: "1.0.0",
      manifestVersion: "m1",
      health: makeHealth(),
      rateLimitPerMinute: 60
    });

    const result = toDiscoveryExecutionResult({
      workerResult: wr,
      planId: "plan_004",
      executionKey: "ek_jkl",
      providerSnapshot: snapshot,
      workflowVersion: "1.0.0",
      plannerVersion: "1.0.0"
    });

    // PROVIDER_ERROR → NETWORK (canonical)
    expect(result.errors[0]!.code).toBe("NETWORK");
  });

  it("should always carry schemaVersion 1.0.0", () => {
    expect(DISCOVERY_RESULT_SCHEMA_VERSION).toBe("1.0.0");
  });
});
