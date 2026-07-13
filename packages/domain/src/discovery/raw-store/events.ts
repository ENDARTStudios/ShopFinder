/**
 * @workspace/domain/discovery/raw-store/events
 *
 * Two events published by the Raw Store:
 *
 *   1. RawProductsPersisted — fired immediately after append.
 *      Payload: executionId, provider, count, hashes, duration.
 *      Signals: "raw bytes are safely stored."
 *
 *   2. RawProductsReadyForNormalization — fired after persist.
 *      Payload: executionId, provider, count, partitionKeys.
 *      Signals: "downstream Normalizer (A2.5) may now consume."
 *
 * Splitting these two decouples A2.4 from A2.5: the Normalizer
 * subscribes to ReadyForNormalization, not to Persisted. This
 * allows re-running normalization without re-persisting.
 */
import type { DomainEvent } from "../../shared";
import type { RawStoreVersions } from "./types";
import { RAW_STORE_SCHEMA_VERSION } from "./types";

// ── Event types ────────────────────────────────────────────

export const RAW_STORE_EVENT_TYPES = [
  "discovery.raw.persisted",
  "discovery.raw.ready_for_normalization"
] as const;

export type RawStoreEventType = (typeof RAW_STORE_EVENT_TYPES)[number];

// ── Versioned payload base ─────────────────────────────────

export interface RawStoreVersionedPayload {
  readonly schemaVersion: typeof RAW_STORE_SCHEMA_VERSION;
  readonly workflowVersion: string;
  readonly plannerVersion: string;
  readonly providerVersion: string;
  readonly connectorVersion: string;
}

// ── Payloads ───────────────────────────────────────────────

export interface RawProductsPersistedPayload extends RawStoreVersionedPayload {
  readonly executionId: string;
  readonly executionKey: string;
  readonly planId: string;
  readonly jobId: string;
  readonly providerCode: string;
  readonly count: number;
  readonly skipped: number;
  readonly payloadHashes: ReadonlyArray<string>;
  readonly partitionKey: string;
  readonly durationMs: number;
}

export interface RawProductsReadyForNormalizationPayload extends RawStoreVersionedPayload {
  readonly executionId: string;
  readonly providerCode: string;
  readonly count: number;
  readonly partitionKeys: ReadonlyArray<string>;
}

// ── Event types ────────────────────────────────────────────

export type RawStoreEvent = RawProductsPersistedEvent | RawProductsReadyForNormalizationEvent;

export interface RawStoreEventBase extends Omit<DomainEvent, "eventType"> {
  readonly eventType: RawStoreEventType;
}

export interface RawProductsPersistedEvent extends RawStoreEventBase {
  readonly eventType: (typeof RAW_STORE_EVENT_TYPES)[0];
  readonly aggregateType: "DiscoveryExecution";
  readonly payload: RawProductsPersistedPayload;
}

export interface RawProductsReadyForNormalizationEvent extends RawStoreEventBase {
  readonly eventType: (typeof RAW_STORE_EVENT_TYPES)[1];
  readonly aggregateType: "DiscoveryExecution";
  readonly payload: RawProductsReadyForNormalizationPayload;
}

// ── Factories ──────────────────────────────────────────────

let _seq = 0;
function nextEventId(): string {
  _seq += 1;
  return `raw_evt_${Date.now()}_${_seq}_${Math.random().toString(36).slice(2, 6)}`;
}

function withVersions<T>(versions: RawStoreVersions, payload: T): T & RawStoreVersionedPayload {
  return {
    ...payload,
    schemaVersion: RAW_STORE_SCHEMA_VERSION,
    workflowVersion: versions.workflowVersion,
    plannerVersion: versions.plannerVersion,
    providerVersion: versions.providerVersion,
    connectorVersion: versions.connectorVersion
  };
}

export function makeRawProductsPersistedEvent(
  versions: RawStoreVersions,
  payload: Omit<RawProductsPersistedPayload, keyof RawStoreVersionedPayload>
): RawProductsPersistedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.raw.persisted",
    aggregateType: "DiscoveryExecution",
    aggregateId: payload.executionId,
    occurredAt: new Date(),
    version: 1,
    payload: withVersions(versions, payload)
  };
}

export function makeRawProductsReadyForNormalizationEvent(
  versions: RawStoreVersions,
  payload: Omit<RawProductsReadyForNormalizationPayload, keyof RawStoreVersionedPayload>
): RawProductsReadyForNormalizationEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.raw.ready_for_normalization",
    aggregateType: "DiscoveryExecution",
    aggregateId: payload.executionId,
    occurredAt: new Date(),
    version: 1,
    payload: withVersions(versions, payload)
  };
}
