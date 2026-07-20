/**
 * @workspace/domain/discovery/workers/retry
 *
 * Retry strategies that interpret a declarative RetryPolicyConfig.
 *
 * The `RetryPolicy` interface (in types.ts) is the BEHAVIOR contract.
 * `RetryPolicyConfig` (in contracts.ts) is the DATA contract.
 *
 * Three strategies interpret the same config:
 *   - FixedBackoffStrategy:      delay = baseDelayMs
 *   - LinearBackoffStrategy:     delay = baseDelayMs * attempt
 *   - ExponentialBackoffStrategy: delay = baseDelayMs * 2^(attempt-1)
 *
 * All three honor maxDelayMs cap, jitter flag, and retryableErrors filter.
 */
import type { RetryPolicy, WorkerError, WorkerConfig } from "./types";
import {
  computeRetryDelay,
  isRetriableError,
  type RetryPolicyConfig,
  DefaultRetryPolicyConfig
} from "./contracts";

/**
 * Bridge from WorkerConfig (legacy) to RetryPolicyConfig (declarative).
 */
export function workerConfigToRetryPolicy(config: WorkerConfig): RetryPolicyConfig {
  return {
    maxAttempts: config.maxRetries + 1,
    backoffStrategy: "exponential",
    baseDelayMs: config.baseRetryDelayMs,
    maxDelayMs: config.maxRetryDelayMs,
    jitter: true,
    retryableErrors: []
  };
}

/**
 * Configurable retry policy backed by a RetryPolicyConfig.
 * Replaces the original ExponentialBackoffRetryPolicy.
 */
export class ConfigurableRetryPolicy implements RetryPolicy {
  readonly maxAttempts: number;

  constructor(private readonly config: RetryPolicyConfig) {
    this.maxAttempts = config.maxAttempts;
  }

  nextDelay(attempt: number, error: WorkerError): number | null {
    // Check retriability via the config's filter
    if (!isRetriableError(this.config, error.code, error.retriable)) {
      return null;
    }
    // No more attempts
    if (attempt >= this.maxAttempts) return null;

    return computeRetryDelay(this.config, attempt);
  }
}

/**
 * Backwards-compatible exponential backoff policy.
 * Uses RetryPolicyConfig under the hood with backoffStrategy="exponential".
 */
export class ExponentialBackoffRetryPolicy implements RetryPolicy {
  readonly maxAttempts: number;
  private readonly inner: ConfigurableRetryPolicy;

  constructor(config: Pick<WorkerConfig, "maxRetries" | "baseRetryDelayMs" | "maxRetryDelayMs">) {
    const declarative: RetryPolicyConfig = {
      maxAttempts: config.maxRetries + 1,
      backoffStrategy: "exponential",
      baseDelayMs: config.baseRetryDelayMs,
      maxDelayMs: config.maxRetryDelayMs,
      jitter: true,
      retryableErrors: []
    };
    this.inner = new ConfigurableRetryPolicy(declarative);
    this.maxAttempts = this.inner.maxAttempts;
  }

  nextDelay(attempt: number, error: WorkerError): number | null {
    return this.inner.nextDelay(attempt, error);
  }
}

export function createExponentialBackoffRetryPolicy(config: WorkerConfig): RetryPolicy {
  return new ExponentialBackoffRetryPolicy(config);
}

export function createConfigurableRetryPolicy(config: RetryPolicyConfig): RetryPolicy {
  return new ConfigurableRetryPolicy(config);
}

export function createDefaultRetryPolicy(): RetryPolicy {
  return new ConfigurableRetryPolicy(DefaultRetryPolicyConfig);
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
