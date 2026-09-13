/**
 * @workspace/domain/discovery/compliance/events
 *
 * Events for Compliance PostCheck (A2.9).
 */
import type { DomainEvent } from "../../shared";

export const COMPLIANCE_EVENT_TYPES = [
  "discovery.compliance.post_check_completed",
  "discovery.compliance.approved",
  "discovery.compliance.rejected",
  "discovery.compliance.requires_review"
] as const;

export type ComplianceEventType = (typeof COMPLIANCE_EVENT_TYPES)[number];

export interface ComplianceVersionedPayload {
  readonly schemaVersion: "1.0.0";
  readonly rulesVersion: string;
}

export interface CompliancePostCheckCompletedPayload extends ComplianceVersionedPayload {
  readonly checkId: string;
  readonly canonicalProductId: string;
  readonly evaluationId: string;
  readonly status: string;
  readonly rulesPassed: number;
  readonly rulesFailed: number;
}

export interface ComplianceApprovedPayload extends ComplianceVersionedPayload {
  readonly checkId: string;
  readonly canonicalProductId: string;
  readonly evaluationId: string;
  readonly decision: string;
}

export interface ComplianceRejectedPayload extends ComplianceVersionedPayload {
  readonly checkId: string;
  readonly canonicalProductId: string;
  readonly reason: string;
  readonly failedRules: ReadonlyArray<string>;
}

export interface ComplianceRequiresReviewPayload extends ComplianceVersionedPayload {
  readonly checkId: string;
  readonly canonicalProductId: string;
  readonly warnings: ReadonlyArray<string>;
}

export type ComplianceEvent =
  | CompliancePostCheckCompletedEvent
  | ComplianceApprovedEvent
  | ComplianceRejectedEvent
  | ComplianceRequiresReviewEvent;

export interface ComplianceEventBase extends Omit<DomainEvent, "eventType"> {
  readonly eventType: ComplianceEventType;
}

export interface CompliancePostCheckCompletedEvent extends ComplianceEventBase {
  readonly eventType: (typeof COMPLIANCE_EVENT_TYPES)[0];
  readonly aggregateType: "ComplianceCheck";
  readonly payload: CompliancePostCheckCompletedPayload;
}
export interface ComplianceApprovedEvent extends ComplianceEventBase {
  readonly eventType: (typeof COMPLIANCE_EVENT_TYPES)[1];
  readonly aggregateType: "CanonicalProduct";
  readonly payload: ComplianceApprovedPayload;
}
export interface ComplianceRejectedEvent extends ComplianceEventBase {
  readonly eventType: (typeof COMPLIANCE_EVENT_TYPES)[2];
  readonly aggregateType: "CanonicalProduct";
  readonly payload: ComplianceRejectedPayload;
}
export interface ComplianceRequiresReviewEvent extends ComplianceEventBase {
  readonly eventType: (typeof COMPLIANCE_EVENT_TYPES)[3];
  readonly aggregateType: "CanonicalProduct";
  readonly payload: ComplianceRequiresReviewPayload;
}

let _seq = 0;
function nextEventId(): string {
  _seq += 1;
  return `comp_evt_${Date.now()}_${_seq}_${Math.random().toString(36).slice(2, 6)}`;
}

export function makeCompliancePostCheckCompletedEvent(
  versions: { rulesVersion: string },
  payload: Omit<CompliancePostCheckCompletedPayload, keyof ComplianceVersionedPayload>
): CompliancePostCheckCompletedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.compliance.post_check_completed",
    aggregateType: "ComplianceCheck",
    aggregateId: payload.checkId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeComplianceApprovedEvent(
  versions: { rulesVersion: string },
  payload: Omit<ComplianceApprovedPayload, keyof ComplianceVersionedPayload>
): ComplianceApprovedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.compliance.approved",
    aggregateType: "CanonicalProduct",
    aggregateId: payload.canonicalProductId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeComplianceRejectedEvent(
  versions: { rulesVersion: string },
  payload: Omit<ComplianceRejectedPayload, keyof ComplianceVersionedPayload>
): ComplianceRejectedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.compliance.rejected",
    aggregateType: "CanonicalProduct",
    aggregateId: payload.canonicalProductId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeComplianceRequiresReviewEvent(
  versions: { rulesVersion: string },
  payload: Omit<ComplianceRequiresReviewPayload, keyof ComplianceVersionedPayload>
): ComplianceRequiresReviewEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.compliance.requires_review",
    aggregateType: "CanonicalProduct",
    aggregateId: payload.canonicalProductId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}
