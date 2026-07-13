/**
 * @workspace/domain/discovery/evaluation/cache
 *
 * InferenceCache — avoids re-running inference when nothing changed.
 *
 * Cache key = canonicalProductVersion + modelVersion + promptVersion + schemaVersion.
 * If all four are the same, the EvaluationResult is reused without a new
 * model call.
 */
import type {
  InferenceCacheKey,
  InferenceCacheEntry,
  InferenceId,
  EvaluationId,
  CanonicalProductId
} from "./types";

export class InMemoryInferenceCache {
  private readonly entries = new Map<string, InferenceCacheEntry>();
  private readonly byProduct = new Map<CanonicalProductId, InferenceCacheEntry[]>();

  /**
   * Build a deterministic cache key from the 4 version components.
   */
  buildKey(params: {
    canonicalProductVersion: string;
    modelVersion: string;
    promptVersion: string;
    schemaVersion: string;
  }): InferenceCacheKey {
    return {
      canonicalProductVersion: params.canonicalProductVersion,
      modelVersion: params.modelVersion,
      promptVersion: params.promptVersion,
      schemaVersion: params.schemaVersion
    };
  }

  /**
   * Compute the key string for map storage.
   */
  private keyToString(key: InferenceCacheKey): string {
    return `${key.canonicalProductVersion}|${key.modelVersion}|${key.promptVersion}|${key.schemaVersion}`;
  }

  get(key: InferenceCacheKey): InferenceCacheEntry | null {
    return this.entries.get(this.keyToString(key)) ?? null;
  }

  set(
    key: InferenceCacheKey,
    inferenceId: InferenceId,
    evaluationId: EvaluationId,
    productId: CanonicalProductId
  ): InferenceCacheEntry {
    const entry: InferenceCacheEntry = {
      key,
      inferenceId,
      evaluationId,
      cachedAt: new Date()
    };
    this.entries.set(this.keyToString(key), entry);
    const list = this.byProduct.get(productId) ?? [];
    list.push(entry);
    this.byProduct.set(productId, list);
    return entry;
  }

  getByProduct(productId: CanonicalProductId): ReadonlyArray<InferenceCacheEntry> {
    return this.byProduct.get(productId) ?? [];
  }

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
    this.byProduct.clear();
  }
}

export function createInferenceCache(): InMemoryInferenceCache {
  return new InMemoryInferenceCache();
}
