/**
 * @workspace/domain/discovery/normalizer/repository
 *
 * In-memory NormalizedProductRepository. Append-only like the Raw Store.
 *
 * Indexed by:
 *   - id (primary)
 *   - rawProductId (reverse lookup: which normalizations came from this raw?)
 *   - semanticHash (for A2.7 Similarity/Dedup lookup)
 */
import type {
  NormalizedProductRepository,
  NormalizedProductRecord,
  NormalizedProductRecordId,
  NormalizedStreamFilter
} from "./types";

class InMemoryNormalizedProductRepository implements NormalizedProductRepository {
  private readonly byId = new Map<string, NormalizedProductRecord>();
  private readonly byRawProductId = new Map<string, NormalizedProductRecord[]>();
  private readonly bySemanticHash = new Map<string, NormalizedProductRecord[]>();

  async append(record: NormalizedProductRecord): Promise<NormalizedProductRecord> {
    // Idempotent: same id → no-op
    if (this.byId.has(record.id)) return this.byId.get(record.id)!;
    this.byId.set(record.id, record);

    const rawList = this.byRawProductId.get(record.rawProductId) ?? [];
    rawList.push(record);
    this.byRawProductId.set(record.rawProductId, rawList);

    const hashList = this.bySemanticHash.get(record.semanticFingerprint.value) ?? [];
    hashList.push(record);
    this.bySemanticHash.set(record.semanticFingerprint.value, hashList);

    return record;
  }

  async appendBatch(
    records: ReadonlyArray<NormalizedProductRecord>
  ): Promise<ReadonlyArray<NormalizedProductRecord>> {
    const result: NormalizedProductRecord[] = [];
    for (const r of records) {
      result.push(await this.append(r));
    }
    return result;
  }

  async findById(id: NormalizedProductRecordId): Promise<NormalizedProductRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async findByRawProductId(rawProductId: string): Promise<ReadonlyArray<NormalizedProductRecord>> {
    return this.byRawProductId.get(rawProductId) ?? [];
  }

  async findBySemanticHash(semanticHash: string): Promise<ReadonlyArray<NormalizedProductRecord>> {
    return this.bySemanticHash.get(semanticHash) ?? [];
  }

  async *stream(filter: NormalizedStreamFilter): AsyncIterable<NormalizedProductRecord> {
    for (const record of this.byId.values()) {
      if (filter.executionId && record.executionId !== filter.executionId) continue;
      if (filter.providerCode && record.providerCode !== filter.providerCode) continue;
      if (filter.partitionKey && record.partitionKey !== filter.partitionKey) continue;
      if (filter.since && record.normalizedAt < filter.since) continue;
      if (filter.until && record.normalizedAt > filter.until) continue;
      yield record;
    }
  }

  async count(filter: NormalizedStreamFilter): Promise<number> {
    let count = 0;
    for await (const _ of this.stream(filter)) count++;
    return count;
  }

  get recordCount(): number {
    return this.byId.size;
  }

  /** Test helper */
  clear(): void {
    this.byId.clear();
    this.byRawProductId.clear();
    this.bySemanticHash.clear();
  }
}

let _instance: InMemoryNormalizedProductRepository | null = null;

export function getNormalizedProductRepository(): NormalizedProductRepository {
  if (!_instance) _instance = new InMemoryNormalizedProductRepository();
  return _instance;
}

export function resetNormalizedProductRepository(): NormalizedProductRepository {
  _instance = new InMemoryNormalizedProductRepository();
  return _instance;
}

export function createNormalizedProductRepository(): NormalizedProductRepository {
  return new InMemoryNormalizedProductRepository();
}
