/**
 * @workspace/domain/discovery/orchestrator/events
 *
 * Five orchestrator events. The first two (Scheduled, JobCreated) are
 * emitted by the Orchestrator. The last three (Started, Completed, Failed)
 * are reserved for Workers (A2.3) — defined here so contracts are stable.
 *
 * "Intent" vs "consummated":
 *   Scheduled/JobCreated = intent (orchestrator decided)
 *   Started/Completed/Failed = consummated (workers acted)
 */
import type { DomainEvent } from "../../shared";

// ── Event types ────────────────────────────────────────────

export const ORCHESTRATOR_EVENT_TYPES = [
  "discovery.plan.scheduled",
  "discovery.job.created",
  "discovery.execution.started",
  "discovery.execution.completed",
  "discovery.execution.failed"
] as const;

export type OrchestratorEventType = (typeof ORCHESTRATOR_EVENT_TYPES)[number];

// ── Event payloads ─────────────────────────────────────────

export interface DiscoveryPlanScheduledPayload {
  readonly planId: string;
  readonly planHash: string;
  readonly executionKey: string;
  readonly storeId: string;
  readonly workflowVersion: string;
  readonly providerManifestVersion: string;
  readonly jobCount: number;
  readonly apiCallsReserved: number;
}

export interface DiscoveryJobCreatedPayload {
  readonly planId: string;
  readonly executionKey: string;
  readonly jobId: string;
  readonly jobType: string;
  readonly providerCode: string;
  readonly region: string;
  readonly priority: number;
}

export interface DiscoveryExecutionStartedPayload {
  readonly planId: string;
  readonly executionKey: string;
  readonly jobId: string;
  readonly workerId: string;
  readonly startedAt: string; // ISO
}

export interface DiscoveryExecutionCompletedPayload {
  readonly planId: string;
  readonly executionKey: string;
  readonly jobId: string;
  readonly workerId: string;
  readonly productsDiscovered: number;
  readonly productsNormalized: number;
  readonly durationMs: number;
}

export interface DiscoveryExecutionFailedPayload {
  readonly planId: string;
  readonly executionKey: string;
  readonly jobId: string;
  readonly workerId?: string;
  readonly error: string;
  readonly retriable: boolean;
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

export function makePlanScheduledEvent(
  payload: DiscoveryPlanScheduledPayload
): DiscoveryPlanScheduledEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.plan.scheduled",
    aggregateType: "DiscoveryPlan",
    aggregateId: payload.planId,
    occurredAt: new Date(),
    version: 1,
    payload
  };
}

export function makeJobCreatedEvent(payload: DiscoveryJobCreatedPayload): DiscoveryJobCreatedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.job.created",
    aggregateType: "DiscoveryPlan",
    aggregateId: payload.planId,
    occurredAt: new Date(),
    version: 1,
    payload
  };
}

export function makeExecutionStartedEvent(
  payload: DiscoveryExecutionStartedPayload
): DiscoveryExecutionStartedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.execution.started",
    aggregateType: "DiscoveryJob",
    aggregateId: payload.jobId,
    occurredAt: new Date(),
    version: 1,
    payload
  };
}

export function makeExecutionCompletedEvent(
  payload: DiscoveryExecutionCompletedPayload
): DiscoveryExecutionCompletedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.execution.completed",
    aggregateType: "DiscoveryJob",
    aggregateId: payload.jobId,
    occurredAt: new Date(),
    version: 1,
    payload
  };
}

export function makeExecutionFailedEvent(
  payload: DiscoveryExecutionFailedPayload
): DiscoveryExecutionFailedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.execution.failed",
    aggregateType: "DiscoveryJob",
    aggregateId: payload.jobId,
    occurredAt: new Date(),
    version: 1,
    payload
  };
}
