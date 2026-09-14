/**
 * @workspace/database/cache — Cache repository interface (placeholder for Redis)
 *
 * Per Rec 9 of 04B.2 feedback: define the interface now so repositories
 * can be wrapped with caching later without changing their API.
 *
 * Pattern:
 *   ProductRepository (concrete) → Cache wrapper → Database
 *
 * In production, wrap repositories with CachedProductRepository etc.
 * that checks the cache first, falls back to the DB, and writes through.
 */

export interface CacheRepository {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
  /** Atomic increment (for counters, rate limits). */
  increment(key: string, by?: number): Promise<number>;
}

/**
 * No-op cache implementation (dev default).
 * Returns null for all reads — always hits the database.
 */
export class NoopCacheRepository implements CacheRepository {
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }
  async set<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {
    // no-op
  }
  async delete(_key: string): Promise<void> {
    // no-op
  }
  async deletePattern(_pattern: string): Promise<void> {
    // no-op
  }
  async increment(_key: string, _by?: number): Promise<number> {
    return 0;
  }
}

/**
 * Cache key builder — ensures consistent key naming.
 */
export const CacheKeys = {
  product: (id: string) => `product:${id}`,
  productBySlug: (slug: string) => `product:slug:${slug}`,
  productBySku: (sku: string) => `product:sku:${sku}`,
  productOffers: (productId: string) => `product:${productId}:offers`,
  category: (id: string) => `category:${id}`,
  categoryTree: (storeId: string) => `store:${storeId}:category-tree`,
  customer: (id: string) => `customer:${id}`,
  cart: (customerId: string) => `cart:customer:${customerId}`,
  cartBySession: (sessionId: string) => `cart:session:${sessionId}`,
  order: (id: string) => `order:${id}`,
  orderByNumber: (number: string) => `order:number:${number}`
} as const;
