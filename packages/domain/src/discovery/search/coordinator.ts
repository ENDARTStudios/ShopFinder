/**
 * @workspace/domain/discovery/search/coordinator
 *
 * SearchIndexCoordinator — consumes CatalogPublished events and
 * indexes CatalogEntries for search.
 *
 * CRITICAL: This coordinator consumes EVENTS, not direct calls from
 * the Publisher. This keeps Search totally independent from the
 * catalog pipeline.
 */
import type { SearchIndexer } from "./types";
import type { CatalogEntry } from "../catalog/types";
import {
  makeSearchIndexUpdatedEvent,
  makeSearchIndexRemovedEvent,
  type SearchEvent
} from "./events";

export interface SearchEventPublisher {
  publish(events: ReadonlyArray<SearchEvent>): Promise<void>;
}

export interface SearchIndexCoordinatorDeps {
  readonly indexer: SearchIndexer;
  readonly events?: SearchEventPublisher;
}

export class SearchIndexCoordinator {
  constructor(private readonly deps: SearchIndexCoordinatorDeps) {}

  /**
   * Handle a CatalogPublished event by indexing the entry.
   * This is the ONLY entry point — never call from Publisher directly.
   */
  async onCatalogPublished(entry: CatalogEntry): Promise<void> {
    const indexed = await this.deps.indexer.index(entry);

    if (this.deps.events) {
      await this.deps.events.publish([
        makeSearchIndexUpdatedEvent(
          { indexerVersion: this.deps.indexer.version },
          {
            searchIndexEntryId: indexed.id,
            catalogEntryId: indexed.catalogEntryId,
            sku: indexed.sku,
            title: indexed.title,
            indexedAt: indexed.indexedAt.toISOString()
          }
        )
      ]);
    }
  }

  /**
   * Handle a catalog removal by removing from the index.
   */
  async onCatalogRemoved(catalogEntryId: import("../catalog/types").CatalogEntryId): Promise<void> {
    const removed = await this.deps.indexer.remove(catalogEntryId);

    if (this.deps.events && removed) {
      await this.deps.events.publish([
        makeSearchIndexRemovedEvent(
          { indexerVersion: this.deps.indexer.version },
          { catalogEntryId }
        )
      ]);
    }
  }
}

export function createSearchIndexCoordinator(
  deps: SearchIndexCoordinatorDeps
): SearchIndexCoordinator {
  return new SearchIndexCoordinator(deps);
}
