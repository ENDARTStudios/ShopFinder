/**
 * @workspace/infrastructure/connectors/manufacturers/intel/mapper
 *
 * Maps ParsedIntelArkSpec → ParsedManufacturerSpec.
 *
 * This is where Intel-specific knowledge lives: which Intel spec labels
 * correspond to which canonical spec names, how to classify Intel
 * downloads (datasheet vs driver), how to extract physical dimensions
 * from Intel's "Supplemental Information" block, etc.
 *
 * The mapper is intentionally pure — no I/O, no side effects.
 * It can be unit-tested with fixtures.
 */
import type { ParsedIntelArkSpec, IntelArkSpec, IntelArkDownload, IntelArkImage } from "./parser";
import type { ParsedManufacturerSpec } from "../common/types";
import {
  parseNumericSpec,
  normalizeSpecName,
  canonicalLifecycleStatus,
  classifyImageKind,
  classifyDownloadKind,
  inferMimeType
} from "../common/spec-parser";

// ── Intel spec label → canonical name mapping ──────────────

const INTEL_SPEC_NAME_MAP: Readonly<Record<string, string>> = {
  "Total Cores": "cores",
  "Total Threads": "threads",
  "Processor Base Frequency": "base_clock",
  "Max Turbo Frequency": "max_turbo",
  "TDP": "tdp",
  "Processor Base Power": "tdp",
  "Maximum Turbo Power": "max_turbo_power",
  "Cache": "cache",
  "Bus Speed": "bus_speed",
  "PCIe Version": "pcie_version",
  "PCIe Lanes": "pcie_lanes",
  "Memory Types": "memory_type",
  "Max Memory Size": "max_memory",
  "Max Memory Channels": "memory_channels",
  "Socket": "socket",
  "Lithography": "lithography",
  "Thermal Solution Specification": "thermal_solution",
  "Package Size": "package_size",
  "TCASE": "max_temp",
  "Graphics": "graphics"
};

// ── Mapper ─────────────────────────────────────────────────

export class IntelArkMapper {
  map(parsed: ParsedIntelArkSpec): ParsedManufacturerSpec {
    const sourceUrl = parsed.sourceUrl;

    // Specifications: apply Intel name → canonical name mapping
    const specifications = parsed.specs
      .filter((s) => s.label && s.value)
      .map((s) => {
        const canonicalName = INTEL_SPEC_NAME_MAP[s.label] ?? normalizeSpecName(s.label);
        const { value, unit } = parseNumericSpec(s.value);
        return {
          name: canonicalName,
          value,
          unit: unit ?? s.unit,
          sourceUrl,
          confidence: 1.0
        };
      });

    // Lifecycle
    const lifecycle = {
      status: canonicalLifecycleStatus(parsed.status),
      launchDate: parsed.launchDate,
      eolDate: parsed.eolDate,
      endOfSaleDate: null,
      successorMpn: parsed.successorCode,
      sourceUrl
    };

    // Downloads: classify by type field
    const downloads = parsed.downloads.map((d) => this.mapDownload(d, sourceUrl));

    // Images: classify by alt text or URL pattern
    const images = parsed.images.map((img) => this.mapImage(img));

    // Identifiers: Intel provides MPN (productCode), no EAN/UPC/GTIN in Ark
    const identifiers = {
      mpn: parsed.productCode,
      ean: null as string | null,
      upc: null as string | null,
      gtin: null as string | null,
      family: parsed.family,
      successorMpn: parsed.successorCode
    };

    // Certifications: Intel publishes RoHS + CE compliance on the product page
    // (For now, hardcode based on Intel's standard compliance — production
    // would scrape the "Compliance" section.)
    const certifications = [
      { name: "RoHS", code: null, issuedBy: "Intel", validUntil: null, sourceUrl },
      { name: "CE", code: null, issuedBy: "Intel", validUntil: null, sourceUrl },
      { name: "FCC", code: null, issuedBy: "Intel", validUntil: null, sourceUrl }
    ];

    // Warranty: Intel standard 3-year limited for boxed processors
    const warranty = {
      durationMonths: 36,
      type: "limited" as const,
      region: "global",
      termsUrl: "https://www.intel.com/content/www/us/en/support/articles/000005227/processors.html"
    };

    // Physical specs: extract from "Package Size" spec
    const physical = this.extractPhysical(parsed.specs);

    // Compatibility: extract socket + chipset info
    const compatibility = this.extractCompatibility(parsed.specs);

    return {
      matchedMpn: parsed.productCode ?? "",
      identifiers,
      specifications,
      lifecycle,
      downloads,
      images,
      certifications,
      warranty,
      physical,
      compatibility,
      sourceUrl,
      fetchWarnings: parsed.found ? [] : ["Product not found in Intel Ark"]
    };
  }

  private mapDownload(
    d: IntelArkDownload,
    sourceUrl: string
  ): ParsedManufacturerSpec["downloads"][number] {
    const kind = classifyDownloadKind(d.url, `${d.type} ${d.title}`);
    return {
      kind,
      title: d.title,
      url: d.url,
      mimeType: inferMimeType(d.url),
      sizeBytes: null, // Intel doesn't publish size in the API response
      version: d.version,
      publishedAt: d.publishedDate
    };
  }

  private mapImage(img: IntelArkImage): ParsedManufacturerSpec["images"][number] {
    return {
      url: img.url,
      kind: classifyImageKind(img.alt || img.url),
      width: img.width,
      height: img.height
    };
  }

  /**
   * Extract physical dimensions from Intel's "Package Size" spec.
   * Intel publishes dimensions like "45.0 × 45.0 mm".
   */
  private extractPhysical(specs: ReadonlyArray<IntelArkSpec>): ParsedManufacturerSpec["physical"] {
    let lengthMm: number | null = null;
    let widthMm: number | null = null;
    let heightMm: number | null = null;
    let weightGrams: number | null = null;

    for (const s of specs) {
      const label = s.label.toLowerCase();
      if (label.includes("package size") || label.includes("dimensions")) {
        const match = s.value.match(/([\d.]+)\s*[×x]\s*([\d.]+)\s*(?:mm)?/i);
        if (match) {
          lengthMm = Number(match[1]);
          widthMm = Number(match[2]);
        }
      }
      if (label.includes("package height") || label.includes("height")) {
        const num = parseFloat(s.value);
        if (!isNaN(num)) heightMm = num;
      }
      if (label.includes("weight")) {
        const num = parseFloat(s.value);
        if (!isNaN(num)) weightGrams = num;
      }
    }

    return {
      lengthMm,
      widthMm,
      heightMm,
      weightGrams,
      packageContents: ["Processor", "Installation manual", "Thermal solution (boxed only)"]
    };
  }

  /**
   * Extract compatibility info from Intel's specs.
   * Socket + chipset list = compatibility.
   */
  private extractCompatibility(specs: ReadonlyArray<IntelArkSpec>): string[] {
    const compatibility: string[] = [];
    for (const s of specs) {
      const label = s.label.toLowerCase();
      if (label === "socket" || label.includes("socket")) {
        compatibility.push(`${s.value} socket`);
      }
      if (label.includes("chipset") || label.includes("compatible chipsets")) {
        for (const c of s.value.split(/[,;]/).map((x) => x.trim()).filter(Boolean)) {
          compatibility.push(`${c} chipset`);
        }
      }
    }
    return compatibility;
  }
}
