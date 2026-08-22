/**
 * OpenTelemetry — NodeSDK com auto-instrumentação (docs/eng/OBSERVABILITY.md)
 *
 * Importado dinamicamente por src/instrumentation.ts apenas quando
 * OTEL_EXPORTER_OTLP_ENDPOINT está configurado. Auto-instrumentações
 * cobrem http.server, http.client (fetch — connectors/Stripe) e
 * @prisma/client (runtime patching). Export: OTLP/HTTP (Datadog,
 * NewRelic, Jaeger, Honeycomb...).
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT!;

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "shopfinder-web",
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "0.1.0"
  }),
  traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Desativar instrumentações barulhentas que não agregam ao debug
      "@opentelemetry/instrumentation-fs": { enabled: false },
      "@opentelemetry/instrumentation-dns": { enabled: false }
    })
  ]
});

sdk.start();
