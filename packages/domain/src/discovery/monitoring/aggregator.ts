/**
 * @workspace/domain/discovery/monitoring/aggregator
 *
 * BusinessMetricsAggregator — produces business-level metrics from
 * stage metrics. This is the ONLY component that knows what the
 * business cares about; stage modules just publish raw numbers.
 */
import type {
  BusinessMetric,
  BusinessMetricsSnapshot,
  BusinessMetricsAggregator,
  StageMetrics
} from "./types";

export class DefaultBusinessMetricsAggregator implements BusinessMetricsAggregator {
  aggregate(stageMetrics: ReadonlyArray<StageMetrics>): BusinessMetricsSnapshot {
    const metrics: BusinessMetric[] = [];
    let totalItems = 0;
    let totalErrors = 0;
    let totalDuration = 0;

    // Per-stage throughput
    for (const sm of stageMetrics) {
      totalItems += sm.itemsProcessed;
      totalErrors += sm.itemsFailed;
      totalDuration += sm.durationMs;

      metrics.push({
        name: `${sm.stage}.throughput`,
        value: sm.throughput,
        unit: "items/s",
        trend: "stable",
        period: "realtime",
        capturedAt: sm.capturedAt
      });

      metrics.push({
        name: `${sm.stage}.error_rate`,
        value: sm.errorRate,
        unit: "ratio",
        trend: sm.errorRate > 0.1 ? "up" : "stable",
        period: "realtime",
        capturedAt: sm.capturedAt
      });
    }

    // Aggregate business metrics
    const overallErrorRate = totalItems > 0 ? totalErrors / totalItems : 0;
    const overallThroughput = totalDuration > 0 ? (totalItems / totalDuration) * 1000 : 0;

    metrics.push({
      name: "pipeline.total_items",
      value: totalItems,
      unit: "count",
      trend: "up",
      period: "realtime",
      capturedAt: new Date()
    });

    metrics.push({
      name: "pipeline.total_errors",
      value: totalErrors,
      unit: "count",
      trend: totalErrors > 0 ? "up" : "stable",
      period: "realtime",
      capturedAt: new Date()
    });

    metrics.push({
      name: "pipeline.overall_error_rate",
      value: overallErrorRate,
      unit: "ratio",
      trend: overallErrorRate > 0.1 ? "up" : "stable",
      period: "realtime",
      capturedAt: new Date(),
      details: overallErrorRate > 0.1 ? "Error rate exceeds 10% threshold" : undefined
    });

    metrics.push({
      name: "pipeline.overall_throughput",
      value: overallThroughput,
      unit: "items/s",
      trend: "stable",
      period: "realtime",
      capturedAt: new Date()
    });

    // Determine pipeline health
    let pipelineHealth: "healthy" | "degraded" | "critical";
    if (overallErrorRate > 0.25) {
      pipelineHealth = "critical";
    } else if (overallErrorRate > 0.1) {
      pipelineHealth = "degraded";
    } else {
      pipelineHealth = "healthy";
    }

    return {
      id: `bms_${Date.now()}`,
      metrics,
      pipelineHealth,
      capturedAt: new Date(),
      schemaVersion: "1.0.0"
    };
  }
}

export function createBusinessMetricsAggregator(): BusinessMetricsAggregator {
  return new DefaultBusinessMetricsAggregator();
}
