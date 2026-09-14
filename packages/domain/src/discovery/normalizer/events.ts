/**
 * @workspace/domain/discovery/normalizer/events
 *
 * 4 events published by the Normalizer (R9):
 *
 *   1. NormalizationStarted      — batch started
 *   2. NormalizationCompleted    — batch finished (with metrics)
 *   3. NormalizedProductsCreated — A2.6 Similarity consumes this
 *   4. SemanticHashesGenerated   — phash + semanticHash ready for dedup
 *
 * A2.6 (Similarity/Dedup) subscribes to NormalizedProductsCreated.
 */
import type { DomainEvent } from "../../shared";
import type { NormalizerVersions } from "./types";
import { NORMALIZER_SCHEMA_VERSION } from "./types";

// ── Event types ────────────────────────────────────────────

export const NORMALIZER_EVENT_TYPES = [
  "discovery.normalization.started",
  "discovery.normalization.completed",
  "discovery.normalization.products_created",
  "discovery.normalization.semantic_hashes_generated"
] as const;

export type NormalizerEventType = (typeof NORMALIZER_EVENT_TYPES)[number];

// ── Versioned payload base ─────────────────────────────────

export interface NormalizerVersionedPayload {
  readonly schemaVersion: typeof NORMALIZER_SCHEMA_VERSION;
  readonly normalizerVersion: string;
  readonly taxonomyVersion: string;
  readonly attributeDictionaryVersion: string;
  readonly translationModelVersion: string;
}

// ── Payloads ───────────────────────────────────────────────

export interface NormalizationStartedPayload extends NormalizerVersionedPayload {
  readonly executionId: string;
  readonly batchId: string;
  readonly rawRecordCount: number;
  readonly startedAt: string;
}

export interface NormalizationCompletedPayload extends NormalizerVersionedPayload {
  readonly executionId: string;
  readonly batchId: string;
  readonly normalizedCount: number;
  readonly durationMs: number;
  readonly metrics: {
    readonly titlesNormalized: number;
    readonly brandsResolved: number;
    readonly attributesMapped: number;
    readonly categoriesMapped: number;
    readonly imagesProcessed: number;
    readonly semanticHashesCreated: number;
    readonly unknownBrands: number;
    readonly unknownCategories: number;
    readonly attributeCoverage: number;
  };
}

export interface NormalizedProductsCreatedPayload extends NormalizerVersionedPayload {
  readonly executionId: string;
  readonly batchId: string;
  readonly count: number;
  readonly normalizedProductIds: ReadonlyArray<string>;
  readonly semanticHashes: ReadonlyArray<string>;
}

export interface SemanticHashesGeneratedPayload extends NormalizerVersionedPayload {
  readonly executionId: string;
  readonly batchId: string;
  readonly count: number;
  readonly hashes: ReadonlyArray<{ semanticHash: string; phashCount: number }>;
}

// ── Event types ────────────────────────────────────────────

export type NormalizerEvent =
  | NormalizationStartedEvent
  | NormalizationCompletedEvent
  | NormalizedProductsCreatedEvent
  | SemanticHashesGeneratedEvent;

export interface NormalizerEventBase extends Omit<DomainEvent, "eventType"> {
  readonly eventType: NormalizerEventType;
}

export interface NormalizationStartedEvent extends NormalizerEventBase {
  readonly eventType: (typeof NORMALIZER_EVENT_TYPES)[0];
  readonly aggregateType: "NormalizationBatch";
  readonly payload: NormalizationStartedPayload;
}

export interface NormalizationCompletedEvent extends NormalizerEventBase {
  readonly eventType: (typeof NORMALIZER_EVENT_TYPES)[1];
  readonly aggregateType: "NormalizationBatch";
  readonly payload: NormalizationCompletedPayload;
}

export interface NormalizedProductsCreatedEvent extends NormalizerEventBase {
  readonly eventType: (typeof NORMALIZER_EVENT_TYPES)[2];
  readonly aggregateType: "NormalizationBatch";
  readonly payload: NormalizedProductsCreatedPayload;
}

export interface SemanticHashesGeneratedEvent extends NormalizerEventBase {
  readonly eventType: (typeof NORMALIZER_EVENT_TYPES)[3];
  readonly aggregateType: "NormalizationBatch";
  readonly payload: SemanticHashesGeneratedPayload;
}

// ── Factories ──────────────────────────────────────────────

let _seq = 0;
function nextEventId(): string {
  _seq += 1;
  return `norm_evt_${Date.now()}_${_seq}_${Math.random().toString(36).slice(2, 6)}`;
}

function withVersions<T>(versions: NormalizerVersions, payload: T): T & NormalizerVersionedPayload {
  return {
    ...payload,
    schemaVersion: NORMALIZER_SCHEMA_VERSION,
    normalizerVersion: versions.normalizerVersion,
    taxonomyVersion: versions.taxonomyVersion,
    attributeDictionaryVersion: versions.attributeDictionaryVersion,
    translationModelVersion: versions.translationModelVersion
  };
}

export function makeNormalizationStartedEvent(
  versions: NormalizerVersions,
  payload: Omit<NormalizationStartedPayload, keyof NormalizerVersionedPayload>
): NormalizationStartedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.normalization.started",
    aggregateType: "NormalizationBatch",
    aggregateId: payload.batchId,
    occurredAt: new Date(),
    version: 1,
    payload: withVersions(versions, payload)
  };
}

export function makeNormalizationCompletedEvent(
  versions: NormalizerVersions,
  payload: Omit<NormalizationCompletedPayload, keyof NormalizerVersionedPayload>
): NormalizationCompletedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.normalization.completed",
    aggregateType: "NormalizationBatch",
    aggregateId: payload.batchId,
    occurredAt: new Date(),
    version: 1,
    payload: withVersions(versions, payload)
  };
}

export function makeNormalizedProductsCreatedEvent(
  versions: NormalizerVersions,
  payload: Omit<NormalizedProductsCreatedPayload, keyof NormalizerVersionedPayload>
): NormalizedProductsCreatedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.normalization.products_created",
    aggregateType: "NormalizationBatch",
    aggregateId: payload.batchId,
    occurredAt: new Date(),
    version: 1,
    payload: withVersions(versions, payload)
  };
}

export function makeSemanticHashesGeneratedEvent(
  versions: NormalizerVersions,
  payload: Omit<SemanticHashesGeneratedPayload, keyof NormalizerVersionedPayload>
): SemanticHashesGeneratedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.normalization.semantic_hashes_generated",
    aggregateType: "NormalizationBatch",
    aggregateId: payload.batchId,
    occurredAt: new Date(),
    version: 1,
    payload: withVersions(versions, payload)
  };
}
