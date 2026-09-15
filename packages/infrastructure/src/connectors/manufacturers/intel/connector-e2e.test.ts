/**
 * @workspace/infrastructure/connectors/manufacturers/intel/connector-e2e.test
 *
 * E2E test: ReplayTransport → IntelConnector → ManufacturerSource
 * First ConnectorKind.Manufacturer E2E — validates SDK with manufacturer data.
 *
 * Tests cover:
 *   - Successful enrichment: MPN → Intel Ark → full spec
 *   - Cache hit on second call for same MPN
 *   - 404 not_found handling (Intel returns no record)
 *   - Default warranty + certifications applied
 *   - ImageValidator fingerprinting (InMemoryImageValidator)
 *   - DatasheetFetcher download (InMemoryDatasheetFetcher)
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import { IntelConnector, createIntelConnector } from "./connector";
import { IntelApiKeyAuth } from "./auth";
import {
  createReplayTransport,
  createNoopRateLimiter,
  createHttpRetryPolicy,
  NoopAuthProvider,
  type RecordedInteraction
} from "../../core";
import {
  InMemoryManufacturerCache,
  InMemoryDatasheetFetcher,
  InMemoryImageValidator,
  type ManufacturerConnectorConfig
} from "../common";
import type { ManufacturerEnrichmentRequest } from "@workspace/domain/discovery/enrichment/types";
import { generateDiscoveryTraceId } from "@workspace/domain/discovery/traceability";

import fixtureI9 from "./fixtures/ark-i9-14900k.json";
import fixtureUltra from "./fixtures/ark-core-ultra-9-285k.json";
import notFoundJson from "./fixtures/errors/not-found.json";
import rateLimitJson from "./fixtures/errors/rate-limit.json";

function makeRecordings(
  mpn: string,
  body: unknown,
  status = 200
): RecordedInteraction[] {
  return [
    {
      request: { method: "GET", url: `https://api.intel.com/ark/v1/products/${mpn}` },
      response: {
        status,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        durationMs: 200
      }
    }
  ];
}

function makeConfig(
  recordings: RecordedInteraction[],
  opts?: { withDatasheet?: boolean; withImageValidator?: boolean; cache?: InMemoryManufacturerCache }
): ManufacturerConnectorConfig {
  return {
    provider: "intel",
    transport: createReplayTransport(recordings),
    auth: new NoopAuthProvider(),
    rateLimiter: createNoopRateLimiter(),
    retryPolicy: createHttpRetryPolicy(2),
    timeoutMs: 10000,
    apiBaseUrl: "https://api.intel.com/ark/v1",
    cache: opts?.cache ?? new InMemoryManufacturerCache(),
    datasheetFetcher: opts?.withDatasheet ? new InMemoryDatasheetFetcher() : undefined,
    imageValidator: opts?.withImageValidator ? new InMemoryImageValidator() : undefined
  };
}

describe("Intel Connector E2E", () => {
  let cache: InMemoryManufacturerCache;

  beforeEach(() => {
    cache = new InMemoryManufacturerCache();
  });

  it("enriches an MPN into a complete ManufacturerSource", async () => {
    const config = makeConfig(makeRecordings("BX8071514900K", fixtureI9), {
      cache,
      withDatasheet: true,
      withImageValidator: true
    });
    const connector = createIntelConnector(config);

    const request: ManufacturerEnrichmentRequest = {
      manufacturer: "intel",
      mpn: "BX8071514900K",
      brand: "Intel",
      title: "Intel Core i9-14900K Desktop Processor",
      gtin: null,
      upc: null,
      ean: null,
      traceId: generateDiscoveryTraceId()
    };

    const source = await connector.enrich(request);

    expect(source.manufacturer).toBe("intel");
    expect(source.matchedMpn).toBe("BX8071514900K");
    expect(source.fetchStatus).toBe("ok");
    expect(source.fetchWarnings).toHaveLength(0);

    // Identifiers
    expect(source.identifiers.mpn).toBe("BX8071514900K");
    expect(source.identifiers.family).toContain("13th Generation");

    // Specs
    expect(source.specifications.length).toBeGreaterThan(10);
    const cores = source.specifications.find((s) => s.name === "cores");
    expect(cores?.value).toBe("24");
    expect(cores?.confidence).toBe(1.0);

    // Lifecycle
    expect(source.lifecycle.status).toBe("active");
    expect(source.lifecycle.launchDate).toBe("2023-10-17");

    // Downloads (datasheet should be downloaded via InMemoryDatasheetFetcher)
    expect(source.downloads.length).toBe(2);
    const datasheet = source.downloads.find((d) => d.kind === "datasheet");
    expect(datasheet).toBeDefined();
    expect(datasheet!.url).toMatch(/^datasheets\//); // replaced with object key

    // Images (should have fingerprints from InMemoryImageValidator)
    expect(source.images.length).toBe(2);
    expect(source.images[0]!.fingerprint.algorithm).toBe("phash");
    expect(source.images[0]!.fingerprint.value.length).toBeGreaterThan(0);

    // Certifications
    const certNames = source.certifications.map((c) => c.name);
    expect(certNames).toContain("RoHS");
    expect(certNames).toContain("CE");
    expect(certNames).toContain("FCC");

    // Warranty
    expect(source.warranty.durationMonths).toBe(36);
    expect(source.warranty.type).toBe("limited");

    // Physical
    expect(source.physical.lengthMm).toBe(45);
    expect(source.physical.widthMm).toBe(45);
    expect(source.physical.packageContents.length).toBeGreaterThan(0);

    // Compatibility
    expect(source.compatibility.some((c) => c.includes("FCLGA1700"))).toBe(true);
  });

  it("returns cached source on second call for same MPN", async () => {
    const config = makeConfig(makeRecordings("BX8071514900K", fixtureI9), { cache });
    const connector = createIntelConnector(config);

    const request: ManufacturerEnrichmentRequest = {
      manufacturer: "intel",
      mpn: "BX8071514900K",
      brand: "Intel",
      title: "Intel Core i9-14900K",
      gtin: null,
      upc: null,
      ean: null,
      traceId: generateDiscoveryTraceId()
    };

    const first = await connector.enrich(request);
    expect(first.matchedMpn).toBe("BX8071514900K");
    expect(cache.size).toBe(1);

    // Second call — cache hit (transport only has 1 recording, so a second
    // fetch would throw "no recorded response")
    const second = await connector.enrich(request);
    expect(second.matchedMpn).toBe("BX8071514900K");
    expect(second.specifications.length).toBeGreaterThan(0);
    expect(cache.size).toBe(1); // still 1 entry
  });

  it("handles 404 as not_found", async () => {
    const config = makeConfig(
      makeRecordings("INVALID_MPN", notFoundJson, 404),
      { cache }
    );
    const connector = createIntelConnector(config);

    const request: ManufacturerEnrichmentRequest = {
      manufacturer: "intel",
      mpn: "INVALID_MPN",
      brand: "Intel",
      title: "Invalid Product",
      gtin: null,
      upc: null,
      ean: null,
      traceId: generateDiscoveryTraceId()
    };

    const source = await connector.enrich(request);

    expect(source.fetchStatus).toBe("not_found");
    expect(source.specifications).toHaveLength(0);
    expect(source.matchedMpn).toBe("INVALID_MPN");
  });

  it("enriches Core Ultra 9 285K (Arrow Lake)", async () => {
    const config = makeConfig(makeRecordings("BX80715305K", fixtureUltra), { cache });
    const connector = createIntelConnector(config);

    const request: ManufacturerEnrichmentRequest = {
      manufacturer: "intel",
      mpn: "BX80715305K",
      brand: "Intel",
      title: "Intel Core Ultra 9 285K",
      gtin: null,
      upc: null,
      ean: null,
      traceId: generateDiscoveryTraceId()
    };

    const source = await connector.enrich(request);

    expect(source.matchedMpn).toBe("BX80715305K");
    expect(source.identifiers.family).toContain("Intel Core Ultra 9");

    const socket = source.specifications.find((s) => s.name === "socket");
    expect(socket?.value).toBe("FCLGA1851"); // Arrow Lake socket

    const cores = source.specifications.find((s) => s.name === "cores");
    expect(cores?.value).toBe("24");
  });

  it("exposes capabilities for hardware family queries", () => {
    const config = makeConfig(makeRecordings("BX8071514900K", fixtureI9));
    const connector = createIntelConnector(config);

    expect(connector.manufacturer).toBe("intel");
    expect(connector.capabilities.supportsDatasheets).toBe(true);
    expect(connector.capabilities.supportsLifecycle).toBe(true);
    expect(connector.capabilities.supportsDrivers).toBe(false); // CPUs have no drivers
    expect(connector.capabilities.supportsBios).toBe(false);    // BIOS is motherboard's
  });

  it("uses IntelApiKeyAuth when provided", async () => {
    const config: ManufacturerConnectorConfig = {
      provider: "intel",
      transport: createReplayTransport(makeRecordings("BX8071514900K", fixtureI9)),
      auth: new IntelApiKeyAuth({ apiKey: "test-api-key" }),
      rateLimiter: createNoopRateLimiter(),
      retryPolicy: createHttpRetryPolicy(1),
      timeoutMs: 5000,
      apiBaseUrl: "https://api.intel.com/ark/v1",
      cache: new InMemoryManufacturerCache()
    };
    const connector = createIntelConnector(config);

    const source = await connector.enrich({
      manufacturer: "intel",
      mpn: "BX8071514900K",
      brand: "Intel",
      title: "i9-14900K",
      gtin: null,
      upc: null,
      ean: null,
      traceId: generateDiscoveryTraceId()
    });

    expect(source.matchedMpn).toBe("BX8071514900K");
    // If IntelApiKeyAuth didn't authenticate properly, the request would fail
    // (but NoopAuthProvider-style replay doesn't actually check headers)
  });

  it("throws when MPN is null", async () => {
    const config = makeConfig([]);
    const connector = createIntelConnector(config);

    expect(
      connector.enrich({
        manufacturer: "intel",
        mpn: null,
        brand: "Intel",
        title: "i9-14900K",
        gtin: null,
        upc: null,
        ean: null,
        traceId: generateDiscoveryTraceId()
      })
    ).rejects.toThrow("MPN");
  });
});
