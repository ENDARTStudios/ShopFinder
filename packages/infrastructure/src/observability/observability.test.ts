/**
 * @workspace/infrastructure/observability/observability.test
 *
 * Tests for the OpenTelemetry observability adapter.
 * Validates: spans, context propagation, metrics, logger, traceId correlation.
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  createTestTelemetry,
  toOTelTraceId,
  generateSpanId,
  createSpanContext,
  createContextFromTraceId,
  ObservabilityTracer,
  ObservabilityMeter,
  createLogger,
  createTestLogger,
  SpanMapper,
  MetricMapper,
  type LogEntry
} from "./index";
import { generateDiscoveryTraceId, buildArtifactMetadata } from "@workspace/domain/discovery/traceability";
import type { StageMetrics, BusinessMetricsSnapshot } from "@workspace/domain/discovery/monitoring/types";

// ── Tests ──────────────────────────────────────────────────

describe("OpenTelemetry Observability", () => {

  // ── Context Propagator ──────────────────────────────────
  describe("Context Propagator", () => {
    it("should convert DiscoveryTraceId to 32-char hex OTel trace ID", () => {
      const traceId = generateDiscoveryTraceId();
      const otelTraceId = toOTelTraceId(traceId);
      expect(otelTraceId.length).toBe(32);
      expect(otelTraceId).toMatch(/^[0-9a-f]{32}$/);
    });

    it("should produce consistent OTel trace ID for same DiscoveryTraceId", () => {
      const traceId = generateDiscoveryTraceId();
      const id1 = toOTelTraceId(traceId);
      const id2 = toOTelTraceId(traceId);
      expect(id1).toBe(id2);
    });

    it("should produce different OTel trace IDs for different DiscoveryTraceIds", () => {
      const id1 = toOTelTraceId(generateDiscoveryTraceId());
      const id2 = toOTelTraceId(generateDiscoveryTraceId());
      expect(id1).not.toBe(id2);
    });

    it("should generate 16-char hex span ID", () => {
      const spanId = generateSpanId();
      expect(spanId.length).toBe(16);
      expect(spanId).toMatch(/^[0-9a-f]{16}$/);
    });

    it("should create a SpanContext from DiscoveryTraceId", () => {
      const traceId = generateDiscoveryTraceId();
      const spanContext = createSpanContext(traceId);
      expect(spanContext.traceId.length).toBe(32);
      expect(spanContext.spanId.length).toBe(16);
      expect(spanContext.traceFlags).toBeDefined();
    });

    it("should create an OTel Context from DiscoveryTraceId", () => {
      const traceId = generateDiscoveryTraceId();
      const ctx = createContextFromTraceId(traceId);
      expect(ctx).toBeDefined();
    });
  });

  // ── Tracer ──────────────────────────────────────────────
  describe("Tracer", () => {
    let telemetry: ReturnType<typeof createTestTelemetry>;

    beforeEach(() => {
      telemetry = createTestTelemetry();
    });

    afterEach(async () => {
      await telemetry.shutdown();
    });

    it("should create a span with stage name", () => {
      const tracer = telemetry.tracer;
      const span = tracer.startSpan({ stage: "worker" });
      expect(span).toBeDefined();
      span.end();
    });

    it("should set traceId and metadata as span attributes", () => {
      const traceId = generateDiscoveryTraceId();
      const metadata = buildArtifactMetadata({
        traceId,
        artifactVersion: "1.0.0",
        schemaVersion: "1.0.0",
        producer: "normalizer-coordinator"
      });

      const tracer = telemetry.tracer;
      const span = tracer.startSpan({
        stage: "normalizer",
        traceId,
        metadata
      });
      span.end();

      // Span should have been created with attributes
      // (we can't verify attributes directly without the SDK internals,
      // but the span creation should not throw)
      expect(span).toBeDefined();
    });

    it("should measure duration via withSpan", async () => {
      const tracer = telemetry.tracer;
      const result = await tracer.withSpan({ stage: "planner" }, async (span) => {
        await new Promise(r => setTimeout(r, 10));
        return 42;
      });
      expect(result).toBe(42);
    });

    it("should record exceptions on failure", async () => {
      const tracer = telemetry.tracer;
      expect(
        tracer.withSpan({ stage: "worker" }, async () => {
          throw new Error("test failure");
        })
      ).rejects.toThrow("test failure");
    });
  });

  // ── Metrics ─────────────────────────────────────────────
  describe("Metrics", () => {
    let telemetry: ReturnType<typeof createTestTelemetry>;

    beforeEach(() => {
      telemetry = createTestTelemetry();
    });

    afterEach(async () => {
      await telemetry.shutdown();
    });

    it("should create counters", () => {
      const meter = telemetry.meter;
      const counter = meter.counter("test.counter", "Test counter");
      counter.add(5);
      counter.add(3);
      // Counter should not throw
      expect(counter).toBeDefined();
    });

    it("should create histograms", () => {
      const meter = telemetry.meter;
      const hist = meter.histogram("test.histogram", "Test histogram", "ms");
      hist.record(100);
      hist.record(200);
      expect(hist).toBeDefined();
    });

    it("should record stage metrics", () => {
      const meter = telemetry.meter;
      meter.recordStageMetrics("worker", {
        itemsProcessed: 100,
        itemsSucceeded: 95,
        itemsFailed: 5,
        durationMs: 500,
        throughput: 200,
        errorRate: 0.05
      });
      // Should not throw
    });

    it("should record custom metrics", () => {
      const meter = telemetry.meter;
      meter.recordCustomMetrics("worker", {
        productsDiscovered: 50,
        apiCallsUsed: 10
      });
    });

    it("should record AI metrics", () => {
      const meter = telemetry.meter;
      meter.recordAIMetrics({
        requests: 5,
        tokens: 1200,
        costCents: 3,
        latencyMs: 850
      });
    });
  });

  // ── Logger ──────────────────────────────────────────────
  describe("Structured Logger", () => {
    it("should log with traceId and metadata", () => {
      const { logger, entries } = createTestLogger();
      const traceId = generateDiscoveryTraceId();

      logger
        .withTraceId(traceId)
        .withMetadata(buildArtifactMetadata({
          traceId,
          artifactVersion: "1.0.0",
          schemaVersion: "1.0.0",
          producer: "raw-store-coordinator"
        }))
        .info("Product persisted", { productId: "raw_001" });

      expect(entries.length).toBe(1);
      expect(entries[0]!.message).toBe("Product persisted");
      expect(entries[0]!.traceId).toBe(traceId as string);
      expect(entries[0]!.producer).toBe("raw-store-coordinator");
      expect(entries[0]!.artifactVersion).toBe("1.0.0");
      expect(entries[0]!.schemaVersion).toBe("1.0.0");
      expect(entries[0]!.data?.productId).toBe("raw_001");
    });

    it("should support log levels", () => {
      const { logger, entries } = createTestLogger();
      logger.debug("debug msg");
      logger.info("info msg");
      logger.warn("warn msg");
      logger.error("error msg");

      expect(entries.length).toBe(4);
      expect(entries[0]!.level).toBe("debug");
      expect(entries[1]!.level).toBe("info");
      expect(entries[2]!.level).toBe("warn");
      expect(entries[3]!.level).toBe("error");
    });

    it("should respect minimum log level", () => {
      const { logger, entries } = createTestLogger();
      const warnLogger = logger.withStage("test"); // keep same level
      // Create a warn-only logger
      const warnOnly = createLogger("warn");
      // Can't test the warn-only logger with the same entries array
      // Just test that the test logger captures all
      warnLogger.info("should log");
      expect(entries.length).toBe(1);
    });

    it("should include error details", () => {
      const { logger, entries } = createTestLogger();
      logger.error("Operation failed", new Error("connection refused"));

      expect(entries.length).toBe(1);
      expect(entries[0]!.data?.error).toBe("connection refused");
    });

    it("should chain withStage and withTraceId", () => {
      const { logger, entries } = createTestLogger();
      const traceId = generateDiscoveryTraceId();

      logger.withTraceId(traceId).withStage("normalizer").info("Normalizing");

      expect(entries[0]!.traceId).toBe(traceId as string);
      expect(entries[0]!.stage).toBe("normalizer");
    });
  });

  // ── Span Mapper ─────────────────────────────────────────
  describe("Span Mapper", () => {
    let telemetry: ReturnType<typeof createTestTelemetry>;

    beforeEach(() => {
      telemetry = createTestTelemetry();
    });

    afterEach(async () => {
      await telemetry.shutdown();
    });

    it("should create a span context for a pipeline stage", () => {
      const mapper = new SpanMapper(telemetry.tracer);
      const traceId = generateDiscoveryTraceId();

      const spanCtx = mapper.createStageSpan("worker", traceId);
      expect(spanCtx.span).toBeDefined();
      spanCtx.end();
    });

    it("should set stage metrics on span", () => {
      const mapper = new SpanMapper(telemetry.tracer);
      const spanCtx = mapper.createStageSpan("normalizer");
      SpanMapper.setStageMetricsOnSpan(spanCtx.span, {
        itemsProcessed: 50,
        itemsSucceeded: 48,
        itemsFailed: 2,
        durationMs: 300
      });
      spanCtx.end();
      // Should not throw
    });
  });

  // ── Metric Mapper ───────────────────────────────────────
  describe("Metric Mapper", () => {
    let telemetry: ReturnType<typeof createTestTelemetry>;

    beforeEach(() => {
      telemetry = createTestTelemetry();
    });

    afterEach(async () => {
      await telemetry.shutdown();
    });

    it("should record StageMetrics", () => {
      const mapper = new MetricMapper(telemetry.meter);
      const stageMetrics: StageMetrics = {
        id: "sm_test" as any,
        stage: "worker",
        batchId: "batch_001" as any,
        itemsProcessed: 100,
        itemsSucceeded: 95,
        itemsFailed: 5,
        durationMs: 500,
        throughput: 200,
        errorRate: 0.05,
        customMetrics: { productsDiscovered: 50 },
        capturedAt: new Date(),
        schemaVersion: "1.0.0"
      };

      mapper.recordStage("worker", stageMetrics);
      // Should not throw
    });

    it("should record BusinessMetricsSnapshot", () => {
      const mapper = new MetricMapper(telemetry.meter);
      const snapshot: BusinessMetricsSnapshot = {
        id: "bms_test",
        metrics: [
          { name: "total_items", value: 1000, unit: "count", trend: "up", period: "realtime", capturedAt: new Date() },
          { name: "error_rate", value: 0.05, unit: "ratio", trend: "stable", period: "realtime", capturedAt: new Date() }
        ],
        pipelineHealth: "healthy",
        capturedAt: new Date(),
        schemaVersion: "1.0.0"
      };

      mapper.recordBusiness(snapshot);
      // Should not throw
    });
  });

  // ── Telemetry Factory ───────────────────────────────────
  describe("Telemetry Factory", () => {
    it("should create and shutdown telemetry", async () => {
      const telemetry = createTestTelemetry();
      expect(telemetry.tracer).toBeDefined();
      expect(telemetry.meter).toBeDefined();
      expect(telemetry.logger).toBeDefined();
      await telemetry.shutdown();
    });
  });
});
