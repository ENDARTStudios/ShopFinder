/**
 * @workspace/infrastructure/repositories/discovery/prisma-normalized-product.repository
 *
 * PrismaNormalizedProductRepository — implements the domain's
 * NormalizedProductRepository interface using Prisma.
 *
 * Same thin-layer pattern as PrismaRawProductRepository:
 *   - Maps Domain ⇄ Prisma (JSON serialization for complex fields)
 *   - NO business logic
 *   - Idempotent append (unique constraint on rawProductId + normalizerVersions)
 *   - Supports batch append, findByRawProductId, findBySemanticHash, stream, count
 */
import type {
  NormalizedProductRepository,
  NormalizedProductRecord,
  NormalizedProductRecordId,
  NormalizedStreamFilter
} from "@workspace/domain/discovery/normalizer/types";
import type { DiscoveryExecutionId } from "@workspace/domain/discovery/raw-store/types";

// PrismaClient is typed as `any` to avoid TypeScript stack overflow
// from the deeply recursive generated types.
type PrismaClient = any;

// ── Mappers ────────────────────────────────────────────────

function recordToDomain(row: any): NormalizedProductRecord {
  return {
    id: row.id as NormalizedProductRecordId,
    rawProductId: row.rawProductId,
    executionId: row.executionId as DiscoveryExecutionId,
    payloadHash: row.payloadHash,
    semanticFingerprint: JSON.parse(row.semanticFingerprint),
    normalizedTitle: row.normalizedTitle,
    normalizedBrand: row.normalizedBrand,
    canonicalBrandId: row.canonicalBrandId ?? null,
    normalizedCategory: row.normalizedCategory,
    canonicalCategoryId: row.canonicalCategoryId ?? null,
    normalizedAttributes: JSON.parse(row.normalizedAttributes),
    normalizedImages: JSON.parse(row.normalizedImages),
    normalizedPrice: JSON.parse(row.normalizedPrice),
    providerCode: row.providerCode,
    externalId: row.externalId,
    region: row.region,
    language: row.language,
    discoveredAt: row.discoveredAt,
    normalizedAt: row.normalizedAt,
    partitionKey: row.partitionKey,
    normalizerVersions: JSON.parse(row.normalizerVersions),
    rawVersions: JSON.parse(row.rawVersions),
    schemaVersion: row.schemaVersion ?? "1.0.0",
    confidenceScore: row.confidenceScore,
    warnings: JSON.parse(row.warnings),
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  } as NormalizedProductRecord;
}

function recordToPrisma(rec: NormalizedProductRecord): any {
  return {
    id: rec.id,
    rawProductId: rec.rawProductId,
    executionId: rec.executionId,
    payloadHash: rec.payloadHash,
    semanticFingerprint: JSON.stringify(rec.semanticFingerprint),
    normalizedTitle: rec.normalizedTitle,
    normalizedBrand: rec.normalizedBrand,
    canonicalBrandId: rec.canonicalBrandId,
    normalizedCategory: rec.normalizedCategory,
    canonicalCategoryId: rec.canonicalCategoryId,
    normalizedAttributes: JSON.stringify(rec.normalizedAttributes),
    normalizedImages: JSON.stringify(rec.normalizedImages),
    normalizedPrice: JSON.stringify(rec.normalizedPrice),
    providerCode: rec.providerCode,
    externalId: rec.externalId,
    region: rec.region,
    language: rec.language,
    discoveredAt: rec.discoveredAt,
    normalizedAt: rec.normalizedAt,
    partitionKey: rec.partitionKey,
    normalizerVersions: JSON.stringify(rec.normalizerVersions),
    rawVersions: JSON.stringify(rec.rawVersions),
    schemaVersion: rec.schemaVersion,
    confidenceScore: rec.confidenceScore,
    warnings: JSON.stringify(rec.warnings),
    metadata: (rec as any).metadata ? JSON.stringify((rec as any).metadata) : null
  };
}

// ── Repository ─────────────────────────────────────────────

export class PrismaNormalizedProductRepository implements NormalizedProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async append(record: NormalizedProductRecord): Promise<NormalizedProductRecord> {
    // Idempotent: check if exists (unique on rawProductId + normalizerVersions)
    const normalizerVersionStr = JSON.stringify(record.normalizerVersions);
    const existing = await this.prisma.normalizedProductRecord.findUnique({
      where: {
        rawProductId_normalizerVersions: {
          rawProductId: record.rawProductId,
          normalizerVersions: normalizerVersionStr
        }
      }
    });
    if (existing) return recordToDomain(existing);

    await this.prisma.normalizedProductRecord.create({
      data: recordToPrisma(record)
    });
    return record;
  }

  async appendBatch(
    records: ReadonlyArray<NormalizedProductRecord>
  ): Promise<ReadonlyArray<NormalizedProductRecord>> {
    const result: NormalizedProductRecord[] = [];
    for (const rec of records) {
      const appended = await this.append(rec);
      result.push(appended);
    }
    return result;
  }

  async findById(id: NormalizedProductRecordId): Promise<NormalizedProductRecord | null> {
    const row = await this.prisma.normalizedProductRecord.findUnique({
      where: { id }
    });
    return row ? recordToDomain(row) : null;
  }

  async findByRawProductId(
    rawProductId: string
  ): Promise<ReadonlyArray<NormalizedProductRecord>> {
    const rows = await this.prisma.normalizedProductRecord.findMany({
      where: { rawProductId }
    });
    return rows.map(recordToDomain);
  }

  async findBySemanticHash(semanticHash: string): Promise<ReadonlyArray<NormalizedProductRecord>> {
    // semanticHash is the value field of the semanticFingerprint JSON.
    // We search with a LIKE pattern on the JSON string.
    const rows = await this.prisma.normalizedProductRecord.findMany({
      where: {
        semanticFingerprint: { contains: semanticHash }
      }
    });
    return rows.map(recordToDomain);
  }

  async *stream(filter: NormalizedStreamFilter): AsyncIterable<NormalizedProductRecord> {
    const where: any = {};
    if (filter.executionId) where.executionId = filter.executionId;
    if (filter.providerCode) where.providerCode = filter.providerCode;
    if (filter.partitionKey) where.partitionKey = filter.partitionKey;
    if (filter.since) where.normalizedAt = { gte: filter.since };
    if (filter.until) where.normalizedAt = { ...where.normalizedAt, lte: filter.until };

    const batchSize = 100;
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const rows = await this.prisma.normalizedProductRecord.findMany({
        where,
        skip,
        take: batchSize,
        orderBy: { id: "asc" }
      });

      for (const row of rows) {
        yield recordToDomain(row);
      }

      if (rows.length < batchSize) {
        hasMore = false;
      } else {
        skip += batchSize;
      }
    }
  }

  async count(filter: NormalizedStreamFilter): Promise<number> {
    const where: any = {};
    if (filter.executionId) where.executionId = filter.executionId;
    if (filter.providerCode) where.providerCode = filter.providerCode;
    if (filter.partitionKey) where.partitionKey = filter.partitionKey;
    if (filter.since) where.normalizedAt = { gte: filter.since };
    if (filter.until) where.normalizedAt = { ...where.normalizedAt, lte: filter.until };

    return this.prisma.normalizedProductRecord.count({ where });
  }

  get recordCount(): number {
    throw new Error("recordCount getter not supported in Prisma repository. Use count() query instead.");
  }
}

// ── Factory ────────────────────────────────────────────────

export function createPrismaNormalizedProductRepository(
  prisma: PrismaClient
): PrismaNormalizedProductRepository {
  return new PrismaNormalizedProductRepository(prisma);
}
