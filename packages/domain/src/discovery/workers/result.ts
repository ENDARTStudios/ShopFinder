/**
 * @workspace/domain/discovery/workers/result
 *
 * Helpers for building WorkerResult objects.
 */
import type { WorkerResult, WorkerError, WorkerMetricsSnapshot } from "./types";

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
      code: "CANCELLED",
      message: params.reason,
      retriable: false
    },
    metrics: params.metrics
  };
}

/** Convenience builders for common WorkerError shapes. */
export const WorkerErrors = {
  timeout: (ms: number): WorkerError => ({
    code: "TIMEOUT",
    message: `Discovery call timed out after ${ms}ms`,
    retriable: true
  }),
  providerError: (msg: string): WorkerError => ({
    code: "PROVIDER_ERROR",
    message: msg,
    retriable: true
  }),
  rateLimited: (providerCode: string): WorkerError => ({
    code: "RATE_LIMITED",
    message: `Rate limit exceeded for provider ${providerCode}`,
    retriable: true
  }),
  cancelled: (reason?: string): WorkerError => ({
    code: "CANCELLED",
    message: reason ?? "Cancellation requested",
    retriable: false
  }),
  unknown: (err: unknown): WorkerError => ({
    code: "UNKNOWN",
    message: err instanceof Error ? err.message : String(err),
    retriable: false,
    cause: err
  }),
  noProvider: (providerCode: string): WorkerError => ({
    code: "NO_PROVIDER",
    message: `No connector registered for ${providerCode}`,
    retriable: false
  }),
  overQuota: (providerCode: string): WorkerError => ({
    code: "OVER_QUOTA",
    message: `Provider ${providerCode} returned over-quota`,
    retriable: true
  })
};
