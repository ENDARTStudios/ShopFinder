/**
 * @workspace/domain/discovery/catalog/repository
 */
import type {
  CatalogRepository,
  CatalogEntry,
  CatalogPublication,
  CatalogEntryId,
  CanonicalProductId,
  CatalogStreamFilter
} from "./types";

class InMemoryCatalogRepository implements CatalogRepository {
  private readonly entriesById = new Map<string, CatalogEntry>();
  private readonly entriesByCanonicalProductId = new Map<string, CatalogEntry>();
  private readonly entriesBySku = new Map<string, CatalogEntry>();
  private readonly entriesBySlug = new Map<string, CatalogEntry>();
  private readonly publications: CatalogPublication[] = [];

  async appendEntry(entry: CatalogEntry): Promise<CatalogEntry> {
    if (this.entriesById.has(entry.id)) return this.entriesById.get(entry.id)!;
    this.entriesById.set(entry.id, entry);
    this.entriesByCanonicalProductId.set(entry.canonicalProductId, entry);
    this.entriesBySku.set(entry.sku, entry);
    this.entriesBySlug.set(entry.slug, entry);
    return entry;
  }

  async appendPublication(publication: CatalogPublication): Promise<CatalogPublication> {
    this.publications.push(publication);
    return publication;
  }

  async findEntry(id: CatalogEntryId): Promise<CatalogEntry | null> {
    return this.entriesById.get(id) ?? null;
  }

  async findEntryByCanonicalProductId(productId: CanonicalProductId): Promise<CatalogEntry | null> {
    return this.entriesByCanonicalProductId.get(productId) ?? null;
  }

  async findEntryBySku(sku: string): Promise<CatalogEntry | null> {
    return this.entriesBySku.get(sku) ?? null;
  }

  async findEntryBySlug(slug: string): Promise<CatalogEntry | null> {
    return this.entriesBySlug.get(slug) ?? null;
  }

  async *streamEntries(filter?: CatalogStreamFilter): AsyncIterable<CatalogEntry> {
    for (const e of this.entriesById.values()) {
      if (filter?.brand && e.brand !== filter.brand) continue;
      if (filter?.category && e.category !== filter.category) continue;
      yield e;
    }
  }

  get entryCount(): number {
    return this.entriesById.size;
  }
  get publicationCount(): number {
    return this.publications.length;
  }
}

export function createCatalogRepository(): CatalogRepository {
  return new InMemoryCatalogRepository();
}
