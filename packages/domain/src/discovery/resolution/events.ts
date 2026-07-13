/**
 * @workspace/domain/discovery/resolution/events
 *
 * Events for Duplicate Resolution (A2.7) and Canonical Building.
 *
 * Flow:
 *   DuplicateCandidatesDetected (from A2.6)
 *     ↓
 *   SimilarityClusterCreated (from A2.6)
 *     ↓
 *   CanonicalIdentityResolved       ← A2.7 produces this
 *   CanonicalIdentityConflictDetected ← A2.7 produces this (for conflicts)
 *     ↓
 *   CanonicalProductBuilt           ← A2.7 builder produces this
 *     ↓
 *   CanonicalProductReadyForEvaluation ← A2.8 AI Evaluation consumes this
 */
import type { DomainEvent } from "../../shared";

export const RESOLUTION_EVENT_TYPES = [
  "discovery.resolution.identity_resolved",
  "discovery.resolution.conflict_detected",
  "discovery.resolution.product_built",
  "discovery.resolution.ready_for_evaluation"
] as const;

export type ResolutionEventType = (typeof RESOLUTION_EVENT_TYPES)[number];

export interface ResolutionVersionedPayload {
  readonly schemaVersion: "1.0.0";
  readonly resolutionStrategy: string;
  readonly policyVersion: string;
}

// ── Payloads ───────────────────────────────────────────────

export interface CanonicalIdentityResolvedPayload extends ResolutionVersionedPayload {
  readonly identityId: string;
  readonly canonicalProductId: string;
  readonly clusterId: string;
  readonly memberCount: number;
  readonly primaryProductId: string;
  readonly confidence: number;
  readonly resolutionStrategy: string;
}

export interface CanonicalIdentityConflictDetectedPayload extends ResolutionVersionedPayload {
  readonly conflictId: string;
  readonly clusterId: string;
  readonly reason: string;
  readonly candidateCount: number;
  readonly details: string;
}

export interface CanonicalProductBuiltPayload extends ResolutionVersionedPayload {
  readonly canonicalProductId: string;
  readonly identityId: string;
  readonly title: string;
  readonly brand: string;
  readonly offerCount: number;
  readonly supplierCount: number;
}

export interface CanonicalProductReadyForEvaluationPayload extends ResolutionVersionedPayload {
  readonly canonicalProductId: string;
  readonly identityId: string;
}

// ── Events ─────────────────────────────────────────────────

export type ResolutionEvent =
  | CanonicalIdentityResolvedEvent
  | CanonicalIdentityConflictDetectedEvent
  | CanonicalProductBuiltEvent
  | CanonicalProductReadyForEvaluationEvent;

export interface ResolutionEventBase extends Omit<DomainEvent, "eventType"> {
  readonly eventType: ResolutionEventType;
}

export interface CanonicalIdentityResolvedEvent extends ResolutionEventBase {
  readonly eventType: (typeof RESOLUTION_EVENT_TYPES)[0];
  readonly aggregateType: "CanonicalIdentity";
  readonly payload: CanonicalIdentityResolvedPayload;
}
export interface CanonicalIdentityConflictDetectedEvent extends ResolutionEventBase {
  readonly eventType: (typeof RESOLUTION_EVENT_TYPES)[1];
  readonly aggregateType: "ConflictRecord";
  readonly payload: CanonicalIdentityConflictDetectedPayload;
}
export interface CanonicalProductBuiltEvent extends ResolutionEventBase {
  readonly eventType: (typeof RESOLUTION_EVENT_TYPES)[2];
  readonly aggregateType: "CanonicalProduct";
  readonly payload: CanonicalProductBuiltPayload;
}
export interface CanonicalProductReadyForEvaluationEvent extends ResolutionEventBase {
  readonly eventType: (typeof RESOLUTION_EVENT_TYPES)[3];
  readonly aggregateType: "CanonicalProduct";
  readonly payload: CanonicalProductReadyForEvaluationPayload;
}

// ── Factories ──────────────────────────────────────────────

let _seq = 0;
function nextEventId(): string {
  _seq += 1;
  return `res_evt_${Date.now()}_${_seq}_${Math.random().toString(36).slice(2, 6)}`;
}

export function makeCanonicalIdentityResolvedEvent(
  versions: { resolutionStrategy: string; policyVersion: string },
  payload: Omit<CanonicalIdentityResolvedPayload, keyof ResolutionVersionedPayload>
): CanonicalIdentityResolvedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.resolution.identity_resolved",
    aggregateType: "CanonicalIdentity",
    aggregateId: payload.identityId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeCanonicalIdentityConflictDetectedEvent(
  versions: { resolutionStrategy: string; policyVersion: string },
  payload: Omit<CanonicalIdentityConflictDetectedPayload, keyof ResolutionVersionedPayload>
): CanonicalIdentityConflictDetectedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.resolution.conflict_detected",
    aggregateType: "ConflictRecord",
    aggregateId: payload.conflictId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeCanonicalProductBuiltEvent(
  versions: { resolutionStrategy: string; policyVersion: string },
  payload: Omit<CanonicalProductBuiltPayload, keyof ResolutionVersionedPayload>
): CanonicalProductBuiltEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.resolution.product_built",
    aggregateType: "CanonicalProduct",
    aggregateId: payload.canonicalProductId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeCanonicalProductReadyForEvaluationEvent(
  versions: { resolutionStrategy: string; policyVersion: string },
  payload: Omit<CanonicalProductReadyForEvaluationPayload, keyof ResolutionVersionedPayload>
): CanonicalProductReadyForEvaluationEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.resolution.ready_for_evaluation",
    aggregateType: "CanonicalProduct",
    aggregateId: payload.canonicalProductId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}
