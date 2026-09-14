/**
 * @workspace/domain/discovery/evaluation/events
 *
 * Events for AI Evaluation (A2.8).
 * Inference and Evaluation are DISTINCT event streams.
 *
 * Flow:
 *   CanonicalProductReadyForEvaluation (from A2.7)
 *     ↓
 *   InferenceStarted → InferenceCompleted
 *     ↓
 *   EvaluationCompleted (or EvaluationCached or EvaluationRejected)
 *     ↓
 *   A2.9 Compliance (post-evaluation) / Catalog Publisher
 */
import type { DomainEvent } from "../../shared";
import type { Money } from "../../shared";

export const EVALUATION_EVENT_TYPES = [
  "discovery.evaluation.inference_started",
  "discovery.evaluation.inference_completed",
  "discovery.evaluation.completed",
  "discovery.evaluation.cached",
  "discovery.evaluation.rejected"
] as const;

export type EvaluationEventType = (typeof EVALUATION_EVENT_TYPES)[number];

export interface EvaluationVersionedPayload {
  readonly schemaVersion: "1.0.0";
  readonly modelVersion: string;
  readonly promptVersion: string;
  readonly decisionProviderVersion: string;
  readonly policyVersion: string;
}

// ── Payloads ───────────────────────────────────────────────

export interface InferenceStartedPayload extends EvaluationVersionedPayload {
  readonly canonicalProductId: string;
  readonly inferenceId: string;
  readonly modelId: string;
  readonly startedAt: string;
}

export interface InferenceCompletedPayload extends EvaluationVersionedPayload {
  readonly inferenceId: string;
  readonly canonicalProductId: string;
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly estimatedCost: { amount: number; currency: string };
}

export interface EvaluationCompletedPayload extends EvaluationVersionedPayload {
  readonly evaluationId: string;
  readonly canonicalProductId: string;
  readonly inferenceId: string;
  readonly recommendation: string;
  readonly confidence: number;
  readonly overallScore: number;
  readonly decision: string;
  readonly decisionReason: string;
}

export interface EvaluationCachedPayload extends EvaluationVersionedPayload {
  readonly canonicalProductId: string;
  readonly evaluationId: string;
  readonly cachedAt: string;
}

export interface EvaluationRejectedPayload extends EvaluationVersionedPayload {
  readonly canonicalProductId: string;
  readonly reason: string;
  readonly violations: ReadonlyArray<string>;
}

// ── Events ─────────────────────────────────────────────────

export type EvaluationEvent =
  | InferenceStartedEvent
  | InferenceCompletedEvent
  | EvaluationCompletedEvent
  | EvaluationCachedEvent
  | EvaluationRejectedEvent;

export interface EvaluationEventBase extends Omit<DomainEvent, "eventType"> {
  readonly eventType: EvaluationEventType;
}

export interface InferenceStartedEvent extends EvaluationEventBase {
  readonly eventType: (typeof EVALUATION_EVENT_TYPES)[0];
  readonly aggregateType: "CanonicalProduct";
  readonly payload: InferenceStartedPayload;
}
export interface InferenceCompletedEvent extends EvaluationEventBase {
  readonly eventType: (typeof EVALUATION_EVENT_TYPES)[1];
  readonly aggregateType: "InferenceArtifact";
  readonly payload: InferenceCompletedPayload;
}
export interface EvaluationCompletedEvent extends EvaluationEventBase {
  readonly eventType: (typeof EVALUATION_EVENT_TYPES)[2];
  readonly aggregateType: "EvaluationResult";
  readonly payload: EvaluationCompletedPayload;
}
export interface EvaluationCachedEvent extends EvaluationEventBase {
  readonly eventType: (typeof EVALUATION_EVENT_TYPES)[3];
  readonly aggregateType: "EvaluationResult";
  readonly payload: EvaluationCachedPayload;
}
export interface EvaluationRejectedEvent extends EvaluationEventBase {
  readonly eventType: (typeof EVALUATION_EVENT_TYPES)[4];
  readonly aggregateType: "CanonicalProduct";
  readonly payload: EvaluationRejectedPayload;
}

// ── Factories ──────────────────────────────────────────────

let _seq = 0;
function nextEventId(): string {
  _seq += 1;
  return `eval_evt_${Date.now()}_${_seq}_${Math.random().toString(36).slice(2, 6)}`;
}

export function makeInferenceStartedEvent(
  versions: Omit<EvaluationVersionedPayload, "schemaVersion">,
  payload: Omit<InferenceStartedPayload, keyof EvaluationVersionedPayload>
): InferenceStartedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.evaluation.inference_started",
    aggregateType: "CanonicalProduct",
    aggregateId: payload.canonicalProductId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeInferenceCompletedEvent(
  versions: Omit<EvaluationVersionedPayload, "schemaVersion">,
  payload: Omit<InferenceCompletedPayload, keyof EvaluationVersionedPayload>
): InferenceCompletedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.evaluation.inference_completed",
    aggregateType: "InferenceArtifact",
    aggregateId: payload.inferenceId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeEvaluationCompletedEvent(
  versions: Omit<EvaluationVersionedPayload, "schemaVersion">,
  payload: Omit<EvaluationCompletedPayload, keyof EvaluationVersionedPayload>
): EvaluationCompletedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.evaluation.completed",
    aggregateType: "EvaluationResult",
    aggregateId: payload.evaluationId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeEvaluationCachedEvent(
  versions: Omit<EvaluationVersionedPayload, "schemaVersion">,
  payload: Omit<EvaluationCachedPayload, keyof EvaluationVersionedPayload>
): EvaluationCachedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.evaluation.cached",
    aggregateType: "EvaluationResult",
    aggregateId: payload.evaluationId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeEvaluationRejectedEvent(
  versions: Omit<EvaluationVersionedPayload, "schemaVersion">,
  payload: Omit<EvaluationRejectedPayload, keyof EvaluationVersionedPayload>
): EvaluationRejectedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.evaluation.rejected",
    aggregateType: "CanonicalProduct",
    aggregateId: payload.canonicalProductId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export type { Money };
