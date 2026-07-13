/**
 * @workspace/domain/discovery/search
 *
 * Barrel exports for Search Index (A2.11).
 *
 * Design principle: Search Indexer consumes CatalogPublished EVENTS,
 * never directly from the Publisher. This keeps Search totally independent.
 *
 * Layout:
 *   types.ts         — SearchIndexEntry, SearchIndexer, SearchQuery, SearchResult
 *   indexer.ts       — DefaultSearchIndexer (transforms CatalogEntry → SearchIndexEntry)
 *   events.ts        — 2 events (IndexUpdated/IndexRemoved)
 *   repository.ts    — In-memory SearchIndexRepository with text search
 *   coordinator.ts   — SearchIndexCoordinator (consumes events, indexes)
 */

export * from "./types";
export * from "./indexer";
export * from "./events";
export * from "./repository";
export * from "./coordinator";
