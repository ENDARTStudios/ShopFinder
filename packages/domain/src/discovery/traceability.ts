/**
 * @workspace/domain/discovery/traceability
 *
 * Cross-cutting traceability contracts for the discovery pipeline.
 *
 * DiscoveryTraceId is the single correlation key that flows through
 * the ENTIRE pipeline — from DiscoverySignal to BusinessMetricsSnapshot.
 *
 * Design:
 *   - DiscoveryTraceId is born in the Planner (when a signal becomes a plan)
 *   - Every coordinator receives traceId in its input and propagates it
 *   - Every artifact carries traceId in a TraceableMixin
 *   - Every event payload includes traceId
 *   - Monitoring uses traceId to correlate StageMetrics across stages
 *
 * This enables:
 *   - End-to-end traceability ("which signal produced this catalog entry?")
 *   - Log/trace correlation across distributed components
 *   - AI decision audit ("which trace produced this EvaluationResult?")
 *   - Failure reproduction (replay a trace from raw signals)
 *   - Distributed observability without coupling to any telemetry backend
 */
import type { DiscoveryTraceId } from "../shared";
import { generateDiscoveryTraceId, asDiscoveryTraceId } from "../shared";

// ── Traceable mixin ────────────────────────────────────────

/**
 * Any artifact that carries a DiscoveryTraceId is "traceable".
 * Apply this interface to: DiscoveryPlan, DiscoveryJob, WorkerResult,
 * RawProductRecord, NormalizedProductRecord, DuplicateCandidate,
 * CanonicalIdentity, CanonicalProduct, EvaluationResult,
 * CompliancePostCheckResult, CatalogEntry, SearchIndexEntry,
 * PublicationPlan, MarketplaceListing, PricingSnapshot, PriceDecision,
 * RankingRecord, StageMetrics, BusinessMetricsSnapshot.
 */
export interface Traceable {
  readonly traceId: DiscoveryTraceId;
}

// ── Trace context ──────────────────────────────────────────

/**
 * TraceContext is passed to every coordinator. Contains the traceId
 * and optional parent traceId (for sub-traces, e.g. a re-normalization
 * triggered by a dictionary update).
 */
export interface TraceContext {
  readonly traceId: DiscoveryTraceId;
  readonly parentTraceId?: DiscoveryTraceId;
  readonly initiatedBy: "planner" | "manual" | "reprocessing" | "scheduler" | "webhook";
  readonly initiatedAt: Date;
}

// ── Factory ────────────────────────────────────────────────

/**
 * Create a new TraceContext (born in the Planner).
 */
export function createTraceContext(
  initiatedBy: TraceContext["initiatedBy"] = "planner",
  parentTraceId?: DiscoveryTraceId
): TraceContext {
  return {
    traceId: generateDiscoveryTraceId(),
    parentTraceId,
    initiatedBy,
    initiatedAt: new Date()
  };
}

/**
 * Create a TraceContext from an existing traceId (propagation).
 * Used by coordinators that receive traceId from upstream.
 */
export function propagateTraceContext(
  traceId: DiscoveryTraceId | string,
  initiatedBy: TraceContext["initiatedBy"] = "planner",
  parentTraceId?: DiscoveryTraceId
): TraceContext {
  return {
    traceId: typeof traceId === "string" ? asDiscoveryTraceId(traceId) : traceId,
    parentTraceId,
    initiatedBy,
    initiatedAt: new Date()
  };
}

// ── Trace propagation helpers ──────────────────────────────

/**
 * Extract traceId from any traceable artifact.
 * Returns null if the artifact doesn't carry a traceId (legacy/unknown).
 */
export function extractTraceId(artifact: unknown): DiscoveryTraceId | null {
  if (artifact && typeof artifact === "object" && "traceId" in artifact) {
    const traceId = (artifact as { traceId: unknown }).traceId;
    if (typeof traceId === "string") return traceId as DiscoveryTraceId;
  }
  return null;
}

/**
 * Verify that two traceable artifacts belong to the same trace.
 */
export function sameTrace(a: Traceable, b: Traceable): boolean {
  return a.traceId === b.traceId;
}

// ── Re-exports ─────────────────────────────────────────────

export type { DiscoveryTraceId };
export { generateDiscoveryTraceId, asDiscoveryTraceId };
