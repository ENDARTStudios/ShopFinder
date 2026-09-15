/**
 * @workspace/infrastructure/observability/span-mapper
 *
 * Maps domain pipeline stages to OpenTelemetry spans.
 * Each coordinator's execution becomes a span with stage-specific attributes.
 */
import type { Span } from "@opentelemetry/api";
import type { PipelineStage } from "@workspace/domain/discovery/monitoring/types";
import type { DiscoveryTraceId } from "@workspace/domain/shared";
import type { ArtifactMetadata } from "@workspace/domain/discovery/traceability";
import { ObservabilityTracer, type SpanOptions } from "./tracer";

export interface SpanContext {
  readonly span: Span;
  readonly end: () => void;
}

export class SpanMapper {
  constructor(private readonly tracer: ObservabilityTracer) {}

  /**
   * Create a span for a pipeline stage.
   */
  createStageSpan(
    stage: PipelineStage,
    traceId?: DiscoveryTraceId,
    metadata?: ArtifactMetadata,
    extraAttributes?: Record<string, string | number | boolean>
  ): SpanContext {
    const options: SpanOptions = {
      stage,
      traceId,
      metadata,
      attributes: extraAttributes,
    };

    const span = this.tracer.startSpan(options);

    return {
      span,
      end: () => span.end(),
    };
  }

  /**
   * Map stage-specific metrics to span attributes.
   */
  static setStageMetricsOnSpan(
    span: Span,
    metrics: {
      itemsProcessed: number;
      itemsSucceeded: number;
      itemsFailed: number;
      durationMs: number;
    }
  ): void {
    span.setAttributes({
      "stage.items_processed": metrics.itemsProcessed,
      "stage.items_succeeded": metrics.itemsSucceeded,
      "stage.items_failed": metrics.itemsFailed,
      "stage.duration_ms": metrics.durationMs,
    });
  }

  /**
   * Map an error to span status + exception.
   */
  static setErrorOnSpan(span: Span, error: unknown): void {
    span.setStatus({
      code: 2, // ERROR
      message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error) {
      span.recordException(error);
    }
  }
}

export function createSpanMapper(tracer: ObservabilityTracer): SpanMapper {
  return new SpanMapper(tracer);
}
