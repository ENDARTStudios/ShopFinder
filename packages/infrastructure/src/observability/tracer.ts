/**
 * @workspace/infrastructure/observability/tracer
 *
 * OpenTelemetry Tracer wrapper. Creates spans from pipeline stages.
 * No domain code imports OpenTelemetry — this is the adapter.
 */
import { trace, Tracer, Span, SpanKind, Attributes } from "@opentelemetry/api";
import type { DiscoveryTraceId } from "@workspace/domain/shared";
import type { ArtifactMetadata } from "@workspace/domain/discovery/traceability";
import type { PipelineStage } from "@workspace/domain/discovery/monitoring/types";
import { createContextFromTraceId } from "./context-propagator";

export interface SpanOptions {
  readonly stage: PipelineStage;
  readonly traceId?: DiscoveryTraceId;
  readonly metadata?: ArtifactMetadata;
  readonly kind?: SpanKind;
  readonly attributes?: Record<string, string | number | boolean>;
}

export class ObservabilityTracer {
  private readonly tracer: Tracer;

  constructor(tracerName: string = "ai-commerce-discovery") {
    this.tracer = trace.getTracer(tracerName);
  }

  /**
   * Start a span for a pipeline stage.
   * If traceId is provided, the span is correlated with that trace.
   */
  startSpan(options: SpanOptions): Span {
    const attributes: Attributes = {
      "discovery.stage": options.stage,
      ...(options.metadata?.producer && { "discovery.producer": options.metadata.producer }),
      ...(options.metadata?.artifactVersion && { "discovery.artifactVersion": options.metadata.artifactVersion }),
      ...(options.metadata?.schemaVersion && { "discovery.schemaVersion": options.metadata.schemaVersion }),
      ...(options.traceId && { "discovery.traceId": options.traceId as string }),
      ...options.attributes,
    };

    const span = this.tracer.startSpan(options.stage, {
      kind: options.kind ?? SpanKind.INTERNAL,
      attributes,
    });

    return span;
  }

  /**
   * Execute a function within a span.
   * Automatically records duration, success/failure, and exceptions.
   */
  async withSpan<T>(
    options: SpanOptions,
    fn: (span: Span) => Promise<T>
  ): Promise<T> {
    const span = this.startSpan(options);
    try {
      const result = await fn(span);
      span.setStatus({ code: 0 }); // OK
      return result;
    } catch (error) {
      span.setStatus({
        code: 2, // ERROR
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get the underlying OTel tracer (for advanced use).
   */
  getTracer(): Tracer {
    return this.tracer;
  }
}

export function createTracer(tracerName?: string): ObservabilityTracer {
  return new ObservabilityTracer(tracerName);
}
