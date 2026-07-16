/**
 * @workspace/infrastructure/connectors/aliexpress/connector-e2e.test
 *
 * E2E test: ReplayTransport → AliExpressConnector → PrismaRawProductRepository
 * → DefaultProductNormalizer → PrismaNormalizedProductRepository
 *
 * Single comprehensive test that validates the full vertical slice.
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { AliExpressConnector, createAliExpressConnector, AliExpressPagination } from "./connector";
import { createAliExpressAuthProvider, FixedTimestampProvider, FixedNonceProvider } from "./auth";
import {
  createReplayTransport,
  createNoopRateLimiter,
  createHttpRetryPolicy,
  createStringCheckpointSerializer,
  type RecordedInteraction,
  type ConnectorConfig
} from "../core";
import { createPrismaRawProductRepository, createPrismaNormalizedProductRepository } from "../../index.js";
import { DefaultProductNormalizer } from "@workspace/domain/discovery/normalizer/normalizer";
import { DefaultNormalizerVersions } from "@workspace/domain/discovery/normalizer/types";
import { generateDiscoveryTraceId } from "@workspace/domain/discovery/traceability";
import type { DiscoveryRequest } from "../core/types";

import page1Json from "./fixtures/page1.json" with { type: "json" };
import page2Json from "./fixtures/page2.json" with { type: "json" };

const recordings: RecordedInteraction[] = [
  { request: { method: "GET", url: "https://api-sg.aliexpress.com/sync" }, response: { status: 200, headers: {}, body: JSON.stringify(page1Json), durationMs: 150 } },
  { request: { method: "GET", url: "https://api-sg.aliexpress.com/sync" }, response: { status: 200, headers: {}, body: JSON.stringify(page2Json), durationMs: 120 } }
];

async function getPrismaClient(): Promise<any> {
  const mod = await import("../../generated/prisma-client/default.js");
  return new mod.PrismaClient({ datasources: { db: { url: "file:./aliexpress_e2e.db" } } });
}

describe("AliExpress Connector E2E", () => {
  let prisma: any;
  let connector: AliExpressConnector;
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

    const transport = createReplayTransport(recordings);
    const auth = createAliExpressAuthProvider("test_key", "test_secret", new FixedTimestampProvider(1700000000000), new FixedNonceProvider("nonce"));
    const config: ConnectorConfig = {
      provider: "aliexpress", transport, auth,
      pagination: new AliExpressPagination(),
      rateLimiter: createNoopRateLimiter(),
      retryPolicy: createHttpRetryPolicy(3),
      checkpointSerializer: createStringCheckpointSerializer(),
      timeoutMs: 5000, maxPages: 10
    };
    connector = createAliExpressConnector(config, "tracking_id");
  });

  afterAll(async () => { await prisma?.$disconnect(); });

  it("should complete full E2E: discover → persist → normalize → verify", async () => {
    const traceId = generateDiscoveryTraceId();
    const request: DiscoveryRequest = { keyword: "earbuds", region: "US", language: "en", limit: 20, traceId };

    // ── 1. Discover via ReplayTransport ─────────────────────
    const allProducts: any[] = [];
    for await (const page of connector.discover(request)) {
      allProducts.push(...page.products);
    }
    expect(allProducts.length).toBe(3); // 2 from page 1 + 1 from page 2

    // ── 2. Verify mapped products ───────────────────────────
    const first = allProducts[0]!;
    expect(first.externalId).toBe("4001234567890");
    expect(first.title).toContain("Wireless Bluetooth Earbuds");
    expect(first.marketplace).toBe("aliexpress");
    expect(first.brand).toBe("Xiaomi");
    expect(first.price.amount).toBe(2999);
    expect(first.compareAtPrice?.amount).toBe(3999);
    expect(first.images.length).toBe(2);
    expect(first.attributes["Brand Name"]).toBe("Xiaomi");

    // ── 3. Persist to RawProductRepository ─────────────────
    const executionId = "exec_aliexpress_e2e";
    await rawRepo.appendExecution({
      id: executionId, executionKey: "ek_e2e", planId: "plan_e2e", jobId: "job_e2e",
      providerCode: "aliexpress",
      providerSnapshot: { providerCode: "aliexpress", providerVersion: "1.0.0", manifestVersion: "v1", capturedAt: new Date(), health: { providerCode: "aliexpress", status: "healthy", lastSuccess: new Date(), consecutiveFailures: 0, averageLatencyMs: 100, errorRate: 0, totalRequests: 100, totalErrors: 0 }, rateLimit: { limitPerMinute: 60 } },
      status: "succeeded", startedAt: new Date(Date.now() - 1000), completedAt: new Date(),
      durationMs: 1000, attempts: 1, apiCallsUsed: 2, productsDiscovered: allProducts.length,
      reservationConsumed: true,
      metrics: { discoveryDurationMs: 300, checkpointDurationMs: 5, rateLimitWaitMs: 0, retryDelayMs: 0, totalDurationMs: 305, itemsProcessed: allProducts.length, apiCallsUsed: 2, retries: 0, checkpointsSaved: 2 },
      versions: { schemaVersion: "1.0.0", workflowVersion: "1.0.0", plannerVersion: "1.0.0", providerVersion: "1.2.3", connectorVersion: "2.0.0", providerManifestVersion: "v1" },
      partitionKey: "aliexpress|US|2025-07-14", traceId
    });

    const rawRecords = allProducts.map((product, i) => ({
      id: `raw_aliexpress_${i}`,
      executionId,
      providerCode: "aliexpress",
      externalId: product.externalId,
      payload: new TextEncoder().encode(JSON.stringify(product)),
      payloadHash: `ph_aliexpress_${product.externalId}`,
      discoveredAt: new Date(),
      partitionKey: "aliexpress|US|2025-07-14",
      versions: { schemaVersion: "1.0.0", workflowVersion: "1.0.0", plannerVersion: "1.0.0", providerVersion: "1.2.3", connectorVersion: "2.0.0", providerManifestVersion: "v1" }
    }));
    const appended = await rawRepo.appendProducts(rawRecords);
    expect(appended.length).toBe(3);

    // ── 4. Read raw records and normalize ──────────────────
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
    for await (const _ of normalizedRepo.stream({ providerCode: "aliexpress" })) {
      normCount++;
    }
    expect(normCount).toBe(3);

    // ── 6. Verify normalized fields ────────────────────────
    // Find the raw record for the earbuds product (externalId = 4001234567890)
    const earbudsRaw = rawFound.find((r: any) => r.externalId === "4001234567890")!;
    expect(earbudsRaw).toBeDefined();
    const normalizedFound = await normalizedRepo.findByRawProductId(earbudsRaw.id);
    expect(normalizedFound.length).toBe(1);
    const n = normalizedFound[0]!;
    expect(n.normalizedTitle).toContain("Wireless Bluetooth Earbuds");
    expect(n.normalizedBrand).toBe("Xiaomi");
    expect(n.canonicalBrandId).toBe("brand_xiaomi");
    expect(n.semanticFingerprint.algorithm).toBe("fnv");
    expect(n.semanticFingerprint.value).toBeTruthy();
    expect(n.confidenceScore).toBeGreaterThan(0);
    expect(n.normalizedImages.length).toBeGreaterThan(0);

    // ── 7. Verify idempotency ──────────────────────────────
    const reAppended = await rawRepo.appendProducts(rawRecords);
    expect(reAppended.length).toBe(0); // all skipped
    const reFound = await rawRepo.findProducts(executionId);
    expect(reFound.length).toBe(3); // no duplication
  });

  it("should produce HMAC signature in auth", async () => {
    const auth = createAliExpressAuthProvider(
      "my_key", "my_secret",
      new FixedTimestampProvider(1700000000000), new FixedNonceProvider("nonce123")
    );
    const authenticated = await auth.authenticate({
      method: "GET", url: "https://api-sg.aliexpress.com/sync",
      headers: {}, timeoutMs: 5000, query: { method: "aliexpress.affiliate.product.query" }
    });
    expect(authenticated.query!.app_key).toBe("my_key");
    expect(authenticated.query!.timestamp).toBe("1700000000000");
    expect(authenticated.query!.nonce).toBe("nonce123");
    expect(authenticated.query!.sign).toBeTruthy();
    expect(authenticated.query!.sign_method).toBe("md5");
  });

  it("should handle empty response", async () => {
    const emptyRecordings: RecordedInteraction[] = [
      { request: { method: "GET", url: "https://api-sg.aliexpress.com/sync" }, response: { status: 200, headers: {}, body: JSON.stringify({ aliexpress_affiliate_product_query_response: { resp_result: { result: { current_page_no: 1, total_page_no: 1, total_results: 0, products: { product: [] } } } } }), durationMs: 10 } }
    ];
    const config: ConnectorConfig = {
      provider: "aliexpress",
      transport: createReplayTransport(emptyRecordings),
      auth: createAliExpressAuthProvider("key", "secret"),
      pagination: new AliExpressPagination(),
      rateLimiter: createNoopRateLimiter(),
      retryPolicy: createHttpRetryPolicy(3),
      checkpointSerializer: createStringCheckpointSerializer(),
      timeoutMs: 5000, maxPages: 10
    };
    const emptyConnector = createAliExpressConnector(config, "tracking");
    const pages: any[] = [];
    for await (const page of emptyConnector.discover({ keyword: "none", region: "US", language: "en", limit: 20 })) {
      pages.push(page);
    }
    expect(pages.length).toBe(1);
    expect(pages[0]!.products.length).toBe(0);
    expect(pages[0]!.hasMore).toBe(false);
  });
});
