/**
 * @workspace/domain/discovery/monitoring/events
 */
import type { DomainEvent } from "../../shared";

export const MONITORING_EVENT_TYPES = [
  "discovery.monitoring.stage_metrics_recorded",
  "discovery.monitoring.business_metrics_snapshot"
] as const;

export type MonitoringEventType = (typeof MONITORING_EVENT_TYPES)[number];

export interface MonitoringVersionedPayload {
  readonly schemaVersion: "1.0.0";
}

export interface StageMetricsRecordedPayload extends MonitoringVersionedPayload {
  readonly stage: string;
  readonly batchId: string;
  readonly itemsProcessed: number;
  readonly itemsSucceeded: number;
  readonly itemsFailed: number;
  readonly durationMs: number;
  readonly throughput: number;
  readonly errorRate: number;
}

export interface BusinessMetricsSnapshotPayload extends MonitoringVersionedPayload {
  readonly snapshotId: string;
  readonly pipelineHealth: string;
  readonly metricCount: number;
  readonly totalItems: number;
  readonly totalErrors: number;
  readonly overallErrorRate: number;
}

export type MonitoringEvent = StageMetricsRecordedEvent | BusinessMetricsSnapshotEvent;

export interface MonitoringEventBase extends Omit<DomainEvent, "eventType"> {
  readonly eventType: MonitoringEventType;
}

export interface StageMetricsRecordedEvent extends MonitoringEventBase {
  readonly eventType: (typeof MONITORING_EVENT_TYPES)[0];
  readonly aggregateType: "StageMetrics";
  readonly payload: StageMetricsRecordedPayload;
}

export interface BusinessMetricsSnapshotEvent extends MonitoringEventBase {
  readonly eventType: (typeof MONITORING_EVENT_TYPES)[1];
  readonly aggregateType: "BusinessMetricsSnapshot";
  readonly payload: BusinessMetricsSnapshotPayload;
}

let _seq = 0;
function nextEventId(): string {
  _seq += 1;
  return `mon_evt_${Date.now()}_${_seq}_${Math.random().toString(36).slice(2, 6)}`;
}

export function makeStageMetricsRecordedEvent(
  payload: Omit<StageMetricsRecordedPayload, keyof MonitoringVersionedPayload>
): StageMetricsRecordedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.monitoring.stage_metrics_recorded",
    aggregateType: "StageMetrics",
    aggregateId: `${payload.stage}_${payload.batchId}`,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0" }
  };
}

export function makeBusinessMetricsSnapshotEvent(
  payload: Omit<BusinessMetricsSnapshotPayload, keyof MonitoringVersionedPayload>
): BusinessMetricsSnapshotEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.monitoring.business_metrics_snapshot",
    aggregateType: "BusinessMetricsSnapshot",
    aggregateId: payload.snapshotId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0" }
  };
}
