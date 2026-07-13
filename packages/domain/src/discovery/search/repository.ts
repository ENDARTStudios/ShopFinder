/**
 * @workspace/domain/discovery/search/repository
 *
 * In-memory SearchIndexRepository with basic text search.
 * Production would use PostgreSQL FTS, Elasticsearch, Meilisearch, etc.
 */
import type {
  SearchIndexRepository,
  SearchIndexEntry,
  SearchIndexEntryId,
  CatalogEntryId,
  SearchQuery,
  SearchResult
} from "./types";

class InMemorySearchIndexRepository implements SearchIndexRepository {
  private readonly byId = new Map<string, SearchIndexEntry>();
  private readonly byCatalogEntryId = new Map<string, SearchIndexEntry>();

  async upsert(entry: SearchIndexEntry): Promise<SearchIndexEntry> {
    this.byId.set(entry.id, entry);
    this.byCatalogEntryId.set(entry.catalogEntryId, entry);
    return entry;
  }

  async remove(catalogEntryId: CatalogEntryId): Promise<boolean> {
    const entry = this.byCatalogEntryId.get(catalogEntryId);
    if (!entry) return false;
    this.byId.delete(entry.id);
    this.byCatalogEntryId.delete(catalogEntryId);
    return true;
  }

  async findById(id: SearchIndexEntryId): Promise<SearchIndexEntry | null> {
    return this.byId.get(id) ?? null;
  }

  async findByCatalogEntryId(catalogEntryId: CatalogEntryId): Promise<SearchIndexEntry | null> {
    return this.byCatalogEntryId.get(catalogEntryId) ?? null;
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const start = Date.now();
    const limit = query.limit ?? 20;
    let results = [...this.byId.values()];

    // Text search (simple substring match)
    if (query.text) {
      const text = query.text.toLowerCase();
      results = results.filter(
        (e) =>
          e.title.toLowerCase().includes(text) ||
          e.description.toLowerCase().includes(text) ||
          e.brand.toLowerCase().includes(text) ||
          e.keywords.some((k) => k.toLowerCase().includes(text))
      );
    }

    // Brand filter
    if (query.brand) {
      results = results.filter((e) => e.brand.toLowerCase() === query.brand!.toLowerCase());
    }

    // Category filter
    if (query.category) {
      results = results.filter((e) => e.category.toLowerCase() === query.category!.toLowerCase());
    }

    // Price filters
    if (query.minPrice !== undefined) {
      results = results.filter((e) => e.priceRange.min >= query.minPrice!);
    }
    if (query.maxPrice !== undefined) {
      results = results.filter((e) => e.priceRange.max <= query.maxPrice!);
    }

    // Score filter
    if (query.minScore !== undefined) {
      results = results.filter((e) => e.overallScore >= query.minScore!);
    }

    // Sort by score descending
    results.sort((a, b) => b.overallScore - a.overallScore);

    const total = results.length;
    const paginated = results.slice(0, limit);

    return {
      entries: paginated,
      total,
      durationMs: Date.now() - start
    };
  }

  get entryCount(): number {
    return this.byId.size;
  }

  clear(): void {
    this.byId.clear();
    this.byCatalogEntryId.clear();
  }
}

export function createSearchIndexRepository(): SearchIndexRepository {
  return new InMemorySearchIndexRepository();
}
