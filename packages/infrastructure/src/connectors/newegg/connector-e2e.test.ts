/**
 * @workspace/infrastructure/connectors/newegg/connector-e2e.test
 *
 * E2E: ReplayTransport → NeweggConnector → Prisma → Normalizer
 * First ConnectorKind.Retailer E2E.
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { NeweggConnector, createNeweggConnector } from "./connector";
import { NeweggPagePagination } from "./pagination";
import {
  createReplayTransport, createNoopRateLimiter, createHttpRetryPolicy,
  createStringCheckpointSerializer, NoopAuthProvider,
  type RecordedInteraction, type ConnectorConfig,
} from "../core";
import { createPrismaRawProductRepository, createPrismaNormalizedProductRepository } from "../../index.js";
import { DefaultProductNormalizer } from "@workspace/domain/discovery/normalizer/normalizer";
import { DefaultNormalizerVersions } from "@workspace/domain/discovery/normalizer/types";
import { generateDiscoveryTraceId } from "@workspace/domain/discovery/traceability";
import type { DiscoveryRequest } from "../core/types";

import page1Json from "./fixtures/hardware-page1.json" with { type: "json" };
import page2Json from "./fixtures/hardware-page2.json" with { type: "json" };

const recordings: RecordedInteraction[] = [
  { request: { method: "GET", url: "https://api.newegg.com/marketplace/v1/product/search" }, response: { status: 200, headers: {}, body: JSON.stringify(page1Json), durationMs: 200 } },
  { request: { method: "GET", url: "https://api.newegg.com/marketplace/v1/product/search" }, response: { status: 200, headers: {}, body: JSON.stringify(page2Json), durationMs: 180 } },
];

async function getPrismaClient(): Promise<any> {
  const mod = await import("../../generated/prisma-client/default.js");
  return new mod.PrismaClient({ datasources: { db: { url: "file:./newegg_e2e.db" } } });
}

describe("Newegg Connector E2E", () => {
  let prisma: any;
  let connector: NeweggConnector;
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
      provider: "newegg",
      transport: createReplayTransport(recordings),
      auth: new NoopAuthProvider(),
      pagination: new NeweggPagePagination(),
      rateLimiter: createNoopRateLimiter(),
      retryPolicy: createHttpRetryPolicy(3),
      checkpointSerializer: createStringCheckpointSerializer(),
      timeoutMs: 10000,
      maxPages: 2, // Only 2 fixture pages
    };
    connector = createNeweggConnector(config);
  });

  afterAll(async () => { await prisma?.$disconnect(); });

  it("should complete full E2E: discover → persist → normalize → verify", async () => {
    const traceId = generateDiscoveryTraceId();
    const request: DiscoveryRequest = { keyword: "CPU", region: "US", language: "en", limit: 2, traceId: traceId as any };

    // 1. Discover
    const allProducts: any[] = [];
    for await (const page of connector.discover(request)) {
      allProducts.push(...page.products);
    }
    expect(allProducts.length).toBe(3); // 2 + 1

    // 2. Verify mapped products
    const first = allProducts[0]!;
    expect(first.externalId).toBe("N82E16819118056");
    expect(first.title).toContain("Intel Core i9");
    expect(first.marketplace).toBe("newegg");
    expect(first.brand).toBe("Intel");
    expect(first.price.amount).toBe(54999);
    expect(first.compareAtPrice?.amount).toBe(62999);
    expect(first.images.length).toBe(3);
    expect(first.attributes["Core Count"]).toBe("24");
    expect(first.attributes["Boost Clock"]).toBe("6.0 GHz");
    expect(first.attributes["UPC"]).toBe("735858465432");
    expect(first.attributes["Model"]).toBe("BX8071514900K");
    expect(first.attributes["Condition"]).toBe("New");
    expect(first.inventory).toBe(1);

    // 3. Persist
    const executionId = "exec_newegg_e2e";
    await rawRepo.appendExecution({
      id: executionId, executionKey: "ek_ne", planId: "plan_ne", jobId: "job_ne",
      providerCode: "newegg",
      providerSnapshot: { providerCode: "newegg", providerVersion: "1.0", manifestVersion: "v1", capturedAt: new Date(), health: { providerCode: "newegg", status: "healthy", lastSuccess: new Date(), consecutiveFailures: 0, averageLatencyMs: 200, errorRate: 0, totalRequests: 50, totalErrors: 0 }, rateLimit: { limitPerMinute: 30 } },
      status: "succeeded", startedAt: new Date(Date.now() - 2000), completedAt: new Date(),
      durationMs: 2000, attempts: 1, apiCallsUsed: 2, productsDiscovered: allProducts.length,
      reservationConsumed: true,
      metrics: { discoveryDurationMs: 400, checkpointDurationMs: 5, rateLimitWaitMs: 0, retryDelayMs: 0, totalDurationMs: 405, itemsProcessed: allProducts.length, apiCallsUsed: 2, retries: 0, checkpointsSaved: 2 },
      versions: { schemaVersion: "1.0.0", workflowVersion: "1.0.0", plannerVersion: "1.0.0", providerVersion: "1.0", connectorVersion: "2.0.0", providerManifestVersion: "v1" },
      partitionKey: "newegg|US|2025-07-14", traceId,
    });

    const rawRecords = allProducts.map((product, i) => ({
      id: `raw_ne_${i}`, executionId, providerCode: "newegg",
      externalId: product.externalId,
      payload: new TextEncoder().encode(JSON.stringify(product)),
      payloadHash: `ph_ne_${product.externalId}`,
      discoveredAt: new Date(), partitionKey: "newegg|US|2025-07-14",
      versions: { schemaVersion: "1.0.0", workflowVersion: "1.0.0", plannerVersion: "1.0.0", providerVersion: "1.0", connectorVersion: "2.0.0", providerManifestVersion: "v1" },
    }));
    await rawRepo.appendProducts(rawRecords);

    // 4. Normalize
    const rawFound = await rawRepo.findProducts(executionId);
    const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
    for (const raw of rawFound) {
      const productJson = JSON.parse(new TextDecoder().decode(raw.payload));
      const normalized = await normalizer.normalize(raw, productJson);
      await normalizedRepo.append(normalized);
    }

    // 5. Verify
    let normCount = 0;
    for await (const _ of normalizedRepo.stream({ providerCode: "newegg" })) normCount++;
    expect(normCount).toBe(3);

    const cpuRaw = rawFound.find((r: any) => r.externalId === "N82E16819118056")!;
    const n = (await normalizedRepo.findByRawProductId(cpuRaw.id))[0]!;
    expect(n.normalizedTitle).toContain("Intel Core i9");
    expect(n.normalizedBrand).toBe("Intel");
    expect(n.canonicalBrandId).toBe("brand_intel");
    expect(n.semanticFingerprint.algorithm).toBe("fnv");

    // 6. Verify ConnectorKind.Retailer
    expect(connector.capabilities.kind).toBe("Retailer");
    expect(connector.capabilities.supportsInventory).toBe(true);
  });

  it("should handle empty response", async () => {
    const emptyConfig: ConnectorConfig = {
      provider: "newegg", transport: createReplayTransport([
        { request: { method: "GET", url: "https://api.newegg.com/marketplace/v1/product/search" }, response: { status: 200, headers: {}, body: JSON.stringify({ ItemList: [], TotalCount: 0, TotalPageCount: 0, CurrentPageNumber: 0 }), durationMs: 50 } },
      ]),
      auth: new NoopAuthProvider(), pagination: new NeweggPagePagination(),
      rateLimiter: createNoopRateLimiter(), retryPolicy: createHttpRetryPolicy(3),
      checkpointSerializer: createStringCheckpointSerializer(), timeoutMs: 5000, maxPages: 10,
    };
    const emptyConnector = createNeweggConnector(emptyConfig);
    const pages: any[] = [];
    for await (const page of emptyConnector.discover({ keyword: "none", region: "US", language: "en", limit: 20 })) {
      pages.push(page);
    }
    expect(pages.length).toBe(1);
    expect(pages[0]!.products.length).toBe(0);
  });
});
