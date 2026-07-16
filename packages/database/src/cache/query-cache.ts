/**
 * @workspace/database/cache/query-cache — Query Cache Interface
 *
 * Per Rec 8 of 04B.3 feedback: EntityCache and QueryCache are different problems.
 *   - EntityCache: cache single entities by ID (ProductRepository.findById)
 *   - QueryCache: cache query results by query signature (ProductQueryService.list)
 *
 * EntityCache invalidation: on entity update/delete.
 * QueryCache invalidation: on any write to the related table (broader).
 */

// ── Entity Cache (single entity by ID) ──────────────────────

export interface EntityCache {
  getEntity<T>(entityType: string, id: string): Promise<T | null>;
  setEntity<T>(entityType: string, id: string, value: T, ttlSeconds?: number): Promise<void>;
  invalidateEntity(entityType: string, id: string): Promise<void>;
  invalidateEntityPattern(entityType: string, pattern: string): Promise<void>;
}

// ── Query Cache (query results by signature) ────────────────

export interface QueryCache {
  getQuery<T>(querySignature: string): Promise<T | null>;
  setQuery<T>(querySignature: string, value: T, ttlSeconds?: number): Promise<void>;
  invalidateQuery(querySignature: string): Promise<void>;
  invalidateQueryPattern(pattern: string): Promise<void>;
  /**
   * Tag-based invalidation: a query can be tagged with table names,
   * and invalidation by tag invalidates all queries touching that table.
   */
  invalidateByTag(tag: string): Promise<void>;
  setQueryWithTags<T>(
    querySignature: string,
    value: T,
    tags: string[],
    ttlSeconds?: number
  ): Promise<void>;
}

// ── No-op implementations (dev default) ─────────────────────

export class NoopEntityCache implements EntityCache {
  async getEntity<T>(): Promise<T | null> {
    return null;
  }
  async setEntity<T>(): Promise<void> {}
  async invalidateEntity(): Promise<void> {}
  async invalidateEntityPattern(): Promise<void> {}
}

export class NoopQueryCache implements QueryCache {
  async getQuery<T>(): Promise<T | null> {
    return null;
  }
  async setQuery<T>(): Promise<void> {}
  async invalidateQuery(): Promise<void> {}
  async invalidateQueryPattern(): Promise<void> {}
  async invalidateByTag(): Promise<void> {}
  async setQueryWithTags<T>(): Promise<void> {}
}

// ── In-memory implementations (test/debug) ──────────────────

export class InMemoryEntityCache implements EntityCache {
  private readonly store = new Map<string, { value: unknown; expiresAt?: number }>();

  private key(entityType: string, id: string): string {
    return `${entityType}:${id}`;
  }

  async getEntity<T>(entityType: string, id: string): Promise<T | null> {
    const entry = this.store.get(this.key(entityType, id));
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(this.key(entityType, id));
      return null;
    }
    return entry.value as T;
  }

  async setEntity<T>(entityType: string, id: string, value: T, ttlSeconds?: number): Promise<void> {
    this.store.set(this.key(entityType, id), {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined
    });
  }

  async invalidateEntity(entityType: string, id: string): Promise<void> {
    this.store.delete(this.key(entityType, id));
  }

  async invalidateEntityPattern(entityType: string, pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    for (const key of this.store.keys()) {
      if (key.startsWith(`${entityType}:`) && regex.test(key)) {
        this.store.delete(key);
      }
    }
  }
}

export class InMemoryQueryCache implements QueryCache {
  private readonly store = new Map<
    string,
    { value: unknown; tags: string[]; expiresAt?: number }
  >();
  private readonly tagIndex = new Map<string, Set<string>>();

  async getQuery<T>(querySignature: string): Promise<T | null> {
    const entry = this.store.get(querySignature);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(querySignature);
      return null;
    }
    return entry.value as T;
  }

  async setQuery<T>(querySignature: string, value: T, ttlSeconds?: number): Promise<void> {
    this.store.set(querySignature, {
      value,
      tags: [],
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined
    });
  }

  async setQueryWithTags<T>(
    querySignature: string,
    value: T,
    tags: string[],
    ttlSeconds?: number
  ): Promise<void> {
    this.store.set(querySignature, {
      value,
      tags,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined
    });
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag)!.add(querySignature);
    }
  }

  async invalidateQuery(querySignature: string): Promise<void> {
    const entry = this.store.get(querySignature);
    if (entry) {
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(querySignature);
      }
    }
    this.store.delete(querySignature);
  }

  async invalidateQueryPattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        await this.invalidateQuery(key);
      }
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    const signatures = this.tagIndex.get(tag);
    if (!signatures) return;
    for (const sig of signatures) {
      this.store.delete(sig);
    }
    this.tagIndex.delete(tag);
  }
}

// ── Singletons ──────────────────────────────────────────────

let _entityCache: EntityCache | null = null;
let _queryCache: QueryCache | null = null;

export function getEntityCache(): EntityCache {
  if (!_entityCache) _entityCache = new InMemoryEntityCache();
  return _entityCache;
}

export function getQueryCache(): QueryCache {
  if (!_queryCache) _queryCache = new InMemoryQueryCache();
  return _queryCache;
}

export function setEntityCache(cache: EntityCache): void {
  _entityCache = cache;
}
export function setQueryCache(cache: QueryCache): void {
  _queryCache = cache;
}

// ── Query signature builder ─────────────────────────────────

export function buildQuerySignature(
  service: string,
  method: string,
  params: Record<string, unknown>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${k}=${JSON.stringify(params[k])}`)
    .join("&");
  return `${service}:${method}:${sortedParams}`;
}
