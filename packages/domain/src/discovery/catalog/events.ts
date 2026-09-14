/**
 * @workspace/domain/discovery/catalog/events
 *
 * Events for Catalog Materializer + Publisher (A2.10).
 *
 * A2.11 Search Indexer consumes CatalogPublished (NOT directly from Publisher).
 */
import type { DomainEvent } from "../../shared";

export const CATALOG_EVENT_TYPES = [
  "discovery.catalog.entry_created",
  "discovery.catalog.published",
  "discovery.catalog.publication_failed"
] as const;

export type CatalogEventType = (typeof CATALOG_EVENT_TYPES)[number];

export interface CatalogVersionedPayload {
  readonly schemaVersion: "1.0.0";
  readonly materializerVersion: string;
}

export interface CatalogEntryCreatedPayload extends CatalogVersionedPayload {
  readonly catalogEntryId: string;
  readonly canonicalProductId: string;
  readonly sku: string;
  readonly slug: string;
  readonly title: string;
  readonly brand: string;
  readonly variantCount: number;
  readonly imageCount: number;
}

export interface CatalogPublishedPayload extends CatalogVersionedPayload {
  readonly catalogEntryId: string;
  readonly canonicalProductId: string;
  readonly sku: string;
  readonly destination: string;
  readonly externalId: string;
  readonly publishedAt: string;
}

export interface CatalogPublicationFailedPayload extends CatalogVersionedPayload {
  readonly catalogEntryId: string;
  readonly destination: string;
  readonly error: string;
}

export type CatalogEvent =
  CatalogEntryCreatedEvent | CatalogPublishedEvent | CatalogPublicationFailedEvent;

export interface CatalogEventBase extends Omit<DomainEvent, "eventType"> {
  readonly eventType: CatalogEventType;
}

export interface CatalogEntryCreatedEvent extends CatalogEventBase {
  readonly eventType: (typeof CATALOG_EVENT_TYPES)[0];
  readonly aggregateType: "CatalogEntry";
  readonly payload: CatalogEntryCreatedPayload;
}
export interface CatalogPublishedEvent extends CatalogEventBase {
  readonly eventType: (typeof CATALOG_EVENT_TYPES)[1];
  readonly aggregateType: "CatalogEntry";
  readonly payload: CatalogPublishedPayload;
}
export interface CatalogPublicationFailedEvent extends CatalogEventBase {
  readonly eventType: (typeof CATALOG_EVENT_TYPES)[2];
  readonly aggregateType: "CatalogEntry";
  readonly payload: CatalogPublicationFailedPayload;
}

let _seq = 0;
function nextEventId(): string {
  _seq += 1;
  return `cat_evt_${Date.now()}_${_seq}_${Math.random().toString(36).slice(2, 6)}`;
}

export function makeCatalogEntryCreatedEvent(
  versions: { materializerVersion: string },
  payload: Omit<CatalogEntryCreatedPayload, keyof CatalogVersionedPayload>
): CatalogEntryCreatedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.catalog.entry_created",
    aggregateType: "CatalogEntry",
    aggregateId: payload.catalogEntryId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeCatalogPublishedEvent(
  versions: { materializerVersion: string },
  payload: Omit<CatalogPublishedPayload, keyof CatalogVersionedPayload>
): CatalogPublishedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.catalog.published",
    aggregateType: "CatalogEntry",
    aggregateId: payload.catalogEntryId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeCatalogPublicationFailedEvent(
  versions: { materializerVersion: string },
  payload: Omit<CatalogPublicationFailedPayload, keyof CatalogVersionedPayload>
): CatalogPublicationFailedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.catalog.publication_failed",
    aggregateType: "CatalogEntry",
    aggregateId: payload.catalogEntryId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}
