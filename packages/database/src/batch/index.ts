/**
 * @workspace/database/batch — Batch Loader
 *
 * Per Rec 10 of 04B.3 feedback: prepare batch loading for GraphQL/BFF.
 *
 * The BatchLoader collects individual load() calls within a request and
 * batches them into a single database query. This solves the N+1 problem
 * at the data-fetching layer (complementary to the include/select prevention
 * at the repository layer).
 *
 * Usage (e.g. in a GraphQL resolver or API handler):
 *   const productLoader = createBatchLoader(async (ids) => {
 *     const products = await productRepo.findByIds(ids);
 *     return ids.map(id => products.find(p => p.id === id) ?? null);
 *   });
 *
 *   // In parallel resolvers:
 *   const product1 = await productLoader.load("id1");
 *   const product2 = await productLoader.load("id2");
 *   // → single DB query: SELECT * FROM products WHERE id IN ('id1', 'id2')
 */

export interface BatchLoader<K, V> {
  load(key: K): Promise<V | null>;
  loadMany(keys: ReadonlyArray<K>): Promise<Array<V | null>>;
  clear(key: K): void;
  clearAll(): void;
  prime(key: K, value: V): void;
}

export function createBatchLoader<K, V>(
  batchFn: (keys: ReadonlyArray<K>) => Promise<Array<V | null>>,
  opts?: { maxBatchSize?: number; cache?: boolean }
): BatchLoader<K, V> {
  const maxBatchSize = opts?.maxBatchSize ?? 1000;
  const useCache = opts?.cache ?? true;

  let batch: Array<{ key: K; resolve: (v: V | null) => void; reject: (e: Error) => void }> | null =
    null;
  const cache = new Map<K, Promise<V | null>>();
  let dispatchScheduled = false;

  function dispatch() {
    const currentBatch = batch;
    batch = null;
    dispatchScheduled = false;
    if (!currentBatch || currentBatch.length === 0) return;

    const keys = currentBatch.map((b) => b.key);
    const uniqueKeys = [...new Set(keys)];

    // Split into chunks if exceeds maxBatchSize
    const chunks: K[][] = [];
    for (let i = 0; i < uniqueKeys.length; i += maxBatchSize) {
      chunks.push(uniqueKeys.slice(i, i + maxBatchSize));
    }

    Promise.all(chunks.map((chunk) => batchFn(chunk)))
      .then((results) => {
        const merged = results.flat();
        const resultMap = new Map<K, V | null>();
        uniqueKeys.forEach((key, i) => resultMap.set(key, merged[i] ?? null));

        for (const item of currentBatch) {
          const value = resultMap.get(item.key) ?? null;
          item.resolve(value);
        }
      })
      .catch((error) => {
        for (const item of currentBatch) {
          item.reject(error as Error);
        }
      });
  }

  function scheduleDispatch() {
    if (!dispatchScheduled) {
      dispatchScheduled = true;
      // Use process.nextTick or microtask to collect all parallel load() calls
      Promise.resolve().then(dispatch);
    }
  }

  return {
    load(key: K): Promise<V | null> {
      if (useCache && cache.has(key)) {
        return cache.get(key)!;
      }

      const promise = new Promise<V | null>((resolve, reject) => {
        if (!batch) batch = [];
        batch.push({ key, resolve, reject });
        scheduleDispatch();
      });

      if (useCache) {
        cache.set(key, promise);
        promise.catch(() => cache.delete(key));
      }

      return promise;
    },

    loadMany(keys: ReadonlyArray<K>): Promise<Array<V | null>> {
      return Promise.all(keys.map((k) => this.load(k)));
    },

    clear(key: K): void {
      cache.delete(key);
    },

    clearAll(): void {
      cache.clear();
    },

    prime(key: K, value: V): void {
      if (!cache.has(key)) {
        cache.set(key, Promise.resolve(value));
      }
    }
  };
}

// ── Pre-built batch loaders for common entities ─────────────

export interface BatchLoaderFactory {
  productLoader(): BatchLoader<string, import("@workspace/domain/catalog").Product>;
  customerLoader(): BatchLoader<string, import("@workspace/domain/customer").Customer>;
  orderLoader(): BatchLoader<string, import("@workspace/domain/order").Order>;
  supplierLoader(): BatchLoader<string, import("@workspace/domain/supplier").Supplier>;
  variantLoader(): BatchLoader<string, import("@workspace/domain/catalog").Variant>;
}
