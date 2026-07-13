/**
 * @workspace/domain/discovery/workers/metrics
 *
 * In-memory WorkerMetricsCollector + NoopEventPublisher.
 */
import type { WorkerMetricsCollector, WorkerMetricsSnapshot, WorkerEventPublisher } from "./types";

class InMemoryWorkerMetricsCollector implements WorkerMetricsCollector {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private finishedTimers: Array<{ name: string; durationMs: number }> = [];

  startTimer(name: string): () => number {
    const start = Date.now();
    return () => {
      const durationMs = Date.now() - start;
      this.finishedTimers.push({ name, durationMs });
      return durationMs;
    };
  }

  increment(name: string, by = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + by);
  }

  setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  snapshot(): WorkerMetricsSnapshot {
    const last = (name: string): number =>
      [...this.finishedTimers].reverse().find((t) => t.name === name)?.durationMs ?? 0;
    return {
      discoveryDurationMs: last("discovery"),
      checkpointDurationMs: last("checkpoint"),
      rateLimitWaitMs: last("rateLimit"),
      retryDelayMs: last("retry"),
      totalDurationMs: last("total") || this.finishedTimers.reduce((s, t) => s + t.durationMs, 0),
      itemsProcessed: this.counters.get("itemsProcessed") ?? 0,
      apiCallsUsed: this.gauges.get("apiCallsUsed") ?? 0,
      retries: this.counters.get("retries") ?? 0,
      checkpointsSaved: this.counters.get("checkpointsSaved") ?? 0
    };
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.finishedTimers = [];
  }
}

class NoopWorkerEventPublisher implements WorkerEventPublisher {
  async publish(_events: ReadonlyArray<unknown>): Promise<void> {
    /* no-op */
  }
}

export function createWorkerMetricsCollector(): WorkerMetricsCollector {
  return new InMemoryWorkerMetricsCollector();
}

export function createNoopWorkerEventPublisher(): WorkerEventPublisher {
  return new NoopWorkerEventPublisher();
}
