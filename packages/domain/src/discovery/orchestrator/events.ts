/**
 * @workspace/domain/discovery/orchestrator/events
 *
 * Five orchestrator events (A2.2 — refined).
 *
 * R5: Every event payload carries schemaVersion + workflowVersion +
 *     plannerVersion to enable deterministic replay and upcasting.
 *
 * "Intent" vs "consummated":
 *   Scheduled/JobCreated = intent (orchestrator decided)
 *   Started/Completed/Failed = consummated (workers acted in A2.3)
 */
import type { DomainEvent } from "../../shared";
import { ORCHESTRATOR_SCHEMA_VERSION } from "./types";

// ── Event types ────────────────────────────────────────────

export const ORCHESTRATOR_EVENT_TYPES = [
  "discovery.plan.scheduled",
  "discovery.job.created",
  "discovery.execution.started",
  "discovery.execution.completed",
  "discovery.execution.failed"
] as const;

export type OrchestratorEventType = (typeof ORCHESTRATOR_EVENT_TYPES)[number];

// ── Versioned payload base (R5) ────────────────────────────

/**
 * Every orchestrator event payload carries these three version fields.
 * They enable:
 *   - schemaVersion: upcasting old events during replay
 *   - workflowVersion: invalidating executions when job-factory logic changes
 *   - plannerVersion: invalidating executions when planner logic changes
 */
export interface VersionedPayload {
  readonly schemaVersion: typeof ORCHESTRATOR_SCHEMA_VERSION;
  readonly workflowVersion: string;
  readonly plannerVersion: string;
}

// ── Event payloads ─────────────────────────────────────────

export interface DiscoveryPlanScheduledPayload extends VersionedPayload {
  readonly planId: string;
  readonly planHash: string;
  readonly executionKey: string;
  readonly storeId: string;
  readonly providerManifestVersion: string;
  readonly jobCount: number;
  readonly apiCallsReserved: number;
  readonly reservationToken: string;
}

export interface DiscoveryJobCreatedPayload extends VersionedPayload {
  readonly planId: string;
  readonly executionKey: string;
  readonly jobId: string;
  readonly jobType: string;
  readonly providerCode: string;
  readonly region: string;
  readonly priority: number;
  /** R6: sequence number within the parent plan (0-indexed). */
  readonly sequenceNumber: number;
}

export interface DiscoveryExecutionStartedPayload extends VersionedPayload {
  readonly planId: string;
  readonly executionKey: string;
  readonly jobId: string;
  readonly workerId: string;
  readonly startedAt: string; // ISO
}

export interface DiscoveryExecutionCompletedPayload extends VersionedPayload {
  readonly planId: string;
  readonly executionKey: string;
  readonly jobId: string;
  readonly workerId: string;
  readonly productsDiscovered: number;
  readonly productsNormalized: number;
  readonly durationMs: number;
  readonly apiCallsUsed: number;
  readonly nextCursor?: string;
  readonly hasMore: boolean;
}

export interface DiscoveryExecutionFailedPayload extends VersionedPayload {
  readonly planId: string;
  readonly executionKey: string;
  readonly jobId: string;
  readonly workerId?: string;
  readonly error: string;
  readonly errorCode: string;
  readonly retriable: boolean;
  readonly attempt: number;
}

// ── Event union ────────────────────────────────────────────

export type OrchestratorEvent =
  | DiscoveryPlanScheduledEvent
  | DiscoveryJobCreatedEvent
  | DiscoveryExecutionStartedEvent
  | DiscoveryExecutionCompletedEvent
  | DiscoveryExecutionFailedEvent;

export interface OrchestratorEventBase extends Omit<DomainEvent, "eventType"> {
  readonly eventType: OrchestratorEventType;
}

export interface DiscoveryPlanScheduledEvent extends OrchestratorEventBase {
  readonly eventType: (typeof ORCHESTRATOR_EVENT_TYPES)[0];
  readonly aggregateType: "DiscoveryPlan";
  readonly payload: DiscoveryPlanScheduledPayload;
}
export interface DiscoveryJobCreatedEvent extends OrchestratorEventBase {
  readonly eventType: (typeof ORCHESTRATOR_EVENT_TYPES)[1];
  readonly aggregateType: "DiscoveryPlan";
  readonly payload: DiscoveryJobCreatedPayload;
}
export interface DiscoveryExecutionStartedEvent extends OrchestratorEventBase {
  readonly eventType: (typeof ORCHESTRATOR_EVENT_TYPES)[2];
  readonly aggregateType: "DiscoveryJob";
  readonly payload: DiscoveryExecutionStartedPayload;
}
export interface DiscoveryExecutionCompletedEvent extends OrchestratorEventBase {
  readonly eventType: (typeof ORCHESTRATOR_EVENT_TYPES)[3];
  readonly aggregateType: "DiscoveryJob";
  readonly payload: DiscoveryExecutionCompletedPayload;
}
export interface DiscoveryExecutionFailedEvent extends OrchestratorEventBase {
  readonly eventType: (typeof ORCHESTRATOR_EVENT_TYPES)[4];
  readonly aggregateType: "DiscoveryJob";
  readonly payload: DiscoveryExecutionFailedPayload;
}

// ── Factory helpers ────────────────────────────────────────

let eventSeq = 0;
function nextEventId(): string {
  eventSeq += 1;
  return `orch_evt_${Date.now()}_${eventSeq}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Common version block injected into every payload. */
interface VersionSource {
  readonly workflowVersion: string;
  readonly plannerVersion: string;
}

function withVersions<T>(versions: VersionSource, payload: T): T & VersionedPayload {
  return {
    ...payload,
    schemaVersion: ORCHESTRATOR_SCHEMA_VERSION,
    workflowVersion: versions.workflowVersion,
    plannerVersion: versions.plannerVersion
  };
}

export function makePlanScheduledEvent(
  versions: VersionSource,
  payload: Omit<DiscoveryPlanScheduledPayload, keyof VersionedPayload>
): DiscoveryPlanScheduledEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.plan.scheduled",
    aggregateType: "DiscoveryPlan",
    aggregateId: payload.planId,
    occurredAt: new Date(),
    version: 1,
    payload: withVersions(versions, payload)
  };
}

export function makeJobCreatedEvent(
  versions: VersionSource,
  payload: Omit<DiscoveryJobCreatedPayload, keyof VersionedPayload>
): DiscoveryJobCreatedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.job.created",
    aggregateType: "DiscoveryPlan",
    aggregateId: payload.planId,
    occurredAt: new Date(),
    version: 1,
    payload: withVersions(versions, payload)
  };
}

export function makeExecutionStartedEvent(
  versions: VersionSource,
  payload: Omit<DiscoveryExecutionStartedPayload, keyof VersionedPayload>
): DiscoveryExecutionStartedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.execution.started",
    aggregateType: "DiscoveryJob",
    aggregateId: payload.jobId,
    occurredAt: new Date(),
    version: 1,
    payload: withVersions(versions, payload)
  };
}

export function makeExecutionCompletedEvent(
  versions: VersionSource,
  payload: Omit<DiscoveryExecutionCompletedPayload, keyof VersionedPayload>
): DiscoveryExecutionCompletedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.execution.completed",
    aggregateType: "DiscoveryJob",
    aggregateId: payload.jobId,
    occurredAt: new Date(),
    version: 1,
    payload: withVersions(versions, payload)
  };
}

export function makeExecutionFailedEvent(
  versions: VersionSource,
  payload: Omit<DiscoveryExecutionFailedPayload, keyof VersionedPayload>
): DiscoveryExecutionFailedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.execution.failed",
    aggregateType: "DiscoveryJob",
    aggregateId: payload.jobId,
    occurredAt: new Date(),
    version: 1,
    payload: withVersions(versions, payload)
  };
}
