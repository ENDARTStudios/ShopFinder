/**
 * @workspace/infrastructure/observability/metrics
 *
 * OpenTelemetry Meter wrapper. Records metrics from StageMetrics.
 * No domain code imports OpenTelemetry — this is the adapter.
 */
import { metrics, Meter, Counter, ObservableGauge, Histogram } from "@opentelemetry/api";

export class ObservabilityMeter {
  private readonly meter: Meter;
  private readonly counters: Map<string, Counter> = new Map();
  private readonly histograms: Map<string, Histogram> = new Map();

  constructor(meterName: string = "ai-commerce-discovery") {
    this.meter = metrics.getMeter(meterName);
  }

  /**
   * Get or create a counter.
   */
  counter(name: string, description?: string): Counter {
    if (!this.counters.has(name)) {
      this.counters.set(name, this.meter.createCounter(name, { description }));
    }
    return this.counters.get(name)!;
  }

  /**
   * Get or create a histogram.
   */
  histogram(name: string, description?: string, unit?: string): Histogram {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, this.meter.createHistogram(name, { description, unit }));
    }
    return this.histograms.get(name)!;
  }

  /**
   * Record a stage metric (items processed, succeeded, failed).
   */
  recordStageMetrics(stage: string, metrics: {
    itemsProcessed: number;
    itemsSucceeded: number;
    itemsFailed: number;
    durationMs: number;
    throughput: number;
    errorRate: number;
  }): void {
    this.counter("discovery.items_processed", "Total items processed").add(metrics.itemsProcessed, { stage });
    this.counter("discovery.items_succeeded", "Total items succeeded").add(metrics.itemsSucceeded, { stage });
    this.counter("discovery.items_failed", "Total items failed").add(metrics.itemsFailed, { stage });
    this.histogram("discovery.stage_duration_ms", "Stage duration in ms").record(metrics.durationMs, { stage });
    this.histogram("discovery.throughput", "Items per second").record(metrics.throughput, { stage });
    this.histogram("discovery.error_rate", "Error rate (0-1)").record(metrics.errorRate, { stage });
  }

  /**
   * Record custom metrics from StageMetrics.customMetrics.
   */
  recordCustomMetrics(stage: string, customMetrics: Record<string, number>): void {
    for (const [name, value] of Object.entries(customMetrics)) {
      this.counter(`discovery.${name}`, `Custom metric: ${name}`).add(value, { stage });
    }
  }

  /**
   * Record AI-specific metrics.
   */
  recordAIMetrics(metrics: {
    requests: number;
    tokens: number;
    costCents: number;
    latencyMs: number;
  }): void {
    this.counter("ai.requests", "Total AI inference requests").add(metrics.requests);
    this.counter("ai.tokens", "Total AI tokens used").add(metrics.tokens);
    this.counter("ai.cost_cents", "Total AI cost in cents").add(metrics.costCents);
    this.histogram("ai.latency_ms", "AI inference latency in ms").record(metrics.latencyMs);
  }

  getMeter(): Meter {
    return this.meter;
  }
}

export function createMeter(meterName?: string): ObservabilityMeter {
  return new ObservabilityMeter(meterName);
}
