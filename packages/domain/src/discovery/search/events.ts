/**
 * @workspace/domain/discovery/search/events
 *
 * Events for Search Index (A2.11).
 */
import type { DomainEvent } from "../../shared";

export const SEARCH_EVENT_TYPES = [
  "discovery.search.index_updated",
  "discovery.search.index_removed"
] as const;

export type SearchEventType = (typeof SEARCH_EVENT_TYPES)[number];

export interface SearchVersionedPayload {
  readonly schemaVersion: "1.0.0";
  readonly indexerVersion: string;
}

export interface SearchIndexUpdatedPayload extends SearchVersionedPayload {
  readonly searchIndexEntryId: string;
  readonly catalogEntryId: string;
  readonly sku: string;
  readonly title: string;
  readonly indexedAt: string;
}

export interface SearchIndexRemovedPayload extends SearchVersionedPayload {
  readonly catalogEntryId: string;
}

export type SearchEvent = SearchIndexUpdatedEvent | SearchIndexRemovedEvent;

export interface SearchEventBase extends Omit<DomainEvent, "eventType"> {
  readonly eventType: SearchEventType;
}

export interface SearchIndexUpdatedEvent extends SearchEventBase {
  readonly eventType: (typeof SEARCH_EVENT_TYPES)[0];
  readonly aggregateType: "SearchIndexEntry";
  readonly payload: SearchIndexUpdatedPayload;
}

export interface SearchIndexRemovedEvent extends SearchEventBase {
  readonly eventType: (typeof SEARCH_EVENT_TYPES)[1];
  readonly aggregateType: "SearchIndexEntry";
  readonly payload: SearchIndexRemovedPayload;
}

let _seq = 0;
function nextEventId(): string {
  _seq += 1;
  return `sidx_evt_${Date.now()}_${_seq}_${Math.random().toString(36).slice(2, 6)}`;
}

export function makeSearchIndexUpdatedEvent(
  versions: { indexerVersion: string },
  payload: Omit<SearchIndexUpdatedPayload, keyof SearchVersionedPayload>
): SearchIndexUpdatedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.search.index_updated",
    aggregateType: "SearchIndexEntry",
    aggregateId: payload.catalogEntryId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeSearchIndexRemovedEvent(
  versions: { indexerVersion: string },
  payload: Omit<SearchIndexRemovedPayload, keyof SearchVersionedPayload>
): SearchIndexRemovedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.search.index_removed",
    aggregateType: "SearchIndexEntry",
    aggregateId: payload.catalogEntryId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}
