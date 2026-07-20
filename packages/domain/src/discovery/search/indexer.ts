/**
 * @workspace/domain/discovery/search/indexer
 *
 * DefaultSearchIndexer — builds a search-optimized index from CatalogEntry.
 *
 * Consumes CatalogPublished events (via coordinator), NOT directly from Publisher.
 * This keeps Search totally independent from the catalog pipeline.
 *
 * Production implementations:
 *   - PostgresSearchIndexer (PostgreSQL FTS)
 *   - ElasticsearchSearchIndexer
 *   - MeilisearchSearchIndexer
 *   - TypesenseSearchIndexer
 */
import type {
  SearchIndexer,
  SearchIndexEntry,
  SearchIndexEntryId,
  SearchQuery,
  SearchResult,
  CatalogEntry,
  CatalogEntryId,
  SearchIndexRepository
} from "./types";

export class DefaultSearchIndexer implements SearchIndexer {
  readonly name = "default-search-indexer";
  readonly version = "1.0.0";

  constructor(private readonly repository: SearchIndexRepository) {}

  async index(entry: CatalogEntry): Promise<SearchIndexEntry> {
    const indexEntry: SearchIndexEntry = {
      id: `sidx_${entry.id}` as unknown as SearchIndexEntryId,
      catalogEntryId: entry.id,
      sku: entry.sku,
      slug: entry.slug,
      title: entry.title,
      brand: entry.brand,
      category: entry.category,
      description: entry.description,
      keywords: entry.seo.keywords,
      attributes: entry.attributes.map((a) => ({ name: a.name, value: a.value })),
      priceRange: {
        min: entry.pricing.minPrice.amount,
        max: entry.pricing.maxPrice.amount,
        currency: entry.pricing.currency
      },
      overallScore: entry.evaluationSummary.overallScore,
      recommendation: entry.evaluationSummary.recommendation,
      supplierCount: entry.supplierCount,
      indexedAt: new Date(),
      schemaVersion: "1.0.0"
    };

    return this.repository.upsert(indexEntry);
  }

  async remove(catalogEntryId: CatalogEntryId): Promise<boolean> {
    return this.repository.remove(catalogEntryId);
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    return this.repository.search(query);
  }
}

export function createSearchIndexer(repository: SearchIndexRepository): SearchIndexer {
  return new DefaultSearchIndexer(repository);
}
