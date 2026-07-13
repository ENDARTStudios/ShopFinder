/**
 * @workspace/domain/discovery/workers/events
 *
 * Worker-side event factories. The event types themselves live in
 * orchestrator/events.ts (defined as the "consummation" events);
 * workers just need factories that inject worker-specific data.
 */
import {
  makeExecutionStartedEvent,
  makeExecutionCompletedEvent,
  makeExecutionFailedEvent
} from "../orchestrator/events";
import type { VersionedPayload } from "../orchestrator/events";
import type { WorkerEvent } from "./types";

interface WorkerVersions {
  readonly workflowVersion: string;
  readonly plannerVersion: string;
}

export function emitExecutionStarted(
  versions: WorkerVersions,
  payload: Omit<
    Extract<WorkerEvent, { eventType: "discovery.execution.started" }>["payload"],
    keyof VersionedPayload
  >
): WorkerEvent {
  return makeExecutionStartedEvent(versions, payload);
}

export function emitExecutionCompleted(
  versions: WorkerVersions,
  payload: Omit<
    Extract<WorkerEvent, { eventType: "discovery.execution.completed" }>["payload"],
    keyof VersionedPayload
  >
): WorkerEvent {
  return makeExecutionCompletedEvent(versions, payload);
}

export function emitExecutionFailed(
  versions: WorkerVersions,
  payload: Omit<
    Extract<WorkerEvent, { eventType: "discovery.execution.failed" }>["payload"],
    keyof VersionedPayload
  >
): WorkerEvent {
  return makeExecutionFailedEvent(versions, payload);
}
