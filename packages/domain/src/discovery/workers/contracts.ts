/**
 * @workspace/domain/discovery/workers/contracts
 *
 * Five cross-cutting contracts that formalize behaviors already spread
 * across the workers module. Defining them here as explicit contracts:
 *
 *   C1. RetryPolicyConfig  — declarative retry config (data, not behavior)
 *   C2. ProviderSelectionPolicy — swappable selection strategies
 *   C3. ErrorTaxonomy       — standardized error code enum
 *   C4. ProviderSnapshot    — audit trail of provider state at execution
 *   C5. DiscoveryExecutionResult — observability contract
 *
 * These are NOT new bounded contexts. They are explicit contracts that
 * prevent future refactor pain when:
 *   - swapping retry strategies (fixed/linear/exponential)
 *   - swapping provider selection strategies (cheapest/fastest/healthiest/weighted)
 *   - building dashboards over standardized error codes
 *   - auditing which provider state produced a result
 *   - feeding observability pipelines with a stable result shape
 *
 * Existing modules (retry.ts, provider-selection.ts, result.ts, types.ts)
 * are updated to implement these contracts without breaking the API.
 */
import type { BrandedId } from "../../shared";
import type { ProviderHealth } from "./types";

// ═══════════════════════════════════════════════════════════════════
// C1. RetryPolicyConfig — declarative retry configuration
// ═══════════════════════════════════════════════════════════════════

/**
 * Declarative retry configuration. This is DATA — strategies interpret it.
 *
 * The existing `RetryPolicy` interface (in types.ts) is the BEHAVIOR
 * contract. `RetryPolicyConfig` is the DATA contract. A single config
 * can be interpreted by FixedBackoffStrategy, LinearBackoffStrategy,
 * or ExponentialBackoffStrategy.
 */
export interface RetryPolicyConfig {
  /** Max attempts including the initial try (1 = no retries). */
  readonly maxAttempts: number;
  /** Backoff shape. */
  readonly backoffStrategy: BackoffStrategy;
  /** Base delay in ms. */
  readonly baseDelayMs: number;
  /** Cap for delay in ms. */
  readonly maxDelayMs: number;
  /** Add ±20% jitter to avoid thundering herd. */
  readonly jitter: boolean;
  /**
   * Error codes that ARE retriable. Empty = retry all retriable errors.
   * Non-empty = only retry errors whose code is in this list.
   */
  readonly retryableErrors: ReadonlyArray<string>;
}

export type BackoffStrategy = "fixed" | "linear" | "exponential";

export const DefaultRetryPolicyConfig: RetryPolicyConfig = {
  maxAttempts: 4,
  backoffStrategy: "exponential",
  baseDelayMs: 500,
  maxDelayMs: 30_000,
  jitter: true,
  retryableErrors: []
};

/**
 * Compute delay for a given attempt under a config. Pure function.
 * attempt = 1 is the first retry (after the initial failure).
 */
export function computeRetryDelay(config: RetryPolicyConfig, attempt: number): number {
  let raw: number;
  switch (config.backoffStrategy) {
    case "fixed":
      raw = config.baseDelayMs;
      break;
    case "linear":
      raw = config.baseDelayMs * attempt;
      break;
    case "exponential":
      raw = config.baseDelayMs * Math.pow(2, attempt - 1);
      break;
  }
  const capped = Math.min(config.maxDelayMs, raw);
  if (!config.jitter) return capped;
  // ±20% jitter
  const jitterFactor = 0.8 + Math.random() * 0.4;
  return Math.round(capped * jitterFactor);
}

/**
 * Decide whether an error code is retriable under a config.
 * If retryableErrors is empty, defer to the error's own retriable flag.
 * If non-empty, only retry codes explicitly listed.
 */
export function isRetriableError(
  config: RetryPolicyConfig,
  errorCode: string,
  errorRetriableFlag: boolean
): boolean {
  if (config.retryableErrors.length === 0) return errorRetriableFlag;
  return config.retryableErrors.includes(errorCode);
}

// ═══════════════════════════════════════════════════════════════════
// C2. ProviderSelectionPolicy — swappable selection strategies
// ═══════════════════════════════════════════════════════════════════

/**
 * Inputs to provider selection. The policy receives a snapshot of
 * candidate providers with their health/cost/latency metadata and
 * picks one.
 */
export interface ProviderSelectionInput {
  readonly capability: string;
  readonly region: string;
  readonly candidates: ReadonlyArray<ProviderCandidate>;
}

export interface ProviderCandidate {
  readonly providerCode: string;
  readonly providerVersion: string;
  readonly health: ProviderHealth;
  /** Relative cost score 0-100 (0 = free, 100 = expensive). */
  readonly costScore: number;
  /** Latency in ms (rolling average). */
  readonly latencyMs: number;
  /** Priority weight 0-100 (higher = preferred). */
  readonly priority: number;
}

export interface ProviderSelectionOutput {
  readonly providerCode: string;
  readonly reason: string;
  readonly rejected: ReadonlyArray<{ providerCode: string; reason: string }>;
}

/**
 * Strategy interface — implementations pick one candidate from the input.
 * Swap strategies without touching Workers.
 */
export interface ProviderSelectionPolicy {
  readonly strategy: SelectionStrategy;
  select(input: ProviderSelectionInput): ProviderSelectionOutput;
}

export type SelectionStrategy = "cheapest" | "fastest" | "healthiest" | "weighted" | "exact";

/**
 * Cheapest: lowest costScore wins. Ties broken by priority.
 */
export class CheapestProviderPolicy implements ProviderSelectionPolicy {
  readonly strategy = "cheapest" as const;
  select(input: ProviderSelectionInput): ProviderSelectionOutput {
    if (input.candidates.length === 0) {
      return { providerCode: "", reason: "No candidates", rejected: [] };
    }
    const sorted = [...input.candidates].sort((a, b) => {
      if (a.costScore !== b.costScore) return a.costScore - b.costScore;
      return b.priority - a.priority;
    });
    const winner = sorted[0]!;
    return {
      providerCode: winner.providerCode,
      reason: `cheapest: cost=${winner.costScore}, priority=${winner.priority}`,
      rejected: sorted.slice(1).map((c) => ({
        providerCode: c.providerCode,
        reason: `higher cost (${c.costScore} > ${winner.costScore})`
      }))
    };
  }
}

/**
 * Fastest: lowest latencyMs wins. Ties broken by priority.
 */
export class FastestProviderPolicy implements ProviderSelectionPolicy {
  readonly strategy = "fastest" as const;
  select(input: ProviderSelectionInput): ProviderSelectionOutput {
    if (input.candidates.length === 0) {
      return { providerCode: "", reason: "No candidates", rejected: [] };
    }
    const sorted = [...input.candidates].sort((a, b) => {
      if (a.latencyMs !== b.latencyMs) return a.latencyMs - b.latencyMs;
      return b.priority - a.priority;
    });
    const winner = sorted[0]!;
    return {
      providerCode: winner.providerCode,
      reason: `fastest: latency=${winner.latencyMs}ms, priority=${winner.priority}`,
      rejected: sorted.slice(1).map((c) => ({
        providerCode: c.providerCode,
        reason: `higher latency (${c.latencyMs} > ${winner.latencyMs})`
      }))
    };
  }
}

/**
 * Healthiest: best health status wins (healthy > degraded > offline).
 * Ties broken by lowest errorRate, then by priority.
 */
export class HealthiestProviderPolicy implements ProviderSelectionPolicy {
  readonly strategy = "healthiest" as const;
  select(input: ProviderSelectionInput): ProviderSelectionOutput {
    if (input.candidates.length === 0) {
      return { providerCode: "", reason: "No candidates", rejected: [] };
    }
    const rank = (h: ProviderHealth): number => {
      if (h.status === "healthy") return 3;
      if (h.status === "degraded") return 2;
      return 0; // offline
    };
    const sorted = [...input.candidates].sort((a, b) => {
      const ra = rank(a.health);
      const rb = rank(b.health);
      if (ra !== rb) return rb - ra;
      if (a.health.errorRate !== b.health.errorRate) {
        return a.health.errorRate - b.health.errorRate;
      }
      return b.priority - a.priority;
    });
    const winner = sorted[0]!;
    return {
      providerCode: winner.providerCode,
      reason: `healthiest: status=${winner.health.status}, errorRate=${winner.health.errorRate}`,
      rejected: sorted.slice(1).map((c) => ({
        providerCode: c.providerCode,
        reason: `worse health (${c.health.status} vs ${winner.health.status})`
      }))
    };
  }
}

/**
 * Weighted: score = priority * 0.5 + (100 - costScore) * 0.25 + (100 - errorRate) * 0.25.
 * Highest score wins.
 */
export class WeightedProviderPolicy implements ProviderSelectionPolicy {
  readonly strategy = "weighted" as const;
  private readonly weights: { priority: number; cost: number; reliability: number };

  constructor(weights?: { priority: number; cost: number; reliability: number }) {
    this.weights = weights ?? { priority: 0.5, cost: 0.25, reliability: 0.25 };
  }

  select(input: ProviderSelectionInput): ProviderSelectionOutput {
    if (input.candidates.length === 0) {
      return { providerCode: "", reason: "No candidates", rejected: [] };
    }
    const score = (c: ProviderCandidate): number => {
      const reliability = 100 - c.health.errorRate;
      return (
        c.priority * this.weights.priority +
        (100 - c.costScore) * this.weights.cost +
        reliability * this.weights.reliability
      );
    };
    const sorted = [...input.candidates].sort((a, b) => score(b) - score(a));
    const winner = sorted[0]!;
    return {
      providerCode: winner.providerCode,
      reason: `weighted: score=${score(winner).toFixed(2)} (priority=${winner.priority}, cost=${winner.costScore}, errorRate=${winner.health.errorRate})`,
      rejected: sorted.slice(1).map((c) => ({
        providerCode: c.providerCode,
        reason: `lower score (${score(c).toFixed(2)} < ${score(winner).toFixed(2)})`
      }))
    };
  }
}

/**
 * Exact: return the candidate whose providerCode matches the requested code.
 * Used when the job explicitly specifies a provider.
 */
export class ExactProviderPolicy implements ProviderSelectionPolicy {
  readonly strategy = "exact" as const;
  constructor(private readonly requestedCode: string) {}

  select(input: ProviderSelectionInput): ProviderSelectionOutput {
    const match = input.candidates.find((c) => c.providerCode === this.requestedCode);
    if (!match) {
      return {
        providerCode: "",
        reason: `No candidate matches requested code '${this.requestedCode}'`,
        rejected: input.candidates.map((c) => ({
          providerCode: c.providerCode,
          reason: `does not match '${this.requestedCode}'`
        }))
      };
    }
    return {
      providerCode: match.providerCode,
      reason: `exact match for '${this.requestedCode}'`,
      rejected: input.candidates
        .filter((c) => c.providerCode !== this.requestedCode)
        .map((c) => ({
          providerCode: c.providerCode,
          reason: `does not match '${this.requestedCode}'`
        }))
    };
  }
}

export function createSelectionPolicy(
  strategy: SelectionStrategy,
  options?: {
    requestedCode?: string;
    weights?: { priority: number; cost: number; reliability: number };
  }
): ProviderSelectionPolicy {
  switch (strategy) {
    case "cheapest":
      return new CheapestProviderPolicy();
    case "fastest":
      return new FastestProviderPolicy();
    case "healthiest":
      return new HealthiestProviderPolicy();
    case "weighted":
      return new WeightedProviderPolicy(options?.weights);
    case "exact":
      if (!options?.requestedCode) {
        throw new Error("ExactProviderPolicy requires options.requestedCode");
      }
      return new ExactProviderPolicy(options.requestedCode);
  }
}

// ═══════════════════════════════════════════════════════════════════
// C3. ErrorTaxonomy — standardized error codes
// ═══════════════════════════════════════════════════════════════════

/**
 * Standardized error codes for the discovery pipeline.
 * Every error produced by Workers, Executors, and Connectors MUST
 * map to one of these codes. This enables:
 *   - dashboards grouping by error code
 *   - retry policies keyed by code
 *   - alerting rules per code
 */
export const ErrorTaxonomy = {
  RATE_LIMIT: "RATE_LIMIT",
  NETWORK: "NETWORK",
  AUTH: "AUTH",
  TIMEOUT: "TIMEOUT",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  BAD_DATA: "BAD_DATA",
  NOT_FOUND: "NOT_FOUND",
  CANCELLED: "CANCELLED",
  NO_PROVIDER: "NO_PROVIDER",
  OVER_QUOTA: "OVER_QUOTA",
  UNKNOWN: "UNKNOWN"
} as const;

export type ErrorTaxonomyCode = (typeof ErrorTaxonomy)[keyof typeof ErrorTaxonomy];

/**
 * Map legacy ad-hoc codes to the standardized taxonomy.
 * Existing WorkerErrors use codes like "PROVIDER_ERROR" — this maps
 * them to the canonical set so dashboards see consistent codes.
 */
const CODE_MIGRATION: Record<string, ErrorTaxonomyCode> = {
  PROVIDER_ERROR: ErrorTaxonomy.NETWORK, // generic provider error → network
  RATE_LIMITED: ErrorTaxonomy.RATE_LIMIT,
  CANCELLED: ErrorTaxonomy.CANCELLED,
  NO_PROVIDER: ErrorTaxonomy.NO_PROVIDER,
  OVER_QUOTA: ErrorTaxonomy.OVER_QUOTA,
  // Already-canonical codes pass through
  RATE_LIMIT: ErrorTaxonomy.RATE_LIMIT,
  NETWORK: ErrorTaxonomy.NETWORK,
  AUTH: ErrorTaxonomy.AUTH,
  TIMEOUT: ErrorTaxonomy.TIMEOUT,
  INVALID_RESPONSE: ErrorTaxonomy.INVALID_RESPONSE,
  BAD_DATA: ErrorTaxonomy.BAD_DATA,
  NOT_FOUND: ErrorTaxonomy.NOT_FOUND,
  UNKNOWN: ErrorTaxonomy.UNKNOWN
};

export function canonicalizeErrorCode(code: string): ErrorTaxonomyCode {
  return CODE_MIGRATION[code] ?? ErrorTaxonomy.UNKNOWN;
}

/**
 * Default retriability per taxonomy code. Override via RetryPolicyConfig.retryableErrors.
 */
export const DEFAULT_RETRIABILITY: Record<ErrorTaxonomyCode, boolean> = {
  RATE_LIMIT: true,
  NETWORK: true,
  AUTH: false, // credentials won't fix themselves
  TIMEOUT: true,
  INVALID_RESPONSE: true, // transient parsing issues
  BAD_DATA: false, // bad input won't fix itself
  NOT_FOUND: false, // 404 won't fix itself
  CANCELLED: false,
  NO_PROVIDER: false,
  OVER_QUOTA: true, // wait for quota reset
  UNKNOWN: false // conservative
};

// ═══════════════════════════════════════════════════════════════════
// C4. ProviderSnapshot — audit trail of provider state at execution
// ═══════════════════════════════════════════════════════════════════

export type ProviderSnapshotId = BrandedId<"ProviderSnapshotId">;

/**
 * Immutable snapshot of a provider's state at the moment a job starts
 * executing against it. Captured once per job execution and attached
 * to the WorkerResult for audit/replay.
 */
export interface ProviderSnapshot {
  readonly id: ProviderSnapshotId;
  readonly providerCode: string;
  readonly providerVersion: string;
  readonly manifestVersion: string;
  readonly capturedAt: Date;
  readonly health: {
    readonly providerCode?: string;
    readonly status: ProviderHealth["status"];
    readonly errorRate: number;
    readonly averageLatencyMs: number;
    readonly consecutiveFailures: number;
    readonly totalRequests: number;
    readonly lastSuccess?: Date;
  };
  readonly rateLimit: {
    readonly requestsRemaining?: number;
    readonly resetAt?: Date;
    readonly limitPerMinute: number;
  };
}

export function buildProviderSnapshot(params: {
  providerCode: string;
  providerVersion: string;
  manifestVersion: string;
  health: ProviderHealth;
  rateLimitPerMinute: number;
  now?: Date;
}): ProviderSnapshot {
  // Include a random suffix to guarantee uniqueness even when two snapshots
  // are built in the same millisecond.
  const rand = Math.random().toString(36).slice(2, 8);
  const id = `ps_${params.providerCode}_${Date.now()}_${rand}` as unknown as ProviderSnapshotId;
  return {
    id,
    providerCode: params.providerCode,
    providerVersion: params.providerVersion,
    manifestVersion: params.manifestVersion,
    capturedAt: params.now ?? new Date(),
    health: {
      status: params.health.status,
      errorRate: params.health.errorRate,
      averageLatencyMs: params.health.averageLatencyMs,
      consecutiveFailures: params.health.consecutiveFailures,
      totalRequests: params.health.totalRequests
    },
    rateLimit: {
      requestsRemaining: params.health.requestsRemaining,
      resetAt: params.health.resetAt,
      limitPerMinute: params.rateLimitPerMinute
    }
  };
}

// ═══════════════════════════════════════════════════════════════════
// C5. DiscoveryExecutionResult — observability contract
// ═══════════════════════════════════════════════════════════════════

/**
 * Stable result shape for observability pipelines. This is the
 * contract that dashboards, alerting, and replay tools consume.
 *
 * WorkerResult (in types.ts) is the internal worker perspective.
 * DiscoveryExecutionResult is the external observability perspective.
 * A mapper converts WorkerResult → DiscoveryExecutionResult.
 */
export interface DiscoveryExecutionResult {
  readonly jobId: string;
  readonly planId: string;
  readonly executionKey: string;
  readonly providerId: string;
  readonly providerSnapshot: ProviderSnapshot;
  readonly status: "succeeded" | "failed" | "cancelled";
  readonly durationMs: number;
  readonly attempts: number;
  readonly apiCallsUsed: number;
  readonly productsDiscovered: number;
  readonly productsNormalized: number;
  readonly nextCursor?: string;
  readonly hasMore: boolean;
  readonly warnings: ReadonlyArray<string>;
  readonly errors: ReadonlyArray<{
    code: ErrorTaxonomyCode;
    message: string;
    retriable: boolean;
  }>;
  readonly metrics: {
    readonly discoveryDurationMs: number;
    readonly checkpointDurationMs: number;
    readonly rateLimitWaitMs: number;
    readonly retryDelayMs: number;
    readonly itemsProcessed: number;
    readonly retries: number;
    readonly checkpointsSaved: number;
  };
  readonly schemaVersion: "1.0.0";
  readonly workflowVersion: string;
  readonly plannerVersion: string;
  readonly completedAt: Date;
}

export const DISCOVERY_RESULT_SCHEMA_VERSION = "1.0.0" as const;
