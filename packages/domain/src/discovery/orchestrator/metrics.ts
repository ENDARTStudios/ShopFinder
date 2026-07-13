/**
 * @workspace/domain/discovery/orchestrator/metrics
 *
 * In-memory OrchestratorMetricsCollector. Suitable for tests and
 * single-process deployments. Production should swap in a Prometheus /
 * OpenTelemetry implementation behind the same interface.
 */
import type { OrchestratorMetricsSnapshot } from "./types";
import type { OrchestratorMetricsCollector, OrchestratorEventPublisher } from "./interfaces";

class InMemoryMetricsCollector implements OrchestratorMetricsCollector {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private timers: Array<{ name: string; start: number }> = [];
  private finishedTimers: Array<{ name: string; durationMs: number }> = [];

  startTimer(name: string): () => number {
    const start = Date.now();
    const entry = { name, start };
    this.timers.push(entry);
    return () => {
      const durationMs = Date.now() - start;
      this.timers = this.timers.filter((t) => t !== entry);
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

  snapshot(): OrchestratorMetricsSnapshot {
    const last = (name: string): number =>
      [...this.finishedTimers].reverse().find((t) => t.name === name)?.durationMs ?? 0;
    return {
      validationDurationMs: last("validation"),
      reservationDurationMs: last("reservation"),
      jobFactoryDurationMs: last("jobFactory"),
      totalDurationMs: last("total") || this.finishedTimers.reduce((s, t) => s + t.durationMs, 0),
      jobsCreated: this.counters.get("jobsCreated") ?? 0,
      apiCallsReserved: this.gauges.get("apiCallsReserved") ?? 0,
      sourcesScheduled: this.counters.get("sourcesScheduled") ?? 0,
      regionsScheduled: this.counters.get("regionsScheduled") ?? 0
    };
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.timers = [];
    this.finishedTimers = [];
  }
}

let _instance: InMemoryMetricsCollector | null = null;

export function getMetricsCollector(): OrchestratorMetricsCollector {
  if (!_instance) _instance = new InMemoryMetricsCollector();
  return _instance;
}

export function resetMetricsCollector(): OrchestratorMetricsCollector {
  _instance = new InMemoryMetricsCollector();
  return _instance;
}

export function createMetricsCollector(): OrchestratorMetricsCollector {
  return new InMemoryMetricsCollector();
}

// ── Noop Event Publisher (for tests / dry runs) ────────────

class NoopEventPublisher implements OrchestratorEventPublisher {
  async publish(_events: ReadonlyArray<unknown>): Promise<void> {
    /* no-op */
  }
}

export function createNoopEventPublisher(): OrchestratorEventPublisher {
  return new NoopEventPublisher();
}
