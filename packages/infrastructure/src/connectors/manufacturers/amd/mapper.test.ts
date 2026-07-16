/**
 * @workspace/infrastructure/connectors/manufacturers/amd/mapper.test
 *
 * Tests for the AMD Product Master mapper.
 *
 * Tests cover:
 *   - Mapping Ryzen 9 7950X with all spec categories (General, Memory, PCIe, Graphics, Thermal)
 *   - AMD-specific spec name canonicalization ("# of CPU Cores" → "cores", "Default TDP" → "tdp")
 *   - Numeric/unit extraction ("4.5 GHz" → { value: "4.5", unit: "GHz" })
 *   - Lifecycle status canonicalization ("Active" → "active")
 *   - Download classification (Datasheet, Driver, Utility)
 *   - Image classification
 *   - Warranty inference: Ryzen → 36 months, EPYC → 60 months
 *   - Energy Star certification only when eligible (Ryzen yes, EPYC no)
 *   - Package Dimensions extraction ("40 × 40 mm" → 40×40)
 *   - Motherboard Chipsets compatibility (X670E, B650E, etc.)
 */
/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import { AmdProductMapper } from "./mapper";
import { AmdProductParser } from "./parser";
import type { ParsedAmdProductSpec } from "./parser";
import ryzenFixture from "./fixtures/ryzen-9-7950x.json";
import epycFixture from "./fixtures/epyc-9654.json";

function loadFixture(json: unknown): ParsedAmdProductSpec {
  const parser = new AmdProductParser();
  return parser.parse({
    status: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(json),
    durationMs: 100,
    url: "https://api.amd.com/product-master/v1/products/100-100000514WOF"
  });
}

describe("AMD Product Mapper", () => {
  const mapper = new AmdProductMapper();

  describe("Ryzen 9 7950X fixture", () => {
    const parsed = loadFixture(ryzenFixture);
    const result = mapper.map(parsed);

    it("maps OPN and family", () => {
      expect(result.matchedMpn).toBe("100-100000514WOF");
      expect(result.identifiers.mpn).toBe("100-100000514WOF");
      expect(result.identifiers.family).toContain("Ryzen 9");
    });

    it("maps core specifications with canonical names", () => {
      const cores = result.specifications.find((s) => s.name === "cores");
      expect(cores?.value).toBe("16");
      expect(cores?.confidence).toBe(1.0);

      const tdp = result.specifications.find((s) => s.name === "tdp");
      expect(tdp?.value).toBe("170");
      expect(tdp?.unit).toBe("W");

      const baseClock = result.specifications.find((s) => s.name === "base_clock");
      expect(baseClock?.value).toBe("4.5");
      expect(baseClock?.unit).toBe("GHz");

      const maxTurbo = result.specifications.find((s) => s.name === "max_turbo");
      expect(maxTurbo?.value).toBe("5.7");
      expect(maxTurbo?.unit).toBe("GHz");
    });

    it("maps socket and memory specs", () => {
      const socket = result.specifications.find((s) => s.name === "socket");
      expect(socket?.value).toBe("Socket AM5");

      const memoryType = result.specifications.find((s) => s.name === "memory_type");
      expect(memoryType?.value).toBe("DDR5");

      const memoryChannels = result.specifications.find((s) => s.name === "memory_channels");
      expect(memoryChannels?.value).toBe("2");
    });

    it("flattens specs across all categories", () => {
      // Specs span General, Memory, PCIe, Graphics, Thermal categories
      // → single flat list after mapping
      const specNames = result.specifications.map((s) => s.name);
      expect(specNames).toContain("cores");
      expect(specNames).toContain("tdp");
      expect(specNames).toContain("socket");
      expect(specNames).toContain("memory_type");
      expect(specNames).toContain("pcie_version");
      expect(specNames).toContain("graphics_model");
      expect(specNames).toContain("max_temp");
      expect(result.specifications.length).toBeGreaterThan(20);
    });

    it("maps lifecycle status from AMD 'Active' to 'active'", () => {
      expect(result.lifecycle.status).toBe("active");
      expect(result.lifecycle.launchDate).toBe("2022-09-27");
      expect(result.lifecycle.eolDate).toBeNull();
    });

    it("classifies downloads (datasheet, driver, utility)", () => {
      const datasheet = result.downloads.find((d) => d.kind === "datasheet");
      expect(datasheet?.title).toContain("Datasheet");

      const driver = result.downloads.find((d) => d.kind === "driver");
      expect(driver?.title).toContain("Chipset Drivers");
    });

    it("maps official images", () => {
      expect(result.images.length).toBe(2);
      const primary = result.images.find((i) => i.kind === "primary");
      expect(primary?.url).toContain("7950x-primary");
    });

    it("extracts physical dimensions from Package Dimensions spec", () => {
      expect(result.physical.lengthMm).toBe(40);
      expect(result.physical.widthMm).toBe(40);
      expect(result.physical.weightGrams).toBe(35);
    });

    it("extracts compatibility from CPU Socket + Motherboard Chipsets", () => {
      expect(result.compatibility.some((c) => c.includes("Socket AM5"))).toBe(true);
      expect(result.compatibility.some((c) => c.includes("X670E"))).toBe(true);
      expect(result.compatibility.some((c) => c.includes("B650E"))).toBe(true);
    });

    it("applies Ryzen warranty (3 years limited)", () => {
      expect(result.warranty.durationMonths).toBe(36);
      expect(result.warranty.type).toBe("limited");
    });

    it("includes Energy Star certification when eligible", () => {
      const certNames = result.certifications.map((c) => c.name);
      expect(certNames).toContain("RoHS");
      expect(certNames).toContain("CE");
      expect(certNames).toContain("FCC");
      expect(certNames).toContain("Energy Star"); // Ryzen 9 7950X is Energy Star eligible
    });

    it("has no fetchWarnings for a successful parse", () => {
      expect(result.fetchWarnings).toHaveLength(0);
    });
  });

  describe("EPYC 9654 fixture", () => {
    const parsed = loadFixture(epycFixture);
    const result = mapper.map(parsed);

    it("maps OPN and family", () => {
      expect(result.matchedMpn).toBe("100-000000514");
      expect(result.identifiers.family).toContain("EPYC 9004");
    });

    it("maps socket (SP5 / LGA 6096 for EPYC)", () => {
      const socket = result.specifications.find((s) => s.name === "socket");
      expect(socket?.value).toBe("SP5 (LGA 6096)");
    });

    it("maps 96 cores and 192 threads", () => {
      const cores = result.specifications.find((s) => s.name === "cores");
      expect(cores?.value).toBe("96");

      const threads = result.specifications.find((s) => s.name === "threads");
      expect(threads?.value).toBe("192");
    });

    it("maps 12 memory channels (server-class)", () => {
      const memoryChannels = result.specifications.find((s) => s.name === "memory_channels");
      expect(memoryChannels?.value).toBe("12");
    });

    it("maps 128 PCIe lanes (server-class)", () => {
      const pcieLanes = result.specifications.find((s) => s.name === "pcie_lanes");
      expect(pcieLanes?.value).toBe("128");
    });

    it("applies EPYC warranty (5 years, not 3)", () => {
      expect(result.warranty.durationMonths).toBe(60); // 5 years for EPYC
      expect(result.warranty.type).toBe("limited");
    });

    it("does NOT include Energy Star (EPYC is not Energy Star eligible)", () => {
      const certNames = result.certifications.map((c) => c.name);
      expect(certNames).toContain("RoHS");
      expect(certNames).toContain("CE");
      expect(certNames).toContain("FCC");
      expect(certNames).not.toContain("Energy Star");
    });

    it("extracts larger physical dimensions for EPYC (71×56.5 mm)", () => {
      expect(result.physical.lengthMm).toBe(71);
      expect(result.physical.widthMm).toBe(56.5);
    });
  });

  describe("not_found response", () => {
    it("returns empty spec with fetchWarnings", () => {
      const notFoundParsed: ParsedAmdProductSpec = {
        found: false,
        productName: null,
        productCode: null,
        productFamily: null,
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

describe("AMD Product Parser", () => {
  const parser = new AmdProductParser();

  it("parses a 200 response with category-grouped specs", () => {
    const result = parser.parse({
      status: 200,
      headers: {},
      body: JSON.stringify(ryzenFixture),
      durationMs: 50,
      url: "https://api.amd.com/product-master/v1/products/100-100000514WOF"
    });

    expect(result.found).toBe(true);
    expect(result.productCode).toBe("100-100000514WOF");
    expect(result.productFamily).toContain("Ryzen 9");

    // Specs should be flattened across all categories
    expect(result.specs.length).toBeGreaterThan(15);
    const cores = result.specs.find((s) => s.name === "# of CPU Cores");
    expect(cores?.value).toBe("16");
    expect(cores?.category).toBe("General Specifications");

    const tdp = result.specs.find((s) => s.name === "Default TDP");
    expect(tdp?.value).toBe("170");
    expect(tdp?.unit).toBe("W");
    expect(tdp?.category).toBe("General Specifications");
  });

  it("parses a 404 as not found", () => {
    const result = parser.parse({
      status: 404,
      headers: {},
      body: "{}",
      durationMs: 30,
      url: "https://api.amd.com/product-master/v1/products/INVALID"
    });

    expect(result.found).toBe(false);
    expect(result.productCode).toBeNull();
    expect(result.specs).toHaveLength(0);
  });

  it("throws on 500 error", () => {
    expect(() => {
      parser.parse({
        status: 500,
        headers: {},
        body: '{"message": "Internal error"}',
        durationMs: 50,
        url: "https://api.amd.com/product-master/v1/products/X"
      });
    }).toThrow();
  });
});
