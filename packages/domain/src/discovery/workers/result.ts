/**
 * @workspace/domain/discovery/workers/result
 *
 * Helpers for building WorkerResult objects + mapping to the
 * DiscoveryExecutionResult observability contract.
 *
 * C3: WorkerErrors now use canonical ErrorTaxonomy codes.
 * C5: toDiscoveryExecutionResult() maps WorkerResult → DiscoveryExecutionResult.
 */
import type { WorkerResult, WorkerError, WorkerMetricsSnapshot } from "./types";
import type { ProviderSnapshot } from "./contracts";
import {
  ErrorTaxonomy,
  canonicalizeErrorCode,
  DEFAULT_RETRIABILITY,
  DISCOVERY_RESULT_SCHEMA_VERSION,
  type ErrorTaxonomyCode,
  type DiscoveryExecutionResult
} from "./contracts";

export function completed(params: {
  jobId: string;
  providerCode: string;
  productsDiscovered: number;
  nextCursor?: string;
  hasMore: boolean;
  attempts: number;
  durationMs: number;
  apiCallsUsed: number;
  reservationConsumed: boolean;
  metrics: WorkerMetricsSnapshot;
}): WorkerResult {
  return {
    state: "completed",
    jobId: params.jobId,
    providerCode: params.providerCode,
    productsDiscovered: params.productsDiscovered,
    nextCursor: params.nextCursor,
    hasMore: params.hasMore,
    attempts: params.attempts,
    durationMs: params.durationMs,
    apiCallsUsed: params.apiCallsUsed,
    reservationConsumed: params.reservationConsumed,
    metrics: params.metrics
  };
}

export function failed(params: {
  jobId: string;
  providerCode: string;
  attempts: number;
  durationMs: number;
  apiCallsUsed: number;
  reservationConsumed: boolean;
  error: WorkerError;
  metrics: WorkerMetricsSnapshot;
}): WorkerResult {
  return {
    state: "failed",
    jobId: params.jobId,
    providerCode: params.providerCode,
    productsDiscovered: 0,
    hasMore: false,
    attempts: params.attempts,
    durationMs: params.durationMs,
    apiCallsUsed: params.apiCallsUsed,
    reservationConsumed: params.reservationConsumed,
    error: params.error,
    metrics: params.metrics
  };
}

export function cancelled(params: {
  jobId: string;
  providerCode: string;
  attempts: number;
  durationMs: number;
  apiCallsUsed: number;
  reservationConsumed: boolean;
  reason: string;
  metrics: WorkerMetricsSnapshot;
}): WorkerResult {
  return {
    state: "cancelled",
    jobId: params.jobId,
    providerCode: params.providerCode,
    productsDiscovered: 0,
    hasMore: false,
    attempts: params.attempts,
    durationMs: params.durationMs,
    apiCallsUsed: params.apiCallsUsed,
    reservationConsumed: params.reservationConsumed,
    error: {
      code: ErrorTaxonomy.CANCELLED,
      message: params.reason,
      retriable: false
    },
    metrics: params.metrics
  };
}

/**
 * WorkerError factory. All codes now come from ErrorTaxonomy (C3).
 */
export const WorkerErrors = {
  timeout: (ms: number): WorkerError => ({
    code: ErrorTaxonomy.TIMEOUT,
    message: `Discovery call timed out after ${ms}ms`,
    retriable: DEFAULT_RETRIABILITY.TIMEOUT
  }),
  network: (msg: string): WorkerError => ({
    code: ErrorTaxonomy.NETWORK,
    message: msg,
    retriable: DEFAULT_RETRIABILITY.NETWORK
  }),
  rateLimit: (providerCode: string): WorkerError => ({
    code: ErrorTaxonomy.RATE_LIMIT,
    message: `Rate limit exceeded for provider ${providerCode}`,
    retriable: DEFAULT_RETRIABILITY.RATE_LIMIT
  }),
  auth: (msg: string): WorkerError => ({
    code: ErrorTaxonomy.AUTH,
    message: msg,
    retriable: DEFAULT_RETRIABILITY.AUTH
  }),
  invalidResponse: (msg: string): WorkerError => ({
    code: ErrorTaxonomy.INVALID_RESPONSE,
    message: msg,
    retriable: DEFAULT_RETRIABILITY.INVALID_RESPONSE
  }),
  badData: (msg: string): WorkerError => ({
    code: ErrorTaxonomy.BAD_DATA,
    message: msg,
    retriable: DEFAULT_RETRIABILITY.BAD_DATA
  }),
  notFound: (resource: string): WorkerError => ({
    code: ErrorTaxonomy.NOT_FOUND,
    message: `${resource} not found`,
    retriable: DEFAULT_RETRIABILITY.NOT_FOUND
  }),
  cancelled: (reason?: string): WorkerError => ({
    code: ErrorTaxonomy.CANCELLED,
    message: reason ?? "Cancellation requested",
    retriable: DEFAULT_RETRIABILITY.CANCELLED
  }),
  unknown: (err: unknown): WorkerError => ({
    code: ErrorTaxonomy.UNKNOWN,
    message: err instanceof Error ? err.message : String(err),
    retriable: DEFAULT_RETRIABILITY.UNKNOWN,
    cause: err
  }),
  noProvider: (providerCode: string): WorkerError => ({
    code: ErrorTaxonomy.NO_PROVIDER,
    message: `No connector registered for ${providerCode}`,
    retriable: DEFAULT_RETRIABILITY.NO_PROVIDER
  }),
  overQuota: (providerCode: string): WorkerError => ({
    code: ErrorTaxonomy.OVER_QUOTA,
    message: `Provider ${providerCode} returned over-quota`,
    retriable: DEFAULT_RETRIABILITY.OVER_QUOTA
  }),

  /**
   * Canonicalize a legacy error code to the taxonomy. Used by the
   * executor when wrapping raw connector errors.
   */
  fromCode: (code: string, message: string, cause?: unknown): WorkerError => {
    const canonical = canonicalizeErrorCode(code);
    return {
      code: canonical,
      message,
      retriable: DEFAULT_RETRIABILITY[canonical],
      cause
    };
  }
};

/**
 * C5: Map a WorkerResult to the DiscoveryExecutionResult observability contract.
 *
 * Caller supplies the ProviderSnapshot (captured at execution start) and
 * the version metadata.
 */
export function toDiscoveryExecutionResult(params: {
  workerResult: WorkerResult;
  planId: string;
  executionKey: string;
  providerSnapshot: ProviderSnapshot;
  workflowVersion: string;
  plannerVersion: string;
  warnings?: ReadonlyArray<string>;
  productsNormalized?: number;
}): DiscoveryExecutionResult {
  const wr = params.workerResult;
  const status: DiscoveryExecutionResult["status"] =
    wr.state === "completed" ? "succeeded" : wr.state === "cancelled" ? "cancelled" : "failed";

  const errors: DiscoveryExecutionResult["errors"] = wr.error
    ? [
        {
          code: canonicalizeErrorCode(wr.error.code) as ErrorTaxonomyCode,
          message: wr.error.message,
          retriable: wr.error.retriable
        }
      ]
    : [];

  return {
    jobId: wr.jobId,
    planId: params.planId,
    executionKey: params.executionKey,
    providerId: wr.providerCode,
    providerSnapshot: params.providerSnapshot,
    status,
    durationMs: wr.durationMs,
    attempts: wr.attempts,
    apiCallsUsed: wr.apiCallsUsed,
    productsDiscovered: wr.productsDiscovered,
    productsNormalized: params.productsNormalized ?? wr.productsDiscovered,
    nextCursor: wr.nextCursor,
    hasMore: wr.hasMore,
    warnings: params.warnings ?? [],
    errors,
    metrics: {
      discoveryDurationMs: wr.metrics.discoveryDurationMs,
      checkpointDurationMs: wr.metrics.checkpointDurationMs,
      rateLimitWaitMs: wr.metrics.rateLimitWaitMs,
      retryDelayMs: wr.metrics.retryDelayMs,
      itemsProcessed: wr.metrics.itemsProcessed,
      retries: wr.metrics.retries,
      checkpointsSaved: wr.metrics.checkpointsSaved
    },
    schemaVersion: DISCOVERY_RESULT_SCHEMA_VERSION,
    workflowVersion: params.workflowVersion,
    plannerVersion: params.plannerVersion,
    completedAt: new Date()
  };
}
