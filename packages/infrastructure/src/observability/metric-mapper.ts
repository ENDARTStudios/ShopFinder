/**
 * @workspace/infrastructure/observability/metric-mapper
 *
 * Maps domain StageMetrics + BusinessMetricsSnapshot to OpenTelemetry metrics.
 */
import type { StageMetrics, BusinessMetricsSnapshot } from "@workspace/domain/discovery/monitoring/types";
import { ObservabilityMeter } from "./metrics";

export class MetricMapper {
  constructor(private readonly meter: ObservabilityMeter) {}

  /**
   * Record StageMetrics as OTel metrics.
   */
  recordStage(stage: string, metrics: StageMetrics): void {
    this.meter.recordStageMetrics(stage, {
      itemsProcessed: metrics.itemsProcessed,
      itemsSucceeded: metrics.itemsSucceeded,
      itemsFailed: metrics.itemsFailed,
      durationMs: metrics.durationMs,
      throughput: metrics.throughput,
      errorRate: metrics.errorRate,
    });

    // Record custom metrics
    if (metrics.customMetrics) {
      this.meter.recordCustomMetrics(stage, metrics.customMetrics);
    }
  }

  /**
   * Record BusinessMetricsSnapshot as aggregate OTel metrics.
   */
  recordBusiness(snapshot: BusinessMetricsSnapshot): void {
    for (const metric of snapshot.metrics) {
      this.meter.counter(`business.${metric.name}`, metric.details).add(metric.value, { unit: metric.unit });
    }

    // Record pipeline health as a gauge (via counter with 0 or 1)
    const healthValue = snapshot.pipelineHealth === "healthy" ? 0 : snapshot.pipelineHealth === "degraded" ? 1 : 2;
    this.meter.counter("pipeline.health_status", "Pipeline health (0=healthy, 1=degraded, 2=critical)").add(healthValue);
  }
}

export function createMetricMapper(meter: ObservabilityMeter): MetricMapper {
  return new MetricMapper(meter);
}
