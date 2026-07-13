/**
 * @workspace/domain/discovery/monitoring/types
 *
 * A2.15 — Monitoring / Business Metrics.
 *
 * Each slice publishes StageMetrics. An aggregator produces BusinessMetrics.
 * This avoids each module knowing about Prometheus, Grafana, or any
 * observability backend.
 */
import type { BrandedId } from "../../shared";

export type StageMetricsId = BrandedId<"StageMetricsId">;

export type PipelineStage =
  | "planner"
  | "orchestrator"
  | "worker"
  | "raw_store"
  | "normalizer"
  | "similarity"
  | "resolution"
  | "evaluation"
  | "compliance"
  | "catalog"
  | "search"
  | "marketplace_publication"
  | "pricing"
  | "ranking";

export interface StageMetrics {
  readonly id: StageMetricsId;
  readonly stage: PipelineStage;
  readonly batchId: string;
  readonly itemsProcessed: number;
  readonly itemsSucceeded: number;
  readonly itemsFailed: number;
  readonly durationMs: number;
  readonly throughput: number; // items per second
  readonly errorRate: number; // 0-1
  readonly customMetrics: Readonly<Record<string, number>>;
  readonly capturedAt: Date;
  readonly schemaVersion: "1.0.0";
}

export interface BusinessMetric {
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly trend: "up" | "down" | "stable";
  readonly period: "realtime" | "hourly" | "daily" | "weekly";
  readonly capturedAt: Date;
  readonly details?: string;
}

export interface BusinessMetricsSnapshot {
  readonly id: string;
  readonly metrics: ReadonlyArray<BusinessMetric>;
  readonly pipelineHealth: "healthy" | "degraded" | "critical";
  readonly capturedAt: Date;
  readonly schemaVersion: "1.0.0";
}

export interface StageMetricsCollector {
  record(
    stage: PipelineStage,
    metrics: Omit<StageMetrics, "id" | "capturedAt" | "schemaVersion">
  ): StageMetrics;
  getAll(): ReadonlyArray<StageMetrics>;
  getByStage(stage: PipelineStage): ReadonlyArray<StageMetrics>;
  clear(): void;
}

export interface BusinessMetricsAggregator {
  aggregate(stageMetrics: ReadonlyArray<StageMetrics>): BusinessMetricsSnapshot;
}
