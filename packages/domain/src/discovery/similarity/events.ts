/**
 * @workspace/domain/discovery/similarity/events
 *
 * 4 events published by the Similarity module:
 *   1. SimilarityStarted       — batch comparison started
 *   2. SimilarityCompleted     — batch finished (with metrics)
 *   3. DuplicateCandidatesDetected — candidates created
 *   4. SimilarityClustersCreated   — clusters formed
 *
 * A2.7 Duplicate Resolution subscribes to DuplicateCandidatesDetected.
 */
import type { DomainEvent } from "../../shared";

export const SIMILARITY_EVENT_TYPES = [
  "discovery.similarity.started",
  "discovery.similarity.completed",
  "discovery.similarity.candidates_detected",
  "discovery.similarity.clusters_created"
] as const;

export type SimilarityEventType = (typeof SIMILARITY_EVENT_TYPES)[number];

export interface SimilarityVersionedPayload {
  readonly schemaVersion: "1.0.0";
  readonly algorithmVersion: string;
  readonly policyVersion: string;
}

export interface SimilarityStartedPayload extends SimilarityVersionedPayload {
  readonly batchId: string;
  readonly productCount: number;
  readonly startedAt: string;
}

export interface SimilarityCompletedPayload extends SimilarityVersionedPayload {
  readonly batchId: string;
  readonly candidatesCreated: number;
  readonly clustersCreated: number;
  readonly durationMs: number;
  readonly metrics: {
    readonly pairsCompared: number;
    readonly pairsRejected: number;
    readonly averageSimilarity: number;
    readonly duplicatesDetected: number;
  };
}

export interface DuplicateCandidatesDetectedPayload extends SimilarityVersionedPayload {
  readonly batchId: string;
  readonly count: number;
  readonly candidateIds: ReadonlyArray<string>;
}

export interface SimilarityClustersCreatedPayload extends SimilarityVersionedPayload {
  readonly batchId: string;
  readonly count: number;
  readonly clusterIds: ReadonlyArray<string>;
  readonly totalMembers: number;
}

export type SimilarityEvent =
  | SimilarityStartedEvent
  | SimilarityCompletedEvent
  | DuplicateCandidatesDetectedEvent
  | SimilarityClustersCreatedEvent;

export interface SimilarityEventBase extends Omit<DomainEvent, "eventType"> {
  readonly eventType: SimilarityEventType;
}

export interface SimilarityStartedEvent extends SimilarityEventBase {
  readonly eventType: (typeof SIMILARITY_EVENT_TYPES)[0];
  readonly aggregateType: "SimilarityBatch";
  readonly payload: SimilarityStartedPayload;
}
export interface SimilarityCompletedEvent extends SimilarityEventBase {
  readonly eventType: (typeof SIMILARITY_EVENT_TYPES)[1];
  readonly aggregateType: "SimilarityBatch";
  readonly payload: SimilarityCompletedPayload;
}
export interface DuplicateCandidatesDetectedEvent extends SimilarityEventBase {
  readonly eventType: (typeof SIMILARITY_EVENT_TYPES)[2];
  readonly aggregateType: "SimilarityBatch";
  readonly payload: DuplicateCandidatesDetectedPayload;
}
export interface SimilarityClustersCreatedEvent extends SimilarityEventBase {
  readonly eventType: (typeof SIMILARITY_EVENT_TYPES)[3];
  readonly aggregateType: "SimilarityBatch";
  readonly payload: SimilarityClustersCreatedPayload;
}

let _seq = 0;
function nextEventId(): string {
  _seq += 1;
  return `sim_evt_${Date.now()}_${_seq}_${Math.random().toString(36).slice(2, 6)}`;
}

export function makeSimilarityStartedEvent(
  versions: { algorithmVersion: string; policyVersion: string },
  payload: Omit<SimilarityStartedPayload, keyof SimilarityVersionedPayload>
): SimilarityStartedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.similarity.started",
    aggregateType: "SimilarityBatch",
    aggregateId: payload.batchId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeSimilarityCompletedEvent(
  versions: { algorithmVersion: string; policyVersion: string },
  payload: Omit<SimilarityCompletedPayload, keyof SimilarityVersionedPayload>
): SimilarityCompletedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.similarity.completed",
    aggregateType: "SimilarityBatch",
    aggregateId: payload.batchId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeDuplicateCandidatesDetectedEvent(
  versions: { algorithmVersion: string; policyVersion: string },
  payload: Omit<DuplicateCandidatesDetectedPayload, keyof SimilarityVersionedPayload>
): DuplicateCandidatesDetectedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.similarity.candidates_detected",
    aggregateType: "SimilarityBatch",
    aggregateId: payload.batchId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeSimilarityClustersCreatedEvent(
  versions: { algorithmVersion: string; policyVersion: string },
  payload: Omit<SimilarityClustersCreatedPayload, keyof SimilarityVersionedPayload>
): SimilarityClustersCreatedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.similarity.clusters_created",
    aggregateType: "SimilarityBatch",
    aggregateId: payload.batchId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}
