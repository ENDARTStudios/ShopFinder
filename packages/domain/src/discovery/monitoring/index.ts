/**
 * @workspace/domain/discovery/monitoring
 *
 * A2.15 — Monitoring / Business Metrics.
 *
 * Each slice publishes StageMetrics. The aggregator produces BusinessMetrics.
 * This avoids each module knowing about Prometheus, Grafana, or any backend.
 *
 * Layout:
 *   types.ts       — StageMetrics, BusinessMetric, BusinessMetricsSnapshot
 *   collector.ts   — In-memory StageMetricsCollector
 *   aggregator.ts  — DefaultBusinessMetricsAggregator (stage → business)
 *   events.ts      — 2 events (StageMetricsRecorded, BusinessMetricsSnapshot)
 */

export * from "./types";
export * from "./collector";
export * from "./aggregator";
export * from "./events";
