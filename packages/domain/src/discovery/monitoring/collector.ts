/**
 * @workspace/domain/discovery/monitoring/collector
 *
 * In-memory StageMetricsCollector.
 * Each slice calls record() to publish its metrics.
 */
import type { StageMetrics, StageMetricsCollector, PipelineStage, StageMetricsId } from "./types";

class InMemoryStageMetricsCollector implements StageMetricsCollector {
  private readonly metrics: StageMetrics[] = [];

  record(
    stage: PipelineStage,
    metrics: Omit<StageMetrics, "id" | "capturedAt" | "schemaVersion">
  ): StageMetrics {
    const record: StageMetrics = {
      id: `sm_${stage}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` as unknown as StageMetricsId,
      ...metrics,
      capturedAt: new Date(),
      schemaVersion: "1.0.0"
    };
    this.metrics.push(record);
    return record;
  }

  getAll(): ReadonlyArray<StageMetrics> {
    return [...this.metrics];
  }

  getByStage(stage: PipelineStage): ReadonlyArray<StageMetrics> {
    return this.metrics.filter((m) => m.stage === stage);
  }

  clear(): void {
    this.metrics.length = 0;
  }
}

export function createStageMetricsCollector(): StageMetricsCollector {
  return new InMemoryStageMetricsCollector();
}
