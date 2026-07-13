/**
 * @workspace/domain/discovery/raw-store/types
 *
 * Type contracts for the Raw Product Store (A2.4).
 *
 * Design principles (per architectural review):
 *   1. Two entities: DiscoveryExecution (audit) + RawProductRecord (payload)
 *   2. Two-level hash: payloadHash (exact JSON) + semanticHash (post-normalization, filled by A2.5)
 *   3. Append-only: no UPDATE, no DELETE — only INSERT
 *   4. Full versioning on every record: schema + provider + workflow + planner + connector
 *   5. Payload compressed (gzip/zstd in prod, noop in dev)
 *   6. Partition key: provider|country|yyyy-mm-dd (for future global scale)
 *   7. Stream-based reads for downstream consumers (A2.5 Normalizer)
 *   8. Idempotent appends (same executionId or same payloadHash → no-op)
 */
import type { BrandedId } from "../../shared";
import type { NormalizedDiscoveredProduct } from "../../marketplace";
import type { ProviderSnapshot } from "../workers/contracts";
import type { WorkerMetricsSnapshot } from "../workers/types";

// ── Branded IDs ────────────────────────────────────────────

export type DiscoveryExecutionId = BrandedId<"DiscoveryExecutionId">;
export type RawProductRecordId = BrandedId<"RawProductRecordId">;

// ── Versioning ─────────────────────────────────────────────

/**
 * Every record in the Raw Store carries the full version stack.
 * This enables month-later investigations: "which workflow version
 * produced this product? which connector version? which provider API?"
 */
export interface RawStoreVersions {
  readonly schemaVersion: "1.0.0";
  readonly workflowVersion: string;
  readonly plannerVersion: string;
  readonly providerVersion: string;
  readonly connectorVersion: string;
  readonly providerManifestVersion: string;
}

export const RAW_STORE_SCHEMA_VERSION = "1.0.0" as const;

// ── DiscoveryExecution (audit record) ──────────────────────

export type ExecutionStatus = "succeeded" | "failed" | "cancelled";

export interface DiscoveryExecution {
  readonly id: DiscoveryExecutionId;
  readonly executionKey: string;
  readonly planId: string;
  readonly jobId: string;
  readonly providerCode: string;
  readonly providerSnapshot: ProviderSnapshot;
  readonly status: ExecutionStatus;
  readonly startedAt: Date;
  readonly completedAt: Date;
  readonly durationMs: number;
  readonly attempts: number;
  readonly apiCallsUsed: number;
  readonly productsDiscovered: number;
  readonly reservationConsumed: boolean;
  readonly metrics: WorkerMetricsSnapshot;
  readonly versions: RawStoreVersions;
  readonly partitionKey: string;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly retriable: boolean;
  };
}

// ── RawProductRecord (payload record) ──────────────────────

export interface RawProductRecord {
  readonly id: RawProductRecordId;
  readonly executionId: DiscoveryExecutionId;
  readonly providerCode: string;
  readonly externalId: string;
  /** Compressed raw payload (gzip in prod, UTF-8 bytes in dev). */
  readonly payload: Uint8Array;
  /** Hash of the exact JSON payload (FNV-1a over canonical JSON). */
  readonly payloadHash: string;
  /**
   * Semantic hash — filled by A2.5 Normalizer after attribute
   * canonicalization. Null in A2.4. Used for deduplication by A2.7.
   */
  readonly semanticHash: string | null;
  readonly discoveredAt: Date;
  readonly partitionKey: string;
  readonly versions: RawStoreVersions;
}

// ── Partition key ──────────────────────────────────────────

/**
 * Partition key for future global scale.
 * Format: `${providerCode}|${country}|${yyyy-mm-dd}`
 *
 * Even with PostgreSQL initially, this enables easy migration to
 * native partitioning or sharding later.
 */
export function buildPartitionKey(providerCode: string, country: string, date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${providerCode}|${country}|${yyyy}-${mm}-${dd}`;
}

// ── Repository interface (append-only) ─────────────────────

export interface RawProductRepository {
  /**
   * Append an execution record. Idempotent: same executionId → no-op.
   * Returns the stored record (existing if idempotent).
   */
  appendExecution(execution: DiscoveryExecution): Promise<DiscoveryExecution>;

  /**
   * Append raw product records in batch. Idempotent: records with
   * (executionId, payloadHash) already present are skipped.
   * Returns the actually-new records (excluding idempotent skips).
   */
  appendProducts(
    records: ReadonlyArray<RawProductRecord>
  ): Promise<ReadonlyArray<RawProductRecord>>;

  /** Find a single execution by ID. */
  findExecution(executionId: DiscoveryExecutionId): Promise<DiscoveryExecution | null>;

  /** Find all products for an execution. */
  findProducts(executionId: DiscoveryExecutionId): Promise<ReadonlyArray<RawProductRecord>>;

  /**
   * Stream products matching a filter. Async iterable for memory-efficient
   * downstream consumption (A2.5 Normalizer reads one at a time).
   */
  streamProducts(filter: StreamFilter): AsyncIterable<RawProductRecord>;

  /** Count records matching a filter (for dashboards). */
  countProducts(filter: StreamFilter): Promise<number>;

  /** Test helper: count all executions. */
  readonly executionCount: number;

  /** Test helper: count all products. */
  readonly productCount: number;
}

export interface StreamFilter {
  readonly executionId?: DiscoveryExecutionId;
  readonly providerCode?: string;
  readonly partitionKey?: string;
  readonly since?: Date;
  readonly until?: Date;
}

// ── Coordinator input ──────────────────────────────────────

export interface RawStoreCoordinatorInput {
  readonly executionKey: string;
  readonly planId: string;
  readonly jobId: string;
  readonly providerCode: string;
  readonly providerSnapshot: ProviderSnapshot;
  readonly status: ExecutionStatus;
  readonly startedAt: Date;
  readonly completedAt: Date;
  readonly durationMs: number;
  readonly attempts: number;
  readonly apiCallsUsed: number;
  readonly productsDiscovered: number;
  readonly reservationConsumed: boolean;
  readonly metrics: WorkerMetricsSnapshot;
  readonly versions: RawStoreVersions;
  readonly region: string;
  readonly products: ReadonlyArray<NormalizedDiscoveredProduct>;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly retriable: boolean;
  };
}

export interface RawStoreCoordinatorResult {
  readonly execution: DiscoveryExecution;
  readonly recordsAppended: number;
  readonly recordsSkipped: number;
  readonly payloadHashes: ReadonlyArray<string>;
  readonly durationMs: number;
}

// ── Re-exports ─────────────────────────────────────────────

export type { NormalizedDiscoveredProduct, ProviderSnapshot, WorkerMetricsSnapshot };
