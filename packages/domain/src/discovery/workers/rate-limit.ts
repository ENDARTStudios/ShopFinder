/**
 * @workspace/domain/discovery/workers/rate-limit
 *
 * Per-provider token bucket rate limiter.
 *
 *   - Each provider has its own bucket of size `rateLimitPerMinute`.
 *   - Tokens refill continuously (sliding window approximation).
 *   - When a slot is acquired, a token is consumed.
 *   - When the call completes (release), the token is NOT returned —
 *     the bucket refills over time.
 *
 * This is intentionally simple — production should swap in a Redis-
 * backed limiter behind the same interface for cross-process safety.
 */
import type { RateLimiter, CancellationSignal, ProviderCallId, WorkerConfig } from "./types";

interface Bucket {
  capacity: number;
  tokens: number;
  lastRefill: number;
  /** Queue of pending acquires. */
  waiters: Array<{ resolve: (id: ProviderCallId) => void; reject: (e: Error) => void }>;
}

export class TokenBucketRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly refillRatePerSecond: number;

  constructor(private readonly config: Pick<WorkerConfig, "rateLimitPerMinute">) {
    this.refillRatePerSecond = config.rateLimitPerMinute / 60;
  }

  async acquire(providerCode: string, signal: CancellationSignal): Promise<ProviderCallId> {
    const bucket = this.getOrCreateBucket(providerCode);
    this.refill(bucket);

    // Fast path: token available
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return this.makeCallId(providerCode);
    }

    // Slow path: queue and wait
    return new Promise<ProviderCallId>((resolve, reject) => {
      const entry = { resolve, reject };
      bucket.waiters.push(entry);

      // Cooperative cancellation
      signal.onCancel(() => {
        const idx = bucket.waiters.indexOf(entry);
        if (idx >= 0) {
          bucket.waiters.splice(idx, 1);
          reject(new Error(`Rate limiter acquire cancelled: ${signal.reason ?? "no reason"}`));
        }
      });
    });
  }

  release(callId: ProviderCallId): void {
    // Token-bucket: nothing to release. Tokens refill over time.
    void callId;
  }

  estimateWait(providerCode: string): number {
    const bucket = this.getOrCreateBucket(providerCode);
    this.refill(bucket);
    if (bucket.tokens >= 1) return 0;
    const deficit = 1 - bucket.tokens;
    return Math.ceil((deficit / this.refillRatePerSecond) * 1000);
  }

  private getOrCreateBucket(providerCode: string): Bucket {
    let b = this.buckets.get(providerCode);
    if (!b) {
      b = {
        capacity: this.config.rateLimitPerMinute,
        tokens: this.config.rateLimitPerMinute,
        lastRefill: Date.now(),
        waiters: []
      };
      this.buckets.set(providerCode, b);
    }
    return b;
  }

  private refill(bucket: Bucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    const refilled = elapsed * this.refillRatePerSecond;
    const newTokens = Math.min(bucket.capacity, bucket.tokens + refilled);

    if (newTokens >= 1 && bucket.waiters.length > 0) {
      // Wake the first waiter
      const waiter = bucket.waiters.shift();
      if (waiter) {
        bucket.tokens = newTokens - 1;
        bucket.lastRefill = now;
        waiter.resolve(this.makeCallId("woken"));
        return;
      }
    }

    bucket.tokens = newTokens;
    bucket.lastRefill = now;
  }

  private makeCallId(prefix: string): ProviderCallId {
    const raw = `pc_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    return raw as unknown as ProviderCallId;
  }
}

export function createTokenBucketRateLimiter(config: WorkerConfig): RateLimiter {
  return new TokenBucketRateLimiter(config);
}
