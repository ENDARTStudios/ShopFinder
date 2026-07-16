/**
 * @workspace/infrastructure/connectors/manufacturers/amd/connector-e2e.test
 *
 * E2E test: ReplayTransport → AmdConnector → ManufacturerSource
 * Second ConnectorKind.Manufacturer E2E — validates SDK with AMD's
 * category-grouped spec format (different from Intel's flat list).
 *
 * Tests cover:
 *   - Successful enrichment: OPN → AMD Product Master → full spec
 *   - Cache hit on second call for same OPN
 *   - 404 not_found handling
 *   - Ryzen warranty (3 years) vs EPYC warranty (5 years)
 *   - Energy Star certification only when eligible
 *   - ImageValidator fingerprinting (InMemoryImageValidator)
 *   - DatasheetFetcher download (InMemoryDatasheetFetcher)
 *   - Capabilities: AMD publishes drivers + firmware (unlike Intel)
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import { AmdConnector, createAmdConnector } from "./connector";
import { AmdApiKeyAuth } from "./auth";
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

import ryzenFixture from "./fixtures/ryzen-9-7950x.json";
import epycFixture from "./fixtures/epyc-9654.json";
import notFoundJson from "./fixtures/errors/not-found.json";

function makeRecordings(
  opn: string,
  body: unknown,
  status = 200
): RecordedInteraction[] {
  return [
    {
      request: { method: "GET", url: `https://api.amd.com/product-master/v1/products/${opn}` },
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
    provider: "amd",
    transport: createReplayTransport(recordings),
    auth: new NoopAuthProvider(),
    rateLimiter: createNoopRateLimiter(),
    retryPolicy: createHttpRetryPolicy(2),
    timeoutMs: 10000,
    apiBaseUrl: "https://api.amd.com/product-master/v1",
    cache: opts?.cache ?? new InMemoryManufacturerCache(),
    datasheetFetcher: opts?.withDatasheet ? new InMemoryDatasheetFetcher() : undefined,
    imageValidator: opts?.withImageValidator ? new InMemoryImageValidator() : undefined
  };
}

describe("AMD Connector E2E", () => {
  let cache: InMemoryManufacturerCache;

  beforeEach(() => {
    cache = new InMemoryManufacturerCache();
  });

  it("enriches an OPN into a complete ManufacturerSource (Ryzen 9 7950X)", async () => {
    const config = makeConfig(makeRecordings("100-100000514WOF", ryzenFixture), {
      cache,
      withDatasheet: true,
      withImageValidator: true
    });
    const connector = createAmdConnector(config);

    const request: ManufacturerEnrichmentRequest = {
      manufacturer: "amd",
      mpn: "100-100000514WOF",
      brand: "AMD",
      title: "AMD Ryzen 9 7950X Desktop Processor",
      gtin: null,
      upc: null,
      ean: null,
      traceId: generateDiscoveryTraceId()
    };

    const source = await connector.enrich(request);

    expect(source.manufacturer).toBe("amd");
    expect(source.matchedMpn).toBe("100-100000514WOF");
    expect(source.fetchStatus).toBe("ok");
    expect(source.fetchWarnings).toHaveLength(0);

    // Identifiers
    expect(source.identifiers.mpn).toBe("100-100000514WOF");
    expect(source.identifiers.family).toContain("Ryzen 9");

    // Specs (flattened across all categories)
    expect(source.specifications.length).toBeGreaterThan(20);
    const cores = source.specifications.find((s) => s.name === "cores");
    expect(cores?.value).toBe("16");
    expect(cores?.confidence).toBe(1.0);

    const tdp = source.specifications.find((s) => s.name === "tdp");
    expect(tdp?.value).toBe("170");
    expect(tdp?.unit).toBe("W");

    // Lifecycle
    expect(source.lifecycle.status).toBe("active");
    expect(source.lifecycle.launchDate).toBe("2022-09-27");

    // Downloads (datasheet should be downloaded via InMemoryDatasheetFetcher)
    expect(source.downloads.length).toBe(3); // datasheet + chipset driver + Ryzen Master
    const datasheet = source.downloads.find((d) => d.kind === "datasheet");
    expect(datasheet).toBeDefined();
    expect(datasheet!.url).toMatch(/^datasheets\//);

    // Images
    expect(source.images.length).toBe(2);
    expect(source.images[0]!.fingerprint.algorithm).toBe("phash");

    // Certifications (Ryzen 9 7950X is Energy Star eligible)
    const certNames = source.certifications.map((c) => c.name);
    expect(certNames).toContain("RoHS");
    expect(certNames).toContain("Energy Star");

    // Warranty (Ryzen → 3 years)
    expect(source.warranty.durationMonths).toBe(36);
    expect(source.warranty.type).toBe("limited");

    // Physical
    expect(source.physical.lengthMm).toBe(40);
    expect(source.physical.widthMm).toBe(40);
    expect(source.physical.weightGrams).toBe(35);

    // Compatibility (socket + chipsets)
    expect(source.compatibility.some((c) => c.includes("Socket AM5"))).toBe(true);
    expect(source.compatibility.some((c) => c.includes("X670E"))).toBe(true);
  });

  it("enriches EPYC 9654 with server-class specs and 5-year warranty", async () => {
    const config = makeConfig(makeRecordings("100-000000514", epycFixture), { cache });
    const connector = createAmdConnector(config);

    const source = await connector.enrich({
      manufacturer: "amd",
      mpn: "100-000000514",
      brand: "AMD",
      title: "AMD EPYC 9654 Server Processor",
      gtin: null,
      upc: null,
      ean: null,
      traceId: generateDiscoveryTraceId()
    });

    expect(source.matchedMpn).toBe("100-000000514");
    expect(source.identifiers.family).toContain("EPYC 9004");

    // 96 cores / 192 threads
    const cores = source.specifications.find((s) => s.name === "cores");
    expect(cores?.value).toBe("96");
    const threads = source.specifications.find((s) => s.name === "threads");
    expect(threads?.value).toBe("192");

    // 12 memory channels (server-class)
    const memoryChannels = source.specifications.find((s) => s.name === "memory_channels");
    expect(memoryChannels?.value).toBe("12");

    // 128 PCIe lanes (server-class)
    const pcieLanes = source.specifications.find((s) => s.name === "pcie_lanes");
    expect(pcieLanes?.value).toBe("128");

    // EPYC warranty: 5 years (not 3)
    expect(source.warranty.durationMonths).toBe(60);

    // EPYC is NOT Energy Star eligible
    const certNames = source.certifications.map((c) => c.name);
    expect(certNames).not.toContain("Energy Star");

    // Larger package (71×56.5 mm vs Ryzen's 40×40)
    expect(source.physical.lengthMm).toBe(71);
    expect(source.physical.widthMm).toBe(56.5);
  });

  it("returns cached source on second call for same OPN", async () => {
    const config = makeConfig(makeRecordings("100-100000514WOF", ryzenFixture), { cache });
    const connector = createAmdConnector(config);

    const request: ManufacturerEnrichmentRequest = {
      manufacturer: "amd",
      mpn: "100-100000514WOF",
      brand: "AMD",
      title: "Ryzen 9 7950X",
      gtin: null,
      upc: null,
      ean: null,
      traceId: generateDiscoveryTraceId()
    };

    const first = await connector.enrich(request);
    expect(first.matchedMpn).toBe("100-100000514WOF");
    expect(cache.size).toBe(1);

    // Second call — cache hit
    const second = await connector.enrich(request);
    expect(second.matchedMpn).toBe("100-100000514WOF");
    expect(second.specifications.length).toBeGreaterThan(0);
    expect(cache.size).toBe(1);
  });

  it("handles 404 as not_found", async () => {
    const config = makeConfig(
      makeRecordings("INVALID_OPN", notFoundJson, 404),
      { cache }
    );
    const connector = createAmdConnector(config);

    const source = await connector.enrich({
      manufacturer: "amd",
      mpn: "INVALID_OPN",
      brand: "AMD",
      title: "Invalid Product",
      gtin: null,
      upc: null,
      ean: null,
      traceId: generateDiscoveryTraceId()
    });

    expect(source.fetchStatus).toBe("not_found");
    expect(source.specifications).toHaveLength(0);
    expect(source.matchedMpn).toBe("INVALID_OPN");
  });

  it("exposes capabilities for hardware family queries", () => {
    const config = makeConfig(makeRecordings("100-100000514WOF", ryzenFixture));
    const connector = createAmdConnector(config);

    expect(connector.manufacturer).toBe("amd");
    expect(connector.capabilities.supportsDatasheets).toBe(true);
    expect(connector.capabilities.supportsLifecycle).toBe(true);
    expect(connector.capabilities.supportsDrivers).toBe(true);  // AMD publishes drivers (Intel doesn't)
    expect(connector.capabilities.supportsFirmware).toBe(true); // AMD publishes AGESA firmware
    expect(connector.capabilities.supportsBios).toBe(false);    // BIOS is motherboard's
  });

  it("uses AmdApiKeyAuth when provided", async () => {
    const config: ManufacturerConnectorConfig = {
      provider: "amd",
      transport: createReplayTransport(makeRecordings("100-100000514WOF", ryzenFixture)),
      auth: new AmdApiKeyAuth({ apiKey: "test-amd-api-key" }),
      rateLimiter: createNoopRateLimiter(),
      retryPolicy: createHttpRetryPolicy(1),
      timeoutMs: 5000,
      apiBaseUrl: "https://api.amd.com/product-master/v1",
      cache: new InMemoryManufacturerCache()
    };
    const connector = createAmdConnector(config);

    const source = await connector.enrich({
      manufacturer: "amd",
      mpn: "100-100000514WOF",
      brand: "AMD",
      title: "Ryzen 9 7950X",
      gtin: null,
      upc: null,
      ean: null,
      traceId: generateDiscoveryTraceId()
    });

    expect(source.matchedMpn).toBe("100-100000514WOF");
  });

  it("throws when MPN (OPN) is null", async () => {
    const config = makeConfig([]);
    const connector = createAmdConnector(config);

    expect(
      connector.enrich({
        manufacturer: "amd",
        mpn: null,
        brand: "AMD",
        title: "Ryzen",
        gtin: null,
        upc: null,
        ean: null,
        traceId: generateDiscoveryTraceId()
      })
    ).rejects.toThrow("MPN");
  });

  it("maps AMD driver downloads correctly (Ryzen Master utility)", async () => {
    const config = makeConfig(makeRecordings("100-100000514WOF", ryzenFixture), { cache });
    const connector = createAmdConnector(config);

    const source = await connector.enrich({
      manufacturer: "amd",
      mpn: "100-100000514WOF",
      brand: "AMD",
      title: "Ryzen 9 7950X",
      gtin: null,
      upc: null,
      ean: null,
      traceId: generateDiscoveryTraceId()
    });

    // AMD publishes 3 downloads for Ryzen 9 7950X
    expect(source.downloads.length).toBe(3);

    const titles = source.downloads.map((d) => d.title);
    expect(titles.some((t) => t.includes("Datasheet"))).toBe(true);
    expect(titles.some((t) => t.includes("Chipset Drivers"))).toBe(true);
    expect(titles.some((t) => t.includes("Ryzen Master"))).toBe(true);
  });
});
