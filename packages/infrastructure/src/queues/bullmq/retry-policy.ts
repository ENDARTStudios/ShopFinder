/**
 * @workspace/infrastructure/queues/bullmq/retry-policy
 *
 * BullMQ retry configuration.
 * Uses BullMQ's native retry — no domain-level retry duplication.
 */
import type { BullMQQueueConfig } from "./types";

export interface RetryPolicyConfig {
  readonly maxAttempts: number;
  readonly backoffType: "exponential" | "fixed";
  readonly backoffDelayMs: number;
  readonly removeOnComplete: number;
  readonly removeOnFail: number;
}

/**
 * Default retry policy for discovery jobs.
 * - 5 attempts with exponential backoff (2s base)
 * - Keep last 100 completed for debugging
 * - Keep last 500 failed for dead-letter analysis
 */
export const DefaultRetryPolicy: RetryPolicyConfig = {
  maxAttempts: 5,
  backoffType: "exponential",
  backoffDelayMs: 2000,
  removeOnComplete: 100,
  removeOnFail: 500,
};

/**
 * Aggressive retry policy for transient failures (rate limits, timeouts).
 */
export const AggressiveRetryPolicy: RetryPolicyConfig = {
  maxAttempts: 8,
  backoffType: "exponential",
  backoffDelayMs: 1000,
  removeOnComplete: 50,
  removeOnFail: 200,
};

/**
 * No-retry policy for testing.
 */
export const NoRetryPolicy: RetryPolicyConfig = {
  maxAttempts: 1,
  backoffType: "fixed",
  backoffDelayMs: 0,
  removeOnComplete: 10,
  removeOnFail: 10,
};

/**
 * Convert a RetryPolicyConfig to BullMQ job options.
 */
export function toBullMQJobOptions(policy: RetryPolicyConfig) {
  return {
    attempts: policy.maxAttempts,
    backoff: {
      type: policy.backoffType,
      delay: policy.backoffDelayMs,
    },
    removeOnComplete: policy.removeOnComplete,
    removeOnFail: policy.removeOnFail,
  };
}

/**
 * Create a retry policy from a BullMQQueueConfig.
 */
export function fromQueueConfig(config: BullMQQueueConfig): RetryPolicyConfig {
  return {
    maxAttempts: config.maxAttempts,
    backoffType: config.backoffType,
    backoffDelayMs: config.backoffDelayMs,
    removeOnComplete: config.removeOnComplete,
    removeOnFail: config.removeOnFail,
  };
}
