/**
 * @workspace/domain/discovery/workers/retry
 *
 * Exponential backoff retry policy with jitter.
 *
 *   delay(attempt) = min(maxRetryDelayMs, baseRetryDelayMs * 2^(attempt-1)) + jitter
 *
 * Non-retriable errors return null immediately (no retry).
 */
import type { RetryPolicy, WorkerError, WorkerConfig } from "./types";

export class ExponentialBackoffRetryPolicy implements RetryPolicy {
  readonly maxAttempts: number;

  constructor(
    private readonly config: Pick<
      WorkerConfig,
      "maxRetries" | "baseRetryDelayMs" | "maxRetryDelayMs"
    >
  ) {
    this.maxAttempts = config.maxRetries + 1; // initial attempt + retries
  }

  nextDelay(attempt: number, error: WorkerError): number | null {
    // Never retry non-retriable errors
    if (!error.retriable) return null;
    // No more attempts
    if (attempt >= this.maxAttempts) return null;

    const exp = this.config.baseRetryDelayMs * Math.pow(2, attempt - 1);
    const capped = Math.min(this.config.maxRetryDelayMs, exp);
    // Jitter: ±20% to avoid thundering herd
    const jitterFactor = 0.8 + Math.random() * 0.4;
    return Math.round(capped * jitterFactor);
  }
}

export function createExponentialBackoffRetryPolicy(config: WorkerConfig): RetryPolicy {
  return new ExponentialBackoffRetryPolicy(config);
}

/**
 * No-retry policy for tests and for jobs where retry is undesired
 * (e.g. cancelled jobs).
 */
export class NoRetryPolicy implements RetryPolicy {
  readonly maxAttempts = 1;
  nextDelay(_attempt: number, _error: WorkerError): number | null {
    return null;
  }
}
