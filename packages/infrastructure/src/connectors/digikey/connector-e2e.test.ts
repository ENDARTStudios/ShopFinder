/**
 * @workspace/infrastructure/connectors/digikey/connector-e2e.test
 *
 * E2E test: ReplayTransport → DigiKeyConnector → Prisma → Normalizer
 * First ConnectorKind.Distributor E2E — validates SDK with distributor data.
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { DigiKeyConnector, createDigiKeyConnector } from "./connector";
import { DigiKeyOffsetPagination } from "./pagination";
import {
  createReplayTransport,
  createNoopRateLimiter,
  createHttpRetryPolicy,
  createStringCheckpointSerializer,
  NoopAuthProvider,
  type RecordedInteraction,
  type ConnectorConfig,
} from "../core";
import { createPrismaRawProductRepository, createPrismaNormalizedProductRepository } from "../../index.js";
import { DefaultProductNormalizer } from "@workspace/domain/discovery/normalizer/normalizer";
import { DefaultNormalizerVersions } from "@workspace/domain/discovery/normalizer/types";
import { generateDiscoveryTraceId } from "@workspace/domain/discovery/traceability";
import type { DiscoveryRequest } from "../core/types";

import page1Json from "./fixtures/product-search-page1.json" with { type: "json" };
import page2Json from "./fixtures/product-search-page2.json" with { type: "json" };

const recordings: RecordedInteraction[] = [
  { request: { method: "POST", url: "https://api.digikey.com/Search/v4/Products" }, response: { status: 200, headers: {}, body: JSON.stringify(page1Json), durationMs: 300 } },
  { request: { method: "POST", url: "https://api.digikey.com/Search/v4/Products" }, response: { status: 200, headers: {}, body: JSON.stringify(page2Json), durationMs: 250 } },
];

async function getPrismaClient(): Promise<any> {
  const mod = await import("@prisma/client");
  return new mod.PrismaClient({ datasources: { db: { url: "file:./digikey_e2e.db" } } });
}

describe("DigiKey Connector E2E", () => {
  let prisma: any;
  let connector: DigiKeyConnector;
  let rawRepo: any;
  let normalizedRepo: any;

  beforeAll(async () => {
    prisma = await getPrismaClient();
    await prisma.$executeRawUnsafe("DROP TABLE IF EXISTS normalized_product_records");
    await prisma.$executeRawUnsafe("DROP TABLE IF EXISTS raw_product_records");
    await prisma.$executeRawUnsafe("DROP TABLE IF EXISTS discovery_executions");
    await prisma.$executeRawUnsafe(`CREATE TABLE "discovery_executions" ("id" TEXT NOT NULL PRIMARY KEY, "executionKey" TEXT NOT NULL, "planId" TEXT NOT NULL, "jobId" TEXT NOT NULL, "providerCode" TEXT NOT NULL, "providerSnapshot" TEXT NOT NULL, "status" TEXT NOT NULL, "startedAt" DATETIME NOT NULL, "completedAt" DATETIME NOT NULL, "durationMs" INTEGER NOT NULL, "attempts" INTEGER NOT NULL, "apiCallsUsed" INTEGER NOT NULL, "productsDiscovered" INTEGER NOT NULL, "reservationConsumed" BOOLEAN NOT NULL, "metrics" TEXT NOT NULL, "versions" TEXT NOT NULL, "partitionKey" TEXT NOT NULL, "error" TEXT, "traceId" TEXT, "metadata" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await prisma.$executeRawUnsafe(`CREATE TABLE "raw_product_records" ("id" TEXT NOT NULL PRIMARY KEY, "executionId" TEXT NOT NULL, "providerCode" TEXT NOT NULL, "externalId" TEXT NOT NULL, "payloadKey" TEXT NOT NULL, "payloadHash" TEXT NOT NULL, "payloadCompression" TEXT NOT NULL DEFAULT 'noop', "payloadSize" INTEGER NOT NULL, "discoveredAt" DATETIME NOT NULL, "partitionKey" TEXT NOT NULL, "versions" TEXT NOT NULL, "metadata" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("executionId") REFERENCES "discovery_executions"("id"), UNIQUE("executionId", "payloadHash"))`);
    await prisma.$executeRawUnsafe(`CREATE TABLE "normalized_product_records" ("id" TEXT NOT NULL PRIMARY KEY, "rawProductId" TEXT NOT NULL, "executionId" TEXT NOT NULL, "payloadHash" TEXT NOT NULL, "semanticFingerprint" TEXT NOT NULL, "normalizedTitle" TEXT NOT NULL, "normalizedBrand" TEXT NOT NULL, "canonicalBrandId" TEXT, "normalizedCategory" TEXT NOT NULL, "canonicalCategoryId" TEXT, "normalizedAttributes" TEXT NOT NULL, "normalizedImages" TEXT NOT NULL, "normalizedPrice" TEXT NOT NULL, "providerCode" TEXT NOT NULL, "externalId" TEXT NOT NULL, "region" TEXT NOT NULL, "language" TEXT NOT NULL, "discoveredAt" DATETIME NOT NULL, "normalizedAt" DATETIME NOT NULL, "partitionKey" TEXT NOT NULL, "normalizerVersions" TEXT NOT NULL, "rawVersions" TEXT NOT NULL, "schemaVersion" TEXT NOT NULL DEFAULT '1.0.0', "confidenceScore" REAL NOT NULL, "warnings" TEXT NOT NULL, "metadata" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("rawProductId", "normalizerVersions"), FOREIGN KEY ("rawProductId") REFERENCES "raw_product_records"("id"))`);

    rawRepo = createPrismaRawProductRepository(prisma);
    normalizedRepo = createPrismaNormalizedProductRepository(prisma);

    const config: ConnectorConfig = {
      provider: "digikey",
      transport: createReplayTransport(recordings),
      auth: new NoopAuthProvider(),
      pagination: new DigiKeyOffsetPagination(),
      rateLimiter: createNoopRateLimiter(),
      retryPolicy: createHttpRetryPolicy(3),
      checkpointSerializer: createStringCheckpointSerializer(),
      timeoutMs: 10000,
      maxPages: 10,
    };
    connector = createDigiKeyConnector(config);
  });

  afterAll(async () => { await prisma?.$disconnect(); });

  it("should complete full E2E: discover → persist → normalize → verify", async () => {
    const traceId = generateDiscoveryTraceId();
    const request: DiscoveryRequest = { keyword: "STM32", region: "US", language: "en", limit: 2, traceId: traceId as any };

    // ── 1. Discover ────────────────────────────────────────
    const allProducts: any[] = [];
    for await (const page of connector.discover(request)) {
      allProducts.push(...page.products);
    }
    expect(allProducts.length).toBe(3); // 2 + 1

    // ── 2. Verify mapped products (distributor-specific) ───
    const first = allProducts[0]!;
    expect(first.externalId).toBe("STM32F407VGT6-ND"); // DigiKey PN
    expect(first.title).toContain("IC MCU 32BIT");
    expect(first.marketplace).toBe("digikey");
    expect(first.brand).toBe("STMicroelectronics");
    expect(first.price.amount).toBe(1421); // $14.21
    expect(first.inventory).toBe(45821); // real-time stock
    expect(first.attributes["MPN"]).toBe("STM32F407VGT6");
    expect(first.attributes["Lifecycle Status"]).toBe("Active");
    expect(first.attributes["RoHS"]).toBe("ROHS3 Compliant");
    expect(first.attributes["Datasheet URL"]).toContain("stm32f407vg.pdf");
    expect(first.attributes["MOQ"]).toBe("1");
    expect(first.attributes["Core Processor"]).toBe("ARM Cortex-M4");
    expect(first.attributes["Speed"]).toBe("168MHz");
    expect(first.attributes["Tariff Number"]).toBe("8542.31.0080");

    // ── 3. Persist to RawProductRepository ─────────────────
    const executionId = "exec_digikey_e2e";
    await rawRepo.appendExecution({
      id: executionId, executionKey: "ek_dk", planId: "plan_dk", jobId: "job_dk",
      providerCode: "digikey",
      providerSnapshot: { providerCode: "digikey", providerVersion: "v4", manifestVersion: "v1", capturedAt: new Date(), health: { providerCode: "digikey", status: "healthy", lastSuccess: new Date(), consecutiveFailures: 0, averageLatencyMs: 300, errorRate: 0, totalRequests: 50, totalErrors: 0 }, rateLimit: { limitPerMinute: 30 } },
      status: "succeeded", startedAt: new Date(Date.now() - 2000), completedAt: new Date(),
      durationMs: 2000, attempts: 1, apiCallsUsed: 2, productsDiscovered: allProducts.length,
      reservationConsumed: true,
      metrics: { discoveryDurationMs: 550, checkpointDurationMs: 5, rateLimitWaitMs: 0, retryDelayMs: 0, totalDurationMs: 555, itemsProcessed: allProducts.length, apiCallsUsed: 2, retries: 0, checkpointsSaved: 2 },
      versions: { schemaVersion: "1.0.0", workflowVersion: "1.0.0", plannerVersion: "1.0.0", providerVersion: "v4", connectorVersion: "2.0.0", providerManifestVersion: "v1" },
      partitionKey: "digikey|US|2025-07-14", traceId,
    });

    const rawRecords = allProducts.map((product, i) => ({
      id: `raw_dk_${i}`,
      executionId,
      providerCode: "digikey",
      externalId: product.externalId,
      payload: new TextEncoder().encode(JSON.stringify(product)),
      payloadHash: `ph_dk_${product.externalId}`,
      discoveredAt: new Date(),
      partitionKey: "digikey|US|2025-07-14",
      versions: { schemaVersion: "1.0.0", workflowVersion: "1.0.0", plannerVersion: "1.0.0", providerVersion: "v4", connectorVersion: "2.0.0", providerManifestVersion: "v1" },
    }));
    const appended = await rawRepo.appendProducts(rawRecords);
    expect(appended.length).toBe(3);

    // ── 4. Normalize ───────────────────────────────────────
    const rawFound = await rawRepo.findProducts(executionId);
    expect(rawFound.length).toBe(3);

    const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
    for (const raw of rawFound) {
      const productJson = JSON.parse(new TextDecoder().decode(raw.payload));
      const normalized = await normalizer.normalize(raw, productJson);
      await normalizedRepo.append(normalized);
    }

    // ── 5. Verify normalized records ───────────────────────
    let normCount = 0;
    for await (const _ of normalizedRepo.stream({ providerCode: "digikey" })) {
      normCount++;
    }
    expect(normCount).toBe(3);

    // ── 6. Verify normalized fields ────────────────────────
    const stm32Raw = rawFound.find((r: any) => r.externalId === "STM32F407VGT6-ND")!;
    const normalizedFound = await normalizedRepo.findByRawProductId(stm32Raw.id);
    expect(normalizedFound.length).toBe(1);
    const n = normalizedFound[0]!;
    expect(n.normalizedTitle).toContain("IC MCU 32BIT");
    expect(n.normalizedBrand).toBe("STMicroelectronics");
    expect(n.canonicalBrandId).toBe("brand_stmicroelectronics");
    expect(n.semanticFingerprint.algorithm).toBe("fnv");
    expect(n.confidenceScore).toBeGreaterThan(0);

    // ── 7. Verify ConnectorKind.Distributor ────────────────
    expect(connector.capabilities.kind).toBe("Distributor");
    expect(connector.capabilities.supportsInventory).toBe(true);
    expect(connector.capabilities.supportsPriceHistory).toBe(true);
  });

  it("should handle empty response", async () => {
    const emptyRecordings: RecordedInteraction[] = [
      { request: { method: "POST", url: "https://api.digikey.com/Search/v4/Products" }, response: { status: 200, headers: {}, body: JSON.stringify({ Products: { Products: [], TotalCount: 0, Count: 0, Offset: 0 } }), durationMs: 50 } },
    ];
    const config: ConnectorConfig = {
      provider: "digikey", transport: createReplayTransport(emptyRecordings),
      auth: new NoopAuthProvider(), pagination: new DigiKeyOffsetPagination(),
      rateLimiter: createNoopRateLimiter(), retryPolicy: createHttpRetryPolicy(3),
      checkpointSerializer: createStringCheckpointSerializer(), timeoutMs: 5000, maxPages: 10,
    };
    const emptyConnector = createDigiKeyConnector(config);
    const pages: any[] = [];
    for await (const page of emptyConnector.discover({ keyword: "none", region: "US", language: "en", limit: 20 })) {
      pages.push(page);
    }
    expect(pages.length).toBe(1);
    expect(pages[0]!.products.length).toBe(0);
    expect(pages[0]!.hasMore).toBe(false);
  });
});
