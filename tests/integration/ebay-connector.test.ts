/**
 * Sprint 13 — EbayConnector integration tests (REC-004).
 *
 * Verifies the same invariants as the original Sprint 13 ebay tests:
 *   1. EbayConnector falls back to replay mode when no credentials are set.
 *   2. EbayConnector uses replay mode even with credentials when FORCE_REPLAY=true.
 *   3. EbayConnector switches to live mode when credentials are present and force-replay is off.
 *   4. EbayConnector accepts EBAY_CLIENT_ID / EBAY_CLIENT_SECRET as aliases.
 *   5. EbayConnector accepts an injected transport for testing.
 *   6. Replay mode resolves fixtures via searchByKeyword and returns eBay items.
 *
 * Run: bun test tests/integration/ebay-connector.test.ts
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { EbayConnector, type Transport } from "@workspace/integrations";

describe("EbayConnector mode resolution", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.EBAY_APP_ID;
    delete process.env.EBAY_CERT_ID;
    delete process.env.EBAY_CLIENT_ID;
    delete process.env.EBAY_CLIENT_SECRET;
    delete process.env.EBAY_FORCE_REPLAY;
    delete process.env.EBAY_SANDBOX;
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("should fall back to replay mode when credentials are missing", () => {
    const c = new EbayConnector();
    expect(c.mode).toBe("replay");
    expect(c.transport.kind).toBe("replay");
    expect(c.hasCredentials()).toBe(false);
  });

  it("should use replay mode even with credentials when FORCE_REPLAY=true", () => {
    process.env.EBAY_APP_ID = "MyApp-1234";
    process.env.EBAY_CERT_ID = "secret-5678";
    process.env.EBAY_FORCE_REPLAY = "true";
    const c = new EbayConnector();
    expect(c.mode).toBe("replay");
    expect(c.hasCredentials()).toBe(false);
  });

  it("should switch to live mode when credentials are present and force-replay is off", () => {
    process.env.EBAY_APP_ID = "MyApp-1234";
    process.env.EBAY_CERT_ID = "secret-5678";
    const c = new EbayConnector();
    expect(c.mode).toBe("live");
    expect(c.transport.kind).toBe("fetch");
    expect(c.hasCredentials()).toBe(true);
  });

  it("should accept EBAY_CLIENT_ID / EBAY_CLIENT_SECRET as aliases", () => {
    process.env.EBAY_CLIENT_ID = "MyApp-1234";
    process.env.EBAY_CLIENT_SECRET = "secret-5678";
    const c = new EbayConnector();
    expect(c.mode).toBe("live");
    expect(c.hasCredentials()).toBe(true);
  });

  it("should accept an injected transport for testing", () => {
    const mockTransport: Transport = {
      kind: "mock",
      async execute() {
        return {
          status: 200,
          headers: {},
          body: {},
          source: "mock",
          durationMs: 1
        };
      }
    };
    const c = new EbayConnector({ transport: mockTransport });
    expect(c.transport).toBe(mockTransport);
  });

  it("should resolve fixtures via searchByKeyword in replay mode", async () => {
    const c = new EbayConnector();
    const res = await c.searchByKeyword("electronics");
    expect(res.status).toBe(200);
    expect(res.source).toBe("replay");
    const items = res.body.itemSummaries ?? [];
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].itemId).toBeDefined();
    expect(items[0].title).toBeDefined();
    // At least one item should have a numeric price
    const withPrice = items.find((it) => it.price?.value);
    expect(withPrice).toBeDefined();
    expect(parseFloat(withPrice!.price!.value)).toBeGreaterThan(0);
  });
});
