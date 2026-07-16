/**
 * @workspace/infrastructure/connectors/core/rate-limiter
 *
 * Connector-level rate limiter (separate from the Worker's TokenBucketRateLimiter).
 * This one is per-provider HTTP rate limiting, not per-job.
 */
import type { ConnectorRateLimiter } from "./types";

export class TokenBucketConnectorRateLimiter implements ConnectorRateLimiter {
  readonly name = "token-bucket";
  private tokens: number;
  private lastRefill: number;
  private readonly refillRatePerSecond: number;

  constructor(maxRequestsPerMinute: number) {
    this.tokens = maxRequestsPerMinute;
    this.lastRefill = Date.now();
    this.refillRatePerSecond = maxRequestsPerMinute / 60;
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const deficit = 1 - this.tokens;
      const waitMs = Math.ceil((deficit / this.refillRatePerSecond) * 1000);
      await new Promise((r) => setTimeout(r, waitMs));
      this.refill();
    }
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.tokens + elapsed * this.refillRatePerSecond, this.tokens + this.refillRatePerSecond * elapsed);
    this.lastRefill = now;
  }
}

export class NoopRateLimiter implements ConnectorRateLimiter {
  readonly name = "noop";
  async acquire(): Promise<void> {}
}

export function createTokenBucketRateLimiter(maxPerMinute: number): ConnectorRateLimiter {
  return new TokenBucketConnectorRateLimiter(maxPerMinute);
}

export function createNoopRateLimiter(): ConnectorRateLimiter {
  return new NoopRateLimiter();
}
