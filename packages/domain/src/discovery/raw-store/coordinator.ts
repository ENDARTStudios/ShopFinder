/**
 * @workspace/domain/discovery/raw-store/coordinator
 *
 * RawStoreCoordinator — bridges Worker output to the Raw Store.
 *
 * Flow:
 *   1. Receive WorkerResult + products + ProviderSnapshot + versions
 *   2. Build DiscoveryExecution (audit record)
 *   3. appendExecution() — idempotent
 *   4. For each NormalizedDiscoveredProduct:
 *      a. Serialize to canonical JSON
 *      b. Compute payloadHash (FNV-1a)
 *      c. Compress via Compressor
 *      d. Build RawProductRecord with partitionKey
 *   5. appendProducts() — idempotent by (executionId, payloadHash)
 *   6. Emit RawProductsPersisted event
 *   7. Emit RawProductsReadyForNormalization event (decouples A2.4 from A2.5)
 *
 * The coordinator is stateless — all state lives in the repository.
 */
import type {
  RawStoreCoordinatorInput,
  RawStoreCoordinatorResult,
  DiscoveryExecution,
  RawProductRecord,
  DiscoveryExecutionId,
  RawStoreVersions
} from "./types";
import { buildPartitionKey, RAW_STORE_SCHEMA_VERSION } from "./types";
import { computePayloadHash, canonicalJsonStringify } from "./hashing";
import type { Compressor } from "./compression";
import { getDefaultCompressor } from "./compression";
import type { RawProductRepository } from "./types";
import {
  makeRawProductsPersistedEvent,
  makeRawProductsReadyForNormalizationEvent,
  type RawStoreEvent
} from "./events";

export interface RawStoreEventPublisher {
  publish(events: ReadonlyArray<RawStoreEvent>): Promise<void>;
}

export interface RawStoreCoordinatorDeps {
  readonly repository: RawProductRepository;
  readonly compressor?: Compressor;
  readonly events?: RawStoreEventPublisher;
}

export class RawStoreCoordinator {
  private readonly compressor: Compressor;
  private readonly events: RawStoreEventPublisher | null;

  constructor(private readonly deps: RawStoreCoordinatorDeps) {
    this.compressor = deps.compressor ?? getDefaultCompressor();
    this.events = deps.events ?? null;
  }

  async persist(input: RawStoreCoordinatorInput): Promise<RawStoreCoordinatorResult> {
    const start = Date.now();
    const executionId = this.makeExecutionId(input.executionKey, input.jobId);
    const partitionDate = input.completedAt;
    const partitionKey = buildPartitionKey(input.providerCode, input.region, partitionDate);

    // 1. Build DiscoveryExecution
    const execution: DiscoveryExecution = {
      id: executionId,
      executionKey: input.executionKey,
      planId: input.planId,
      jobId: input.jobId,
      providerCode: input.providerCode,
      providerSnapshot: input.providerSnapshot,
      status: input.status,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      durationMs: input.durationMs,
      attempts: input.attempts,
      apiCallsUsed: input.apiCallsUsed,
      productsDiscovered: input.productsDiscovered,
      reservationConsumed: input.reservationConsumed,
      metrics: input.metrics,
      versions: input.versions,
      partitionKey,
      error: input.error,
      traceId: input.traceId
    };

    // 2. Append execution (idempotent)
    await this.deps.repository.appendExecution(execution);

    // 3. Build raw product records
    const records: RawProductRecord[] = [];
    const payloadHashes: string[] = [];
    for (const product of input.products) {
      const json = canonicalJsonStringify(product);
      const payloadHash = computePayloadHash(product);
      const compressed = await this.compressor.compress(json);
      const record: RawProductRecord = {
        id: this.makeRecordId(executionId, payloadHash),
        executionId,
        providerCode: input.providerCode,
        externalId: product.externalId,
        payload: compressed,
        payloadHash,
        discoveredAt: product.discoveredAt,
        partitionKey,
        versions: input.versions
      };
      records.push(record);
      payloadHashes.push(payloadHash);
    }

    // 4. Append products (idempotent by payloadHash)
    const appended = await this.deps.repository.appendProducts(records);
    const skipped = records.length - appended.length;

    // 5. Emit events
    if (this.events) {
      const versions: RawStoreVersions = input.versions;
      const events: RawStoreEvent[] = [
        makeRawProductsPersistedEvent(versions, {
          executionId: executionId,
          executionKey: input.executionKey,
          planId: input.planId,
          jobId: input.jobId,
          providerCode: input.providerCode,
          count: appended.length,
          skipped,
          payloadHashes: appended.map((r) => r.payloadHash),
          partitionKey,
          durationMs: Date.now() - start
        })
      ];

      // Only emit ReadyForNormalization if there are products to normalize
      if (appended.length > 0) {
        const partitionKeys = [...new Set(appended.map((r) => r.partitionKey))];
        events.push(
          makeRawProductsReadyForNormalizationEvent(versions, {
            executionId: executionId,
            providerCode: input.providerCode,
            count: appended.length,
            partitionKeys
          })
        );
      }

      await this.events.publish(events);
    }

    return {
      execution,
      recordsAppended: appended.length,
      recordsSkipped: skipped,
      payloadHashes: appended.map((r) => r.payloadHash),
      durationMs: Date.now() - start
    };
  }

  /**
   * Deterministic execution ID: same (executionKey, jobId) → same ID.
   * This makes re-persistence idempotent: if the coordinator is called
   * twice for the same job, the second call finds the existing execution.
   */
  private makeExecutionId(executionKey: string, jobId: string): DiscoveryExecutionId {
    const raw = `exec_${executionKey}_${jobId}`;
    return raw as unknown as DiscoveryExecutionId;
  }

  /**
   * Deterministic record ID: same (executionId, payloadHash) → same ID.
   * This makes re-append idempotent.
   */
  private makeRecordId(
    executionId: DiscoveryExecutionId,
    payloadHash: string
  ): import("./types").RawProductRecordId {
    const raw = `raw_${executionId}_${payloadHash}`;
    return raw as unknown as import("./types").RawProductRecordId;
  }
}

export function createRawStoreCoordinator(deps: RawStoreCoordinatorDeps): RawStoreCoordinator {
  return new RawStoreCoordinator(deps);
}

// Re-export schema version for consumers
export { RAW_STORE_SCHEMA_VERSION };
