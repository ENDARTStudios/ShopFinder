/**
 * @workspace/infrastructure/observability/telemetry-factory
 *
 * Bootstrap OpenTelemetry SDK — creates Tracer, Meter, and exporters.
 *
 * Exporters:
 *   - Console (development — logs spans/metrics to stdout)
 *   - OTLP HTTP (production — sends to Jaeger/Tempo/Prometheus)
 *
 * Usage:
 *   const telemetry = createTelemetry({ serviceName: "ai-commerce" });
 *   telemetry.start();
 *   // ... use tracer, meter, logger ...
 *   await telemetry.shutdown();
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { ConsoleSpanExporter, InMemorySpanExporter } from "@opentelemetry/sdk-trace-base";
// InMemorySpanExporter in v2 is a class, not a singleton. We create instances directly.
import { PeriodicExportingMetricReader, ConsoleMetricExporter } from "@opentelemetry/sdk-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { ObservabilityTracer } from "./tracer";
import { ObservabilityMeter } from "./metrics";
import { createLogger, type StructuredLogger } from "./logger";

export interface TelemetryConfig {
  readonly serviceName: string;
  readonly serviceVersion?: string;
  readonly otlpEndpoint?: string;     // e.g. http://localhost:4318
  readonly consoleExporter?: boolean;  // log to console (dev)
  readonly inMemoryExporter?: boolean; // capture in memory (tests)
  readonly logLevel?: "debug" | "info" | "warn" | "error";
}

export interface Telemetry {
  readonly tracer: ObservabilityTracer;
  readonly meter: ObservabilityMeter;
  readonly logger: StructuredLogger;
  readonly start: () => void;
  readonly shutdown: () => Promise<void>;
  readonly getInMemorySpans?: () => unknown[];
}

export function createTelemetry(config: TelemetryConfig): Telemetry {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion ?? "1.0.0",
  });

  // In-memory span exporter for tests
  let inMemoryExporter: InMemorySpanExporter | undefined;

  // Trace exporter
  const traceExporters: any[] = [];
  if (config.consoleExporter) traceExporters.push(new ConsoleSpanExporter());
  if (config.inMemoryExporter) {
    inMemoryExporter = new InMemorySpanExporter();
    traceExporters.push(inMemoryExporter);
  }
  if (config.otlpEndpoint) {
    traceExporters.push(new OTLPTraceExporter({ url: `${config.otlpEndpoint}/v1/traces` }));
  }

  // Metric exporter
  const metricReaders: any[] = [];
  if (config.consoleExporter) {
    metricReaders.push(new PeriodicExportingMetricReader({
      exporter: new ConsoleMetricExporter(),
      exportIntervalMillis: 5000,
    }));
  }
  if (config.otlpEndpoint) {
    metricReaders.push(new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${config.otlpEndpoint}/v1/metrics` }),
      exportIntervalMillis: 5000,
    }));
  }

  const sdk = new NodeSDK({
    resource,
    traceExporter: traceExporters[0] ?? new ConsoleSpanExporter(),
    metricReader: metricReaders[0],
  });

  const tracer = new ObservabilityTracer(config.serviceName);
  const meter = new ObservabilityMeter(config.serviceName);
  const logger = createLogger(config.logLevel);

  return {
    tracer,
    meter,
    logger,
    start: () => sdk.start(),
    shutdown: () => sdk.shutdown(),
    getInMemorySpans: config.inMemoryExporter && inMemoryExporter
      ? () => inMemoryExporter!.getFinishedSpans()
      : undefined,
  };
}

/**
 * Create a test telemetry instance with in-memory exporters.
 */
export function createTestTelemetry(): Telemetry & { getInMemorySpans: () => unknown[] } {
  const telemetry = createTelemetry({
    serviceName: "test",
    inMemoryExporter: true,
    logLevel: "debug",
  });
  telemetry.start();
  return telemetry as Telemetry & { getInMemorySpans: () => unknown[] };
}
