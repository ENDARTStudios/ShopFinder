/**
 * @workspace/infrastructure/repositories/discovery/prisma-raw-product.repository
 *
 * PrismaRawProductRepository — implements the domain's RawProductRepository
 * interface using Prisma + SQLite (dev) / PostgreSQL (prod).
 *
 * This is a THIN layer: maps Domain ⇄ Prisma, handles transactions,
 * manages persistence. NO business logic here.
 *
 * Key design decisions:
 *   - Payloads stored as Object Storage keys (payloadKey), NOT as BLOBs in DB.
 *   - In dev (NoopCompressor), payload is stored inline as base64 in payloadKey.
 *   - In prod (GzipCompressor + S3), payloadKey is the S3 object key.
 *   - All JSON fields serialized/deserialized transparently.
 *   - ArtifactMetadata stored as JSON string in `metadata` column.
 */
// PrismaClient is imported from the generated client.
// We use a type-only import to avoid pulling the generated types into
// the root tsconfig (which causes stack overflow due to deep recursion).
// At runtime, the import resolves to the generated client.
type PrismaClient = any;
import type {
  RawProductRepository,
  DiscoveryExecution,
  RawProductRecord,
  DiscoveryExecutionId,
  StreamFilter
} from "@workspace/domain/discovery/raw-store/types";
import type { ObjectStorage } from "../../storage/index.js";

// ── Mappers ────────────────────────────────────────────────

function executionToDomain(row: any): DiscoveryExecution {
  return {
    id: row.id as DiscoveryExecutionId,
    executionKey: row.executionKey,
    planId: row.planId,
    jobId: row.jobId,
    providerCode: row.providerCode,
    providerSnapshot: JSON.parse(row.providerSnapshot),
    status: row.status,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    durationMs: row.durationMs,
    attempts: row.attempts,
    apiCallsUsed: row.apiCallsUsed,
    productsDiscovered: row.productsDiscovered,
    reservationConsumed: row.reservationConsumed,
    metrics: JSON.parse(row.metrics),
    versions: JSON.parse(row.versions),
    partitionKey: row.partitionKey,
    error: row.error ? JSON.parse(row.error) : undefined,
    traceId: row.traceId ?? undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  };
}

function executionToPrisma(exec: DiscoveryExecution): any {
  return {
    id: exec.id,
    executionKey: exec.executionKey,
    planId: exec.planId,
    jobId: exec.jobId,
    providerCode: exec.providerCode,
    providerSnapshot: JSON.stringify(exec.providerSnapshot),
    status: exec.status,
    startedAt: exec.startedAt,
    completedAt: exec.completedAt,
    durationMs: exec.durationMs,
    attempts: exec.attempts,
    apiCallsUsed: exec.apiCallsUsed,
    productsDiscovered: exec.productsDiscovered,
    reservationConsumed: exec.reservationConsumed,
    metrics: JSON.stringify(exec.metrics),
    versions: JSON.stringify(exec.versions),
    partitionKey: exec.partitionKey,
    error: exec.error ? JSON.stringify(exec.error) : null,
    traceId: exec.traceId ?? null,
    metadata: exec.metadata ? JSON.stringify(exec.metadata) : null
  };
}

function recordToDomain(row: any): RawProductRecord {
  return {
    id: row.id as RawProductRecord["id"],
    executionId: row.executionId as DiscoveryExecutionId,
    providerCode: row.providerCode,
    externalId: row.externalId,
    payload: decodePayload(row.payloadKey, row.payloadCompression),
    payloadHash: row.payloadHash,
    discoveredAt: row.discoveredAt,
    partitionKey: row.partitionKey,
    versions: JSON.parse(row.versions),
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  };
}

function recordToPrisma(rec: RawProductRecord): any {
  const { key, compression, size } = encodePayload(rec.payload);
  return {
    id: rec.id,
    executionId: rec.executionId,
    providerCode: rec.providerCode,
    externalId: rec.externalId,
    payloadKey: key,
    payloadHash: rec.payloadHash,
    payloadCompression: compression,
    payloadSize: size,
    discoveredAt: rec.discoveredAt,
    partitionKey: rec.partitionKey,
    versions: JSON.stringify(rec.versions),
    metadata: rec.metadata ? JSON.stringify(rec.metadata) : null
  };
}

// ── Payload encoding ───────────────────────────────────────

/**
 * Encode a Uint8Array payload for storage.
 * In dev: store as base64 string inline (payloadKey = "base64:...").
 * In prod: upload to S3, payloadKey = S3 object key.
 */
function encodePayload(payload: Uint8Array): { key: string; compression: string; size: number } {
  const size = payload.byteLength;
  // Dev mode: base64-encode inline
  const base64 = Buffer.from(payload).toString("base64");
  return {
    key: `base64:${base64}`,
    compression: "noop",
    size
  };
}

/**
 * Decode a payload from storage.
 */
function decodePayload(key: string, _compression: string): Uint8Array {
  if (key.startsWith("base64:")) {
    const base64 = key.slice(7);
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  // Future: fetch from S3 using key
  throw new Error(`Unknown payload key format: ${key.slice(0, 20)}...`);
}

// ── Repository ─────────────────────────────────────────────

export class PrismaRawProductRepository implements RawProductRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly objectStorage?: ObjectStorage
  ) {}

  async appendExecution(execution: DiscoveryExecution): Promise<DiscoveryExecution> {
    // Idempotent: check if exists first
    const existing = await this.prisma.discoveryExecution.findUnique({
      where: { id: execution.id }
    });
    if (existing) return executionToDomain(existing);

    await this.prisma.discoveryExecution.create({
      data: executionToPrisma(execution)
    });
    return execution;
  }

  async appendProducts(records: ReadonlyArray<RawProductRecord>): Promise<ReadonlyArray<RawProductRecord>> {
    const appended: RawProductRecord[] = [];
    for (const record of records) {
      // Idempotent: skip if (executionId, payloadHash) already exists
      const existing = await this.prisma.rawProductRecord.findUnique({
        where: {
          executionId_payloadHash: {
            executionId: record.executionId,
            payloadHash: record.payloadHash
          }
        }
      });
      if (existing) continue;

      // Upload payload to Object Storage if available
      let payloadKey: string;
      let compression = "noop";
      let payloadSize = record.payload.byteLength;
      if (this.objectStorage) {
        payloadKey = await this.objectStorage.put(
          `raw-records/${record.executionId}`,
          record.payload
        );
        compression = "none";
      } else {
        // Fallback: base64 inline (for tests without ObjectStorage)
        const encoded = encodePayload(record.payload);
        payloadKey = encoded.key;
        compression = encoded.compression;
        payloadSize = encoded.size;
      }

      await this.prisma.rawProductRecord.create({
        data: {
          ...recordToPrisma(record),
          payloadKey,
          payloadCompression: compression,
          payloadSize
        }
      });
      appended.push(record);
    }
    return appended;
  }

  async findExecution(executionId: DiscoveryExecutionId): Promise<DiscoveryExecution | null> {
    const row = await this.prisma.discoveryExecution.findUnique({
      where: { id: executionId }
    });
    return row ? executionToDomain(row) : null;
  }

  async findProducts(executionId: DiscoveryExecutionId): Promise<ReadonlyArray<RawProductRecord>> {
    const rows = await this.prisma.rawProductRecord.findMany({
      where: { executionId }
    });
    // Load payloads from Object Storage or decode inline
    const results: RawProductRecord[] = [];
    for (const row of rows) {
      results.push(await this.recordToDomainWithPayload(row));
    }
    return results;
  }

  async *streamProducts(filter: StreamFilter): AsyncIterable<RawProductRecord> {
    const where: any = {};
    if (filter.executionId) where.executionId = filter.executionId;
    if (filter.providerCode) where.providerCode = filter.providerCode;
    if (filter.partitionKey) where.partitionKey = filter.partitionKey;
    if (filter.since) where.discoveredAt = { gte: filter.since };
    if (filter.until) where.discoveredAt = { ...where.discoveredAt, lte: filter.until };

    // Batch read for streaming (Prisma doesn't have native async cursors for SQLite)
    const batchSize = 100;
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const rows = await this.prisma.rawProductRecord.findMany({
        where,
        skip,
        take: batchSize,
        orderBy: { id: "asc" }
      });

      for (const row of rows) {
        yield await this.recordToDomainWithPayload(row);
      }

      if (rows.length < batchSize) {
        hasMore = false;
      } else {
        skip += batchSize;
      }
    }
  }

  async countProducts(filter: StreamFilter): Promise<number> {
    const where: any = {};
    if (filter.executionId) where.executionId = filter.executionId;
    if (filter.providerCode) where.providerCode = filter.providerCode;
    if (filter.partitionKey) where.partitionKey = filter.partitionKey;
    if (filter.since) where.discoveredAt = { gte: filter.since };
    if (filter.until) where.discoveredAt = { ...where.discoveredAt, lte: filter.until };

    return this.prisma.rawProductRecord.count({ where });
  }

  get executionCount(): number {
    throw new Error("executionCount getter not supported in Prisma repository. Use count() query instead.");
  }

  get productCount(): number {
    throw new Error("productCount getter not supported in Prisma repository. Use count() query instead.");
  }

  /**
   * Convert a Prisma row to domain record, loading payload from ObjectStorage
   * if available, or decoding base64 inline for tests.
   */
  private async recordToDomainWithPayload(row: any): Promise<RawProductRecord> {
    let payload: Uint8Array;

    if (this.objectStorage && !row.payloadKey.startsWith("base64:")) {
      // Load from Object Storage (S3/MinIO)
      payload = await this.objectStorage.get(row.payloadKey);
    } else {
      // Decode base64 inline (fallback for tests)
      payload = decodePayload(row.payloadKey, row.payloadCompression);
    }

    return {
      id: row.id as RawProductRecord["id"],
      executionId: row.executionId as DiscoveryExecutionId,
      providerCode: row.providerCode,
      externalId: row.externalId,
      payload,
      payloadHash: row.payloadHash,
      discoveredAt: row.discoveredAt,
      partitionKey: row.partitionKey,
      versions: JSON.parse(row.versions),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }
}

// ── Factory ────────────────────────────────────────────────

export function createPrismaRawProductRepository(
  prisma: PrismaClient,
  objectStorage?: ObjectStorage
): PrismaRawProductRepository {
  return new PrismaRawProductRepository(prisma, objectStorage);
}
