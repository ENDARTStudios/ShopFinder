/**
 * @workspace/infrastructure/ai/shared/retry
 *
 * OpenAI-specific retry policy.
 * Handles 429 (rate limit) with Retry-After header, 500/502/503/504 with
 * exponential backoff, and network timeouts.
 */
export interface OpenAIRetryConfig {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

export const DefaultOpenAIRetry: OpenAIRetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

const RETRIABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export function shouldRetryOpenAI(
  attempt: number,
  statusCode: number,
  config: OpenAIRetryConfig = DefaultOpenAIRetry
): boolean {
  if (attempt >= config.maxAttempts) return false;
  return RETRIABLE_STATUS_CODES.has(statusCode);
}

export function getOpenAIRetryDelay(
  attempt: number,
  retryAfterHeader?: string,
  config: OpenAIRetryConfig = DefaultOpenAIRetry
): number {
  // If server provided Retry-After header, respect it
  if (retryAfterHeader) {
    const retryAfter = parseInt(retryAfterHeader, 10);
    if (!isNaN(retryAfter)) {
      return Math.min(retryAfter * 1000, config.maxDelayMs);
    }
  }

  // Exponential backoff with jitter
  const exp = config.baseDelayMs * Math.pow(2, attempt - 1);
  const capped = Math.min(config.maxDelayMs, exp);
  const jitter = 0.8 + Math.random() * 0.4;
  return Math.round(capped * jitter);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
