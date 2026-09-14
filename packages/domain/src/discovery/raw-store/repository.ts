/**
 * @workspace/domain/discovery/raw-store/repository
 *
 * In-memory RawProductRepository. Append-only — no update, no delete.
 *
 * Idempotency rules:
 *   - appendExecution: same executionId → no-op, returns existing
 *   - appendProducts: same (executionId, payloadHash) → skipped
 *
 * Production should swap in a PostgreSQL-backed implementation
 * behind the same interface. The partition key field is already
 * designed for native partitioning (provider|country|yyyy-mm-dd).
 */
import type {
  RawProductRepository,
  DiscoveryExecution,
  RawProductRecord,
  DiscoveryExecutionId,
  StreamFilter
} from "./types";

class InMemoryRawProductRepository implements RawProductRepository {
  private readonly executions = new Map<string, DiscoveryExecution>();
  private readonly products = new Map<string, RawProductRecord[]>();
  private readonly hashIndex = new Map<string, Set<string>>(); // executionId → payloadHashes

  async appendExecution(execution: DiscoveryExecution): Promise<DiscoveryExecution> {
    const existing = this.executions.get(execution.id);
    if (existing) return existing; // idempotent
    this.executions.set(execution.id, execution);
    if (!this.products.has(execution.id)) {
      this.products.set(execution.id, []);
    }
    if (!this.hashIndex.has(execution.id)) {
      this.hashIndex.set(execution.id, new Set());
    }
    return execution;
  }

  async appendProducts(
    records: ReadonlyArray<RawProductRecord>
  ): Promise<ReadonlyArray<RawProductRecord>> {
    const appended: RawProductRecord[] = [];
    for (const record of records) {
      const execKey = record.executionId;
      const hashSet = this.hashIndex.get(execKey);
      if (!hashSet) {
        // Execution not registered — skip (or could throw; we skip for resilience)
        continue;
      }
      if (hashSet.has(record.payloadHash)) {
        // Idempotent skip — same payload already stored for this execution
        continue;
      }
      hashSet.add(record.payloadHash);
      const list = this.products.get(execKey) ?? [];
      list.push(record);
      this.products.set(execKey, list);
      appended.push(record);
    }
    return appended;
  }

  async findExecution(executionId: DiscoveryExecutionId): Promise<DiscoveryExecution | null> {
    return this.executions.get(executionId) ?? null;
  }

  async findProducts(executionId: DiscoveryExecutionId): Promise<ReadonlyArray<RawProductRecord>> {
    return this.products.get(executionId) ?? [];
  }

  async *streamProducts(filter: StreamFilter): AsyncIterable<RawProductRecord> {
    for (const [execId, products] of this.products) {
      if (filter.executionId && execId !== filter.executionId) continue;
      for (const p of products) {
        if (filter.providerCode && p.providerCode !== filter.providerCode) continue;
        if (filter.partitionKey && p.partitionKey !== filter.partitionKey) continue;
        if (filter.since && p.discoveredAt < filter.since) continue;
        if (filter.until && p.discoveredAt > filter.until) continue;
        yield p;
      }
    }
  }

  async countProducts(filter: StreamFilter): Promise<number> {
    let count = 0;
    for await (const _ of this.streamProducts(filter)) {
      count++;
    }
    return count;
  }

  get executionCount(): number {
    return this.executions.size;
  }

  get productCount(): number {
    let total = 0;
    for (const list of this.products.values()) total += list.length;
    return total;
  }

  /** Test helper: clear all. */
  clear(): void {
    this.executions.clear();
    this.products.clear();
    this.hashIndex.clear();
  }
}

let _instance: InMemoryRawProductRepository | null = null;

export function getRawProductRepository(): RawProductRepository {
  if (!_instance) _instance = new InMemoryRawProductRepository();
  return _instance;
}

export function resetRawProductRepository(): RawProductRepository {
  _instance = new InMemoryRawProductRepository();
  return _instance;
}

export function createRawProductRepository(): RawProductRepository {
  return new InMemoryRawProductRepository();
}
