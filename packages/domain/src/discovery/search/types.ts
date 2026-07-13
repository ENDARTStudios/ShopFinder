/**
 * @workspace/domain/discovery/search/types
 *
 * Type contracts for Search Index (A2.11).
 *
 * Design principle (per architectural review):
 *   Search Indexer consumes CatalogPublished EVENTS, never directly
 *   from the Publisher. This keeps Search totally independent.
 *
 * The indexer listens to events and builds a search-optimized index.
 * Different indexers can target different backends (Postgres FTS,
 * Elasticsearch, Meilisearch, Typesense) without touching the catalog.
 */
import type { BrandedId } from "../../shared";
import type { CatalogEntry, CatalogEntryId } from "../catalog/types";

// ── Branded IDs ────────────────────────────────────────────

export type SearchIndexEntryId = BrandedId<"SearchIndexEntryId">;

// ── SearchIndexEntry ───────────────────────────────────────

export interface SearchIndexEntry {
  readonly id: SearchIndexEntryId;
  readonly catalogEntryId: CatalogEntryId;
  readonly sku: string;
  readonly slug: string;
  readonly title: string;
  readonly brand: string;
  readonly category: string;
  readonly description: string;
  readonly keywords: ReadonlyArray<string>;
  readonly attributes: ReadonlyArray<{ name: string; value: string }>;
  readonly priceRange: { min: number; max: number; currency: string };
  readonly overallScore: number;
  readonly recommendation: string;
  readonly supplierCount: number;
  readonly indexedAt: Date;
  readonly schemaVersion: "1.0.0";
}

// ── SearchIndexer ──────────────────────────────────────────

export interface SearchIndexer {
  readonly name: string;
  readonly version: string;
  index(entry: CatalogEntry): Promise<SearchIndexEntry>;
  remove(catalogEntryId: CatalogEntryId): Promise<boolean>;
  search(query: SearchQuery): Promise<SearchResult>;
}

export interface SearchQuery {
  readonly text?: string;
  readonly brand?: string;
  readonly category?: string;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly minScore?: number;
  readonly limit?: number;
}

export interface SearchResult {
  readonly entries: ReadonlyArray<SearchIndexEntry>;
  readonly total: number;
  readonly durationMs: number;
}

// ── Repository ─────────────────────────────────────────────

export interface SearchIndexRepository {
  upsert(entry: SearchIndexEntry): Promise<SearchIndexEntry>;
  remove(catalogEntryId: CatalogEntryId): Promise<boolean>;
  findById(id: SearchIndexEntryId): Promise<SearchIndexEntry | null>;
  findByCatalogEntryId(catalogEntryId: CatalogEntryId): Promise<SearchIndexEntry | null>;
  search(query: SearchQuery): Promise<SearchResult>;
  readonly entryCount: number;
}

export type { CatalogEntry, CatalogEntryId };
