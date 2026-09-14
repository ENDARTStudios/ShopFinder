/**
 * @workspace/infrastructure/connectors/core/fixture-repository.test
 *
 * Tests for FixtureRepository — save/load/list recorded interactions.
 * Also validates the record → replay round-trip.
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  createFixtureRepository,
  type FixtureRepository,
  type RecordedInteraction
} from "./fixture-repository";
import { createReplayTransport } from "./transport";
import { rmSync, existsSync } from "node:fs";

// ── Helpers ────────────────────────────────────────────────

const TEST_FIXTURES_DIR = "/tmp/test-fixtures";

function makeInteraction(pageNum: number): RecordedInteraction {
  return {
    request: {
      method: "GET",
      url: "https://api-sg.aliexpress.com/sync",
      query: { page_no: String(pageNum) }
    },
    response: {
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        aliexpress_affiliate_product_query_response: {
          resp_result: {
            result: {
              current_page_no: pageNum,
              total_page_no: 2,
              total_results: 25,
              products: {
                product: [
                  {
                    product_id: `400123456789${pageNum}`,
                    product_title: `Test Product ${pageNum}`,
                    sale_price: "29.99",
                    currency: "USD"
                  }
                ]
              }
            }
          }
        }
      }),
      durationMs: 150
    }
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("FixtureRepository", () => {
  let repo: FixtureRepository;

  beforeEach(() => {
    // Clean up test directory
    try { rmSync(TEST_FIXTURES_DIR, { recursive: true }); } catch {}
    repo = createFixtureRepository(TEST_FIXTURES_DIR);
  });

  afterEach(() => {
    try { rmSync(TEST_FIXTURES_DIR, { recursive: true }); } catch {}
  });

  it("should save interactions with metadata", async () => {
    const interactions = [makeInteraction(1), makeInteraction(2)];

    const path = await repo.save(
      "aliexpress",
      "affiliate-query",
      interactions,
      {
        providerVersion: "1.0.0",
        endpoint: "aliexpress.affiliate.product.query",
        traceId: "test_trace_001",
        sdkVersion: "1.0.0",
        description: "Test recording"
      }
    );

    expect(path).toContain("aliexpress/affiliate-query");
    expect(existsSync(path)).toBe(true);
    expect(existsSync(`${path}/metadata.json`)).toBe(true);
    expect(existsSync(`${path}/page-001.json`)).toBe(true);
    expect(existsSync(`${path}/page-002.json`)).toBe(true);
  });

  it("should load saved fixtures by date", async () => {
    const interactions = [makeInteraction(1), makeInteraction(2)];

    await repo.save("aliexpress", "affiliate-query", interactions, {
      providerVersion: "1.0.0",
      endpoint: "aliexpress.affiliate.product.query",
      traceId: "test_trace_002",
      sdkVersion: "1.0.0"
    });

    const dates = await repo.listDates("aliexpress", "affiliate-query");
    expect(dates.length).toBe(1);

    const loaded = await repo.loadByDate("aliexpress", "affiliate-query", dates[0]!);
    expect(loaded).not.toBeNull();
    expect(loaded!.interactions.length).toBe(2);
    expect(loaded!.metadata.provider).toBe("aliexpress");
    expect(loaded!.metadata.pages).toBe(2);
    expect(loaded!.metadata.endpoint).toBe("aliexpress.affiliate.product.query");
    expect(loaded!.metadata.sdkVersion).toBe("1.0.0");
  });

  it("should load the latest fixture set", async () => {
    // Save two sets on different dates (simulate by creating dirs)
    const interactions = [makeInteraction(1)];

    // First save (today)
    await repo.save("aliexpress", "affiliate-query", interactions, {
      providerVersion: "1.0.0",
      endpoint: "test",
      traceId: "first",
      sdkVersion: "1.0.0"
    });

    const latest = await repo.loadLatest("aliexpress", "affiliate-query");
    expect(latest).not.toBeNull();
    expect(latest!.interactions.length).toBe(1);
  });

  it("should return null when no fixtures exist", async () => {
    const loaded = await repo.loadLatest("amazon", "product-api");
    expect(loaded).toBeNull();
  });

  it("should list dates in sorted order", async () => {
    // Manually create directories with different dates
    const { mkdir, writeFile } = await import("node:fs/promises");
    const baseDir = `${TEST_FIXTURES_DIR}/aliexpress/affiliate-query`;

    for (const date of ["2025-01-15", "2025-01-10", "2025-01-20"]) {
      const dir = `${baseDir}/${date}`;
      await mkdir(dir, { recursive: true });
      await writeFile(`${dir}/metadata.json`, JSON.stringify({
        provider: "aliexpress",
        providerVersion: "1.0.0",
        recordedAt: `${date}T00:00:00Z`,
        endpoint: "test",
        pages: 1,
        sdkVersion: "1.0.0"
      }));
    }

    const dates = await repo.listDates("aliexpress", "affiliate-query");
    expect(dates.length).toBe(3);
    expect(dates[0]).toBe("2025-01-10");
    expect(dates[2]).toBe("2025-01-20");
  });

  // ── Record → Replay round-trip ──────────────────────────
  describe("Record → Replay round-trip", () => {
    it("should replay recorded interactions identically", async () => {
      const interactions = [makeInteraction(1), makeInteraction(2)];

      // Save to fixture repository
      await repo.save("aliexpress", "affiliate-query", interactions, {
        providerVersion: "1.0.0",
        endpoint: "aliexpress.affiliate.product.query",
        traceId: "roundtrip_test",
        sdkVersion: "1.0.0"
      });

      // Load from fixture repository
      const loaded = await repo.loadLatest("aliexpress", "affiliate-query");
      expect(loaded).not.toBeNull();

      // Create ReplayTransport from loaded fixtures
      const replayTransport = createReplayTransport(loaded!.interactions);

      // Execute requests via ReplayTransport — should get same responses
      const r1 = await replayTransport.execute({
        method: "GET",
        url: "https://api-sg.aliexpress.com/sync",
        headers: {},
        timeoutMs: 5000,
        query: { page_no: "1" }
      });

      const r2 = await replayTransport.execute({
        method: "GET",
        url: "https://api-sg.aliexpress.com/sync",
        headers: {},
        timeoutMs: 5000,
        query: { page_no: "2" }
      });

      // Verify responses match the original recordings
      const json1 = JSON.parse(r1.body);
      const json2 = JSON.parse(r2.body);

      expect(json1.aliexpress_affiliate_product_query_response.resp_result.result.current_page_no).toBe(1);
      expect(json2.aliexpress_affiliate_product_query_response.resp_result.result.current_page_no).toBe(2);

      // Verify product IDs match
      const product1 = json1.aliexpress_affiliate_product_query_response.resp_result.result.products.product[0];
      const product2 = json2.aliexpress_affiliate_product_query_response.resp_result.result.products.product[0];
      expect(product1.product_id).toBe("4001234567891");
      expect(product2.product_id).toBe("4001234567892");
    });
  });
});
