/**
 * @workspace/infrastructure/observability
 *
 * OpenTelemetry adapter for the discovery pipeline.
 *
 * No domain code imports OpenTelemetry. This package bridges:
 *   - DiscoveryTraceId → OTel trace context
 *   - PipelineStage → OTel spans
 *   - StageMetrics → OTel metrics
 *   - ArtifactMetadata → structured logs
 *
 * Exporters:
 *   - Console (development)
 *   - OTLP HTTP (production — Jaeger/Tempo/Prometheus)
 */

export * from "./context-propagator";
export * from "./tracer";
export * from "./metrics";
export * from "./logger";
export * from "./span-mapper";
export * from "./metric-mapper";
export * from "./telemetry-factory";
