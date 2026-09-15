/**
 * @workspace/infrastructure/observability/context-propagator
 *
 * Bridges the domain's DiscoveryTraceId to OpenTelemetry's Context.
 *
 * DiscoveryTraceId is the PRIMARY correlation key. The adapter converts
 * it to an OTel context — never the other way around.
 *
 * Flow:
 *   DiscoveryTraceId → OTel Context → Span → Exporter → Jaeger/Tempo
 */
import type { DiscoveryTraceId } from "@workspace/domain/shared";
import { trace, context, type Context, SpanContext, TraceFlags } from "@opentelemetry/api";

// ── Trace ID conversion ────────────────────────────────────

/**
 * Convert a DiscoveryTraceId to a 32-char hex string (OTel format).
 * DiscoveryTraceId is `trace_<base36>_<random>` — we hash it to 32 hex chars.
 */
export function toOTelTraceId(traceId: DiscoveryTraceId): string {
  const str = traceId as string;
  // Use FNV-1a to produce a deterministic 32-char hex from the traceId string
  let h1 = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h1 ^= str.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193) >>> 0;
  }
  let h2 = 0x84222325;
  for (let i = str.length - 1; i >= 0; i--) {
    h2 ^= str.charCodeAt(i);
    h2 = Math.imul(h2, 0x01000193) >>> 0;
  }
  h1 = Math.imul(h1 ^ h2, 0x01000193) >>> 0;
  h2 = Math.imul(h2 ^ h1, 0x01000193) >>> 0;
  // Repeat to fill 32 chars
  const part = h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
  return (part + part).slice(0, 32);
}

/**
 * Generate a random 16-char hex span ID (OTel format).
 */
export function generateSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Context creation ───────────────────────────────────────

/**
 * Create an OTel SpanContext from a DiscoveryTraceId.
 * This allows correlating OTel spans with the domain's trace.
 */
export function createSpanContext(traceId: DiscoveryTraceId): SpanContext {
  return {
    traceId: toOTelTraceId(traceId),
    spanId: generateSpanId(),
    traceFlags: TraceFlags.SAMPLED
  };
}

/**
 * Create an OTel Context from a DiscoveryTraceId.
 * The context carries the traceId so all spans created within it
 * are correlated.
 */
// Roundtrip DiscoveryTraceId → SpanContext sem depender de atributos internos do Span
const spanContextTraceIds = new WeakMap<SpanContext, DiscoveryTraceId>();

export function createContextFromTraceId(traceId: DiscoveryTraceId): Context {
  const spanContext = createSpanContext(traceId);
  spanContextTraceIds.set(spanContext, traceId);
  // Create a context with the span context set as the active trace
  return trace.setSpanContext(context.active(), spanContext);
}

/**
 * Extract the DiscoveryTraceId from the current OTel context (if any).
 * Returns null if no trace is active.
 */
export function getTraceIdFromContext(): DiscoveryTraceId | null {
  const span = trace.getSpan(context.active());
  if (!span) return null;
  const spanContext = span.spanContext();
  if (!spanContext) return null;
  return spanContextTraceIds.get(spanContext) ?? null;
}
