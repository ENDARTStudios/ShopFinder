/**
 * @workspace/infrastructure/connectors/manufacturers/common/cache
 *
 * In-memory TTL cache for manufacturer sources.
 *
 * Keyed by (provider, mpn). Manufacturer data is slow-moving (specs rarely
 * change), so the default TTL is 24 hours. The cache is shared across
 * all manufacturer connectors via the EnrichmentCoordinator.
 *
 * For production, swap InMemoryManufacturerCache with a Redis-backed
 * implementation — the interface is the same.
 */
import type { ManufacturerCache } from "./types";
import type {
  ManufacturerProvider,
  ManufacturerSource
} from "./types";

interface CacheEntry {
  readonly source: ManufacturerSource;
  readonly expiresAt: number; // epoch ms
}

export class InMemoryManufacturerCache implements ManufacturerCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs: number = 24 * 60 * 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  private key(provider: ManufacturerProvider, mpn: string): string {
    return `${provider}:${mpn.toLowerCase()}`;
  }

  async get(
    provider: ManufacturerProvider,
    mpn: string
  ): Promise<ManufacturerSource | null> {
    const k = this.key(provider, mpn);
    const entry = this.entries.get(k);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(k);
      return null;
    }
    return entry.source;
  }

  async set(
    provider: ManufacturerProvider,
    mpn: string,
    source: ManufacturerSource
  ): Promise<void> {
    const k = this.key(provider, mpn);
    this.entries.set(k, {
      source,
      expiresAt: Date.now() + this.defaultTtlMs
    });
  }

  async delete(provider: ManufacturerProvider, mpn: string): Promise<void> {
    this.entries.delete(this.key(provider, mpn));
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  /**
   * Evict expired entries. Called periodically by the coordinator.
   */
  evictExpired(): number {
    let evicted = 0;
    const now = Date.now();
    for (const [k, entry] of this.entries) {
      if (now > entry.expiresAt) {
        this.entries.delete(k);
        evicted++;
      }
    }
    return evicted;
  }
}

export function createManufacturerCache(ttlMs?: number): ManufacturerCache {
  return new InMemoryManufacturerCache(ttlMs);
}
