/**
 * @workspace/infrastructure — PrismaRawProductRepository integration test
 *
 * Validates that the Prisma repository implementation correctly persists
 * and retrieves artifacts from a real SQLite database.
 *
 * This is the first test that proves the domain interfaces can be
 * implemented without changing the domain — a key architectural validation.
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { PrismaRawProductRepository, createPrismaRawProductRepository } from "./prisma-raw-product.repository.js";
import type {
  DiscoveryExecution,
  RawProductRecord,
  DiscoveryExecutionId,
  RawProductRecordId
} from "@workspace/domain/discovery/raw-store/types";
import type { ProviderSnapshot } from "@workspace/domain/discovery/workers/contracts";
import type { WorkerMetricsSnapshot } from "@workspace/domain/discovery/workers/types";
import type { RawStoreVersions } from "@workspace/domain/discovery/raw-store/types";

// We need to dynamically import PrismaClient at runtime since the generated
// client lives outside the root tsconfig include path.

async function getPrismaClient(): Promise<any> {
  const mod = await import("@prisma/client");
  return new mod.PrismaClient({
    datasources: { db: { url: "file:./infra_test.db" } }
  });
}

// ── Fixtures ───────────────────────────────────────────────

const versions: RawStoreVersions = {
  schemaVersion: "1.0.0" as any,
  workflowVersion: "1.0.0",
  plannerVersion: "1.0.0",
  providerVersion: "1.2.3",
  connectorVersion: "2.0.0",
  providerManifestVersion: "manifest_v1"
};

const snapshot: ProviderSnapshot = {
  id: "ps_test" as any,
  providerCode: "aliexpress",
  providerVersion: "1.2.3",
  manifestVersion: "manifest_v1",
  capturedAt: new Date(),
  health: {
    providerCode: "aliexpress",
    status: "healthy",
    lastSuccess: new Date(),
    consecutiveFailures: 0,
    averageLatencyMs: 100,
    errorRate: 0,
    totalRequests: 100,
    totalErrors: 0
  },
  rateLimit: {
    limitPerMinute: 60
  }
};

const metrics: WorkerMetricsSnapshot = {
  discoveryDurationMs: 500,
  checkpointDurationMs: 10,
  rateLimitWaitMs: 5,
  retryDelayMs: 0,
  totalDurationMs: 515,
  itemsProcessed: 3,
  apiCallsUsed: 2,
  retries: 0,
  checkpointsSaved: 1
};

function makeExecution(o?: Partial<DiscoveryExecution>): DiscoveryExecution {
  return {
    id: "exec_test_001" as unknown as DiscoveryExecutionId,
    executionKey: "ek_test_001",
    planId: "plan_test_001",
    jobId: "job_test_001",
    providerCode: "aliexpress",
    providerSnapshot: snapshot,
    status: "succeeded",
    startedAt: new Date(Date.now() - 1000),
    completedAt: new Date(),
    durationMs: 1000,
    attempts: 1,
    apiCallsUsed: 2,
    productsDiscovered: 3,
    reservationConsumed: true,
    metrics,
    versions,
    partitionKey: "aliexpress|US|2025-01-15",
    ...o
  };
}

function makeRawRecord(executionId: string, index: number): RawProductRecord {
  const payload = new TextEncoder().encode(JSON.stringify({
    externalId: `ext_${index}`,
    title: `Product ${index}`,
    price: { amount: 1000 + index * 100, currency: "USD" }
  }));
  return {
    id: `raw_${executionId}_${index}` as unknown as RawProductRecordId,
    executionId: executionId as unknown as DiscoveryExecutionId,
    providerCode: "aliexpress",
    externalId: `ext_${index}`,
    payload,
    payloadHash: `ph_${index}`,
    discoveredAt: new Date(),
    partitionKey: "aliexpress|US|2025-01-15",
    versions
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("PrismaRawProductRepository (integration)", () => {
  let prisma: any;
  let repo: PrismaRawProductRepository;

  beforeAll(async () => {
    prisma = await getPrismaClient();
    // Push schema to test DB
    await prisma.$executeRawUnsafe("DROP TABLE IF EXISTS raw_product_records");
    await prisma.$executeRawUnsafe("DROP TABLE IF EXISTS discovery_executions");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "discovery_executions" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "executionKey" TEXT NOT NULL,
        "planId" TEXT NOT NULL,
        "jobId" TEXT NOT NULL,
        "providerCode" TEXT NOT NULL,
        "providerSnapshot" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "startedAt" DATETIME NOT NULL,
        "completedAt" DATETIME NOT NULL,
        "durationMs" INTEGER NOT NULL,
        "attempts" INTEGER NOT NULL,
        "apiCallsUsed" INTEGER NOT NULL,
        "productsDiscovered" INTEGER NOT NULL,
        "reservationConsumed" BOOLEAN NOT NULL,
        "metrics" TEXT NOT NULL,
        "versions" TEXT NOT NULL,
        "partitionKey" TEXT NOT NULL,
        "error" TEXT,
        "traceId" TEXT,
        "metadata" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "raw_product_records" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "executionId" TEXT NOT NULL,
        "providerCode" TEXT NOT NULL,
        "externalId" TEXT NOT NULL,
        "payloadKey" TEXT NOT NULL,
        "payloadHash" TEXT NOT NULL,
        "payloadCompression" TEXT NOT NULL DEFAULT 'noop',
        "payloadSize" INTEGER NOT NULL,
        "discoveredAt" DATETIME NOT NULL,
        "partitionKey" TEXT NOT NULL,
        "versions" TEXT NOT NULL,
        "metadata" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("executionId") REFERENCES "discovery_executions"("id"),
        UNIQUE("executionId", "payloadHash")
      )
    `);
    repo = createPrismaRawProductRepository(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("should persist and retrieve a DiscoveryExecution", async () => {
    const execution = makeExecution();
    await repo.appendExecution(execution);

    const found = await repo.findExecution(execution.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(execution.id);
    expect(found!.executionKey).toBe(execution.executionKey);
    expect(found!.planId).toBe(execution.planId);
    expect(found!.providerCode).toBe("aliexpress");
    expect(found!.status).toBe("succeeded");
    expect(found!.providerSnapshot.providerCode).toBe("aliexpress");
    expect(found!.metrics.itemsProcessed).toBe(3);
  });

  it("should be idempotent on re-append of same execution", async () => {
    const execution = makeExecution({ id: "exec_idempotent" as any });
    await repo.appendExecution(execution);
    await repo.appendExecution(execution);

    const found = await repo.findExecution(execution.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(execution.id);
  });

  it("should persist and retrieve RawProductRecords", async () => {
    const execution = makeExecution({ id: "exec_records" as any });
    await repo.appendExecution(execution);

    const records = [
      makeRawRecord("exec_records", 0),
      makeRawRecord("exec_records", 1),
      makeRawRecord("exec_records", 2)
    ];

    const appended = await repo.appendProducts(records);
    expect(appended.length).toBe(3);

    const found = await repo.findProducts("exec_records" as any);
    expect(found.length).toBe(3);
    expect(found[0]!.payloadHash).toBe("ph_0");
    expect(found[1]!.payloadHash).toBe("ph_1");
    expect(found[2]!.payloadHash).toBe("ph_2");
  });

  it("should preserve payload round-trip (base64 encoding)", async () => {
    const execution = makeExecution({ id: "exec_payload" as any });
    await repo.appendExecution(execution);

    const originalPayload = new TextEncoder().encode(JSON.stringify({
      title: "Wireless Earbuds",
      price: { amount: 2999, currency: "USD" },
      attributes: { color: "black", size: "M" }
    }));

    const record: RawProductRecord = {
      id: "raw_payload_001" as any,
      executionId: "exec_payload" as any,
      providerCode: "aliexpress",
      externalId: "ext_payload",
      payload: originalPayload,
      payloadHash: "ph_payload",
      discoveredAt: new Date(),
      partitionKey: "aliexpress|US|2025-01-15",
      versions
    };

    await repo.appendProducts([record]);
    const found = await repo.findProducts("exec_payload" as any);

    expect(found.length).toBe(1);
    const decodedPayload = found[0]!.payload;
    const decodedText = new TextDecoder().decode(decodedPayload);
    const decodedJson = JSON.parse(decodedText);

    expect(decodedJson.title).toBe("Wireless Earbuds");
    expect(decodedJson.price.amount).toBe(2999);
    expect(decodedJson.attributes.color).toBe("black");
  });

  it("should skip duplicate (executionId, payloadHash) on re-append", async () => {
    const execution = makeExecution({ id: "exec_dedup" as any });
    await repo.appendExecution(execution);

    const record = makeRawRecord("exec_dedup", 0);
    const r1 = await repo.appendProducts([record]);
    const r2 = await repo.appendProducts([record]);

    expect(r1.length).toBe(1);
    expect(r2.length).toBe(0); // skipped

    const found = await repo.findProducts("exec_dedup" as any);
    expect(found.length).toBe(1); // no duplication
  });

  it("should stream products with filter", async () => {
    const execution = makeExecution({ id: "exec_stream" as any });
    await repo.appendExecution(execution);

    await repo.appendProducts([
      makeRawRecord("exec_stream", 0),
      makeRawRecord("exec_stream", 1),
      makeRawRecord("exec_stream", 2)
    ]);

    let count = 0;
    for await (const _ of repo.streamProducts({ executionId: "exec_stream" as any })) {
      count++;
    }
    expect(count).toBe(3);
  });

  it("should count products", async () => {
    const execution = makeExecution({ id: "exec_count" as any });
    await repo.appendExecution(execution);

    await repo.appendProducts([
      makeRawRecord("exec_count", 0),
      makeRawRecord("exec_count", 1)
    ]);

    const count = await repo.countProducts({ executionId: "exec_count" as any });
    expect(count).toBe(2);
  });
});
