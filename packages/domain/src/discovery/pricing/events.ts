/**
 * @workspace/domain/discovery/pricing/events
 */
import type { DomainEvent } from "../../shared";

export const PRICING_EVENT_TYPES = [
  "discovery.pricing.snapshot_captured",
  "discovery.pricing.decision_made"
] as const;

export type PricingEventType = (typeof PRICING_EVENT_TYPES)[number];

export interface PricingVersionedPayload {
  readonly schemaVersion: "1.0.0";
}

export interface PricingSnapshotCapturedPayload extends PricingVersionedPayload {
  readonly snapshotId: string;
  readonly catalogEntryId: string;
  readonly basePrice: { amount: number; currency: string };
  readonly competitorCount: number;
}

export interface PriceDecisionMadePayload extends PricingVersionedPayload {
  readonly decisionId: string;
  readonly snapshotId: string;
  readonly catalogEntryId: string;
  readonly finalPrice: { amount: number; currency: string };
  readonly decisionType: string;
  readonly marginPercent: number;
  readonly policyId: string;
}

export type PricingEvent = PricingSnapshotCapturedEvent | PriceDecisionMadeEvent;

export interface PricingEventBase extends Omit<DomainEvent, "eventType"> {
  readonly eventType: PricingEventType;
}

export interface PricingSnapshotCapturedEvent extends PricingEventBase {
  readonly eventType: (typeof PRICING_EVENT_TYPES)[0];
  readonly aggregateType: "PricingSnapshot";
  readonly payload: PricingSnapshotCapturedPayload;
}
export interface PriceDecisionMadeEvent extends PricingEventBase {
  readonly eventType: (typeof PRICING_EVENT_TYPES)[1];
  readonly aggregateType: "PriceDecision";
  readonly payload: PriceDecisionMadePayload;
}

let _seq = 0;
function nextEventId(): string {
  _seq += 1;
  return `price_evt_${Date.now()}_${_seq}_${Math.random().toString(36).slice(2, 6)}`;
}

export function makePricingSnapshotCapturedEvent(
  payload: Omit<PricingSnapshotCapturedPayload, keyof PricingVersionedPayload>
): PricingSnapshotCapturedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.pricing.snapshot_captured",
    aggregateType: "PricingSnapshot",
    aggregateId: payload.snapshotId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0" }
  };
}

export function makePriceDecisionMadeEvent(
  payload: Omit<PriceDecisionMadePayload, keyof PricingVersionedPayload>
): PriceDecisionMadeEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.pricing.decision_made",
    aggregateType: "PriceDecision",
    aggregateId: payload.decisionId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0" }
  };
}
