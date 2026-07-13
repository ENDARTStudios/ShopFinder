/**
 * @workspace/domain/discovery/marketplace-publication/events
 */
import type { DomainEvent } from "../../shared";

export const PUBLICATION_EVENT_TYPES = [
  "discovery.publication.plan_created",
  "discovery.publication.listing_published",
  "discovery.publication.listing_failed"
] as const;

export type PublicationEventType = (typeof PUBLICATION_EVENT_TYPES)[number];

export interface PublicationVersionedPayload {
  readonly schemaVersion: "1.0.0";
}

export interface PublicationPlanCreatedPayload extends PublicationVersionedPayload {
  readonly planId: string;
  readonly catalogEntryId: string;
  readonly destination: string;
  readonly listingPolicyId: string;
}

export interface ListingPublishedPayload extends PublicationVersionedPayload {
  readonly listingId: string;
  readonly planId: string;
  readonly catalogEntryId: string;
  readonly destination: string;
  readonly externalListingId: string;
  readonly listingUrl?: string;
}

export interface ListingFailedPayload extends PublicationVersionedPayload {
  readonly planId: string;
  readonly destination: string;
  readonly error: string;
}

export type PublicationEvent =
  PublicationPlanCreatedEvent | ListingPublishedEvent | ListingFailedEvent;

export interface PublicationEventBase extends Omit<DomainEvent, "eventType"> {
  readonly eventType: PublicationEventType;
}

export interface PublicationPlanCreatedEvent extends PublicationEventBase {
  readonly eventType: (typeof PUBLICATION_EVENT_TYPES)[0];
  readonly aggregateType: "PublicationPlan";
  readonly payload: PublicationPlanCreatedPayload;
}
export interface ListingPublishedEvent extends PublicationEventBase {
  readonly eventType: (typeof PUBLICATION_EVENT_TYPES)[1];
  readonly aggregateType: "MarketplaceListing";
  readonly payload: ListingPublishedPayload;
}
export interface ListingFailedEvent extends PublicationEventBase {
  readonly eventType: (typeof PUBLICATION_EVENT_TYPES)[2];
  readonly aggregateType: "PublicationPlan";
  readonly payload: ListingFailedPayload;
}

let _seq = 0;
function nextEventId(): string {
  _seq += 1;
  return `pub_evt_${Date.now()}_${_seq}_${Math.random().toString(36).slice(2, 6)}`;
}

export function makePublicationPlanCreatedEvent(
  payload: Omit<PublicationPlanCreatedPayload, keyof PublicationVersionedPayload>
): PublicationPlanCreatedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.publication.plan_created",
    aggregateType: "PublicationPlan",
    aggregateId: payload.planId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0" }
  };
}

export function makeListingPublishedEvent(
  payload: Omit<ListingPublishedPayload, keyof PublicationVersionedPayload>
): ListingPublishedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.publication.listing_published",
    aggregateType: "MarketplaceListing",
    aggregateId: payload.listingId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0" }
  };
}

export function makeListingFailedEvent(
  payload: Omit<ListingFailedPayload, keyof PublicationVersionedPayload>
): ListingFailedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.publication.listing_failed",
    aggregateType: "PublicationPlan",
    aggregateId: payload.planId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0" }
  };
}
