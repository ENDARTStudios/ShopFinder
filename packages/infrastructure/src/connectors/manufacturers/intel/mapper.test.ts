/**
 * @workspace/infrastructure/connectors/manufacturers/intel/mapper.test
 *
 * Tests for the Intel Ark mapper.
 *
 * Tests cover:
 *   - Mapping a complete product (i9-14900K) with all spec categories
 *   - Spec name canonicalization (Intel "Total Cores" → "cores")
 *   - Numeric/unit extraction ("3.2 GHz" → { value: "3.2", unit: "GHz" })
 *   - Lifecycle status canonicalization ("Launched" → "active")
 *   - Download classification (Datasheet, Manual)
 *   - Image classification (primary, angle)
 *   - Physical dimensions extraction ("45.0 × 45.0 mm" → lengthMm=45)
 *   - Compatibility extraction (socket + chipset)
 *   - Default warranty (3 years limited)
 *   - Default certifications (RoHS, CE, FCC)
 */
/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import { IntelArkMapper } from "./mapper";
import { IntelArkParser } from "./parser";
import type { ParsedIntelArkSpec } from "./parser";
import fixtureJson from "./fixtures/ark-i9-14900k.json";
import ultraFixtureJson from "./fixtures/ark-core-ultra-9-285k.json";

function loadFixture(json: unknown): ParsedIntelArkSpec {
  // Simulate parsing the fixture as if it were an HTTP response
  const parser = new IntelArkParser();
  return parser.parse({
    status: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(json),
    durationMs: 100,
    url: "https://api.intel.com/ark/v1/products/BX8071514900K"
  });
}

describe("Intel Ark Mapper", () => {
  const mapper = new IntelArkMapper();

  describe("i9-14900K fixture", () => {
    const parsed = loadFixture(fixtureJson);
    const result = mapper.map(parsed);

    it("maps MPN and family", () => {
      expect(result.matchedMpn).toBe("BX8071514900K");
      expect(result.identifiers.mpn).toBe("BX8071514900K");
      expect(result.identifiers.family).toContain("13th Generation");
    });

    it("maps core specifications with canonical names", () => {
      const cores = result.specifications.find((s) => s.name === "cores");
      expect(cores?.value).toBe("24");
      expect(cores?.confidence).toBe(1.0);

      const tdp = result.specifications.find((s) => s.name === "tdp");
      expect(tdp?.value).toBe("125");
      expect(tdp?.unit).toBe("W");

      const baseClock = result.specifications.find((s) => s.name === "base_clock");
      expect(baseClock?.value).toBe("3.2");
      expect(baseClock?.unit).toBe("GHz");

      const maxTurbo = result.specifications.find((s) => s.name === "max_turbo");
      expect(maxTurbo?.value).toBe("6.0");
      expect(maxTurbo?.unit).toBe("GHz");
    });

    it("maps socket and memory specs", () => {
      const socket = result.specifications.find((s) => s.name === "socket");
      expect(socket?.value).toBe("FCLGA1700");

      const memoryType = result.specifications.find((s) => s.name === "memory_type");
      expect(memoryType?.value).toContain("DDR5");
    });

    it("maps lifecycle status from Intel 'Launched' to 'active'", () => {
      expect(result.lifecycle.status).toBe("active");
      expect(result.lifecycle.launchDate).toBe("2023-10-17");
      expect(result.lifecycle.eolDate).toBeNull();
      expect(result.lifecycle.successorMpn).toBeNull();
    });

    it("classifies downloads by Intel type field", () => {
      const datasheet = result.downloads.find((d) => d.kind === "datasheet");
      expect(datasheet?.title).toContain("Datasheet");
      expect(datasheet?.mimeType).toBe("application/octet-stream");

      const manual = result.downloads.find((d) => d.kind === "manual");
      expect(manual?.title).toContain("Product Brief");
    });

    it("maps official images", () => {
      expect(result.images.length).toBe(2);
      const primary = result.images.find((i) => i.kind === "primary");
      expect(primary?.url).toContain("14900k-primary");
    });

    it("extracts physical dimensions from Package Size spec", () => {
      expect(result.physical.lengthMm).toBe(45);
      expect(result.physical.widthMm).toBe(45);
      expect(result.physical.packageContents.length).toBeGreaterThan(0);
    });

    it("extracts compatibility from socket spec", () => {
      expect(result.compatibility.length).toBeGreaterThan(0);
      expect(result.compatibility.some((c) => c.includes("FCLGA1700"))).toBe(true);
    });

    it("applies default Intel warranty (3-year limited)", () => {
      expect(result.warranty.durationMonths).toBe(36);
      expect(result.warranty.type).toBe("limited");
      expect(result.warranty.region).toBe("global");
    });

    it("applies default Intel certifications (RoHS, CE, FCC)", () => {
      const certNames = result.certifications.map((c) => c.name);
      expect(certNames).toContain("RoHS");
      expect(certNames).toContain("CE");
      expect(certNames).toContain("FCC");
    });

    it("has no fetchWarnings for a successful parse", () => {
      expect(result.fetchWarnings).toHaveLength(0);
    });
  });

  describe("Core Ultra 9 285K fixture", () => {
    const parsed = loadFixture(ultraFixtureJson);
    const result = mapper.map(parsed);

    it("maps MPN and family", () => {
      expect(result.matchedMpn).toBe("BX80715305K");
      expect(result.identifiers.family).toContain("Intel Core Ultra 9");
    });

    it("maps socket (LGA1851 for Arrow Lake)", () => {
      const socket = result.specifications.find((s) => s.name === "socket");
      expect(socket?.value).toBe("FCLGA1851");
    });

    it("maps memory type (DDR5 only for Arrow Lake)", () => {
      const memoryType = result.specifications.find((s) => s.name === "memory_type");
      expect(memoryType?.value).toContain("DDR5");
      expect(memoryType?.value).not.toContain("DDR4");
    });

    it("has 24 cores but only 24 threads (no HT on E-cores)", () => {
      const cores = result.specifications.find((s) => s.name === "cores");
      expect(cores?.value).toBe("24");
      const threads = result.specifications.find((s) => s.name === "threads");
      expect(threads?.value).toBe("24");
    });
  });

  describe("not_found response", () => {
    it("returns empty spec with fetchWarnings", () => {
      const notFoundParsed: ParsedIntelArkSpec = {
        found: false,
        productName: null,
        productCode: null,
        family: null,
        launchDate: null,
        eolDate: null,
        status: null,
        successorCode: null,
        specs: [],
        downloads: [],
        images: [],
        sourceUrl: ""
      };
      const result = mapper.map(notFoundParsed);
      expect(result.matchedMpn).toBe("");
      expect(result.specifications).toHaveLength(0);
      expect(result.fetchWarnings).toHaveLength(1);
      expect(result.fetchWarnings[0]).toContain("not found");
    });
  });
});

describe("Intel Ark Parser", () => {
  const parser = new IntelArkParser();

  it("parses a 200 response", () => {
    const result = parser.parse({
      status: 200,
      headers: {},
      body: JSON.stringify(fixtureJson),
      durationMs: 50,
      url: "https://api.intel.com/ark/v1/products/BX8071514900K"
    });

    expect(result.found).toBe(true);
    expect(result.productCode).toBe("BX8071514900K");
    expect(result.specs.length).toBeGreaterThan(10);
    expect(result.downloads.length).toBe(2);
    expect(result.images.length).toBe(2);
  });

  it("parses a 404 as not found", () => {
    const result = parser.parse({
      status: 404,
      headers: {},
      body: "{}",
      durationMs: 30,
      url: "https://api.intel.com/ark/v1/products/INVALID"
    });

    expect(result.found).toBe(false);
    expect(result.productCode).toBeNull();
  });

  it("throws on 500 error", () => {
    expect(() => {
      parser.parse({
        status: 500,
        headers: {},
        body: '{"message": "Internal error"}',
        durationMs: 50,
        url: "https://api.intel.com/ark/v1/products/X"
      });
    }).toThrow();
  });
});
