/**
 * @workspace/infrastructure/queues/bullmq/events
 *
 * BullMQ event → StageMetrics adapter.
 * Converts BullMQ worker events into the domain's StageMetrics format
 * without altering the monitoring model.
 */
import type { Job } from "bullmq";
import type { StageMetrics, PipelineStage } from "@workspace/domain/discovery/monitoring/types";
import type { StageMetricsCollector } from "@workspace/domain/discovery/monitoring/types";

export interface BullMQEventMetrics {
  readonly jobsCompleted: number;
  readonly jobsFailed: number;
  readonly totalDurationMs: number;
  readonly totalRetries: number;
  readonly productsDiscovered: number;
}

/**
 * Adapter that converts BullMQ worker events into StageMetrics.
 * Listens to: completed, failed, retry events.
 */
export class BullMQMetricsAdapter {
  private metrics: BullMQEventMetrics = {
    jobsCompleted: 0,
    jobsFailed: 0,
    totalDurationMs: 0,
    totalRetries: 0,
    productsDiscovered: 0,
  };

  constructor(
    private readonly collector: StageMetricsCollector,
    private readonly stage: PipelineStage = "worker",
    private readonly batchId: string = "bullmq-batch"
  ) {}

  /**
   * Call this when a BullMQ job completes.
   */
  onCompleted(job: Job, result: any): void {
    this.metrics = {
      ...this.metrics,
      jobsCompleted: this.metrics.jobsCompleted + 1,
      totalDurationMs: this.metrics.totalDurationMs + (result?.durationMs ?? 0),
      productsDiscovered: this.metrics.productsDiscovered + (result?.productsDiscovered ?? 0),
    };

    this.collector.record(this.stage, {
      stage: this.stage,
      batchId: this.batchId,
      itemsProcessed: this.metrics.jobsCompleted + this.metrics.jobsFailed,
      itemsSucceeded: this.metrics.jobsCompleted,
      itemsFailed: this.metrics.jobsFailed,
      durationMs: this.metrics.totalDurationMs,
      throughput: this.metrics.totalDurationMs > 0
        ? (this.metrics.jobsCompleted / this.metrics.totalDurationMs) * 1000
        : 0,
      errorRate: this.metrics.jobsCompleted + this.metrics.jobsFailed > 0
        ? this.metrics.jobsFailed / (this.metrics.jobsCompleted + this.metrics.jobsFailed)
        : 0,
      customMetrics: {
        productsDiscovered: this.metrics.productsDiscovered,
        totalRetries: this.metrics.totalRetries,
      },
      traceId: job.data?.traceId,
    });
  }

  /**
   * Call this when a BullMQ job fails.
   */
  onFailed(job: Job, error: Error): void {
    this.metrics = {
      ...this.metrics,
      jobsFailed: this.metrics.jobsFailed + 1,
    };
  }

  /**
   * Call this when a BullMQ job is retried.
   */
  onRetry(job: Job): void {
    this.metrics = {
      ...this.metrics,
      totalRetries: this.metrics.totalRetries + 1,
    };
  }

  /**
   * Get current metrics snapshot.
   */
  getMetrics(): BullMQEventMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics.
   */
  reset(): void {
    this.metrics = {
      jobsCompleted: 0,
      jobsFailed: 0,
      totalDurationMs: 0,
      totalRetries: 0,
      productsDiscovered: 0,
    };
  }
}
