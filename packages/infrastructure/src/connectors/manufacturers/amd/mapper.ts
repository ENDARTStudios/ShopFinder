/**
 * @workspace/infrastructure/connectors/manufacturers/amd/mapper
 *
 * Maps ParsedAmdProductSpec → ParsedManufacturerSpec.
 *
 * AMD-specific knowledge:
 *   - AMD uses "# of CPU Cores" instead of Intel's "Total Cores"
 *   - AMD uses "Base Clock" / "Max Boost Clock" instead of "Processor Base Frequency"
 *   - AMD uses "Default TDP" instead of "Processor Base Power"
 *   - AMD uses "Socket" but also "CPU Socket" in some categories
 *   - AMD publishes "OPN" (Ordering Part Number) as the canonical MPN
 *   - AMD standard warranty: 3 years for boxed Ryzen, 5 years for EPYC
 *   - AMD standard certifications: RoHS, CE, FCC, Energy Star (varies)
 *
 * The mapper is pure — no I/O, no side effects. Unit-tested with fixtures.
 */
import type { ParsedAmdProductSpec, AmdSpec, AmdDownload, AmdImage } from "./parser";
import type { ParsedManufacturerSpec } from "../common/types";
import {
  parseNumericSpec,
  normalizeSpecName,
  canonicalLifecycleStatus,
  classifyImageKind,
  classifyDownloadKind,
  inferMimeType
} from "../common/spec-parser";

// ── AMD spec label → canonical name mapping ────────────────

const AMD_SPEC_NAME_MAP: Readonly<Record<string, string>> = {
  "# of CPU Cores": "cores",
  "# of Threads": "threads",
  "Base Clock": "base_clock",
  "Max Boost Clock": "max_turbo",
  "Minimum Master Frequency": "min_master_clock",
  "All Core Boost Frequency": "all_core_boost",
  "Default TDP": "tdp",
  "cTDP": "ctdp",  // configurable TDP
  "PBO Limit": "pbo_limit",  // Precision Boost Overdrive
  "L1 Cache": "l1_cache",
  "L2 Cache": "l2_cache",
  "L3 Cache": "l3_cache",
  "Lithography": "lithography",
  "CPU Socket": "socket",
  "Socket": "socket",
  "Max Memory Size": "max_memory",
  "Memory Type": "memory_type",
  "Memory Channels": "memory_channels",
  "Memory Channels Supported": "memory_channels",
  "PCI Express Version": "pcie_version",
  "PCIe Version": "pcie_version",
  "Max PCIe Lanes": "pcie_lanes",
  "Thermal Solution": "thermal_solution",
  "Processor Technology for I/O Die": "io_die_technology",
  "Operating System (OS)": "os_compatibility",
  "Max Operating Temperature (Tjmax)": "max_temp",
  "Operating Temperature (Tcase Max)": "max_temp",
  "Package Dimensions": "package_size",
  "Weight": "weight",
  "Graphics": "graphics",
  "Graphics Model": "graphics_model",
  "Max Resolution (HDMI)": "max_resolution_hdmi",
  "Max Resolution (DP)": "max_resolution_dp",
  "Launch Date": "launch_date",
  "Part Number": "mpn",
  "OPN": "mpn",
  "Ordering Part Number (OPN)": "mpn"
};

// ── Mapper ─────────────────────────────────────────────────

export class AmdProductMapper {
  map(parsed: ParsedAmdProductSpec): ParsedManufacturerSpec {
    const sourceUrl = parsed.sourceUrl;

    // Specifications: apply AMD name → canonical name mapping
    const specifications = parsed.specs
      .filter((s) => s.name && s.value)
      .map((s) => {
        const canonicalName = AMD_SPEC_NAME_MAP[s.name] ?? normalizeSpecName(s.name);
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

    // Downloads
    const downloads = parsed.downloads.map((d) => this.mapDownload(d, sourceUrl));

    // Images
    const images = parsed.images.map((img) => this.mapImage(img));

    // Identifiers: AMD OPN is the canonical MPN. EAN/UPC/GTIN not in Product Master.
    const identifiers = {
      mpn: parsed.productCode,
      ean: null as string | null,
      upc: null as string | null,
      gtin: null as string | null,
      family: parsed.productFamily,
      successorMpn: parsed.successorCode
    };

    // Certifications: AMD publishes RoHS + CE compliance; Energy Star varies
    const certifications = this.extractCertifications(parsed.specs, sourceUrl);

    // Warranty: infer from product family — EPYC gets 5 years, Ryzen 3 years
    const warranty = this.inferWarranty(parsed.productFamily);

    // Physical specs: extract from Package Dimensions / Weight specs
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
      fetchWarnings: parsed.found ? [] : ["Product not found in AMD Product Master"]
    };
  }

  private mapDownload(
    d: AmdDownload,
    _sourceUrl: string
  ): ParsedManufacturerSpec["downloads"][number] {
    const kind = classifyDownloadKind(d.url, `${d.type} ${d.title}`);
    return {
      kind,
      title: d.title,
      url: d.url,
      mimeType: inferMimeType(d.url),
      sizeBytes: null,
      version: d.version,
      publishedAt: d.publishedDate
    };
  }

  private mapImage(img: AmdImage): ParsedManufacturerSpec["images"][number] {
    return {
      url: img.url,
      kind: classifyImageKind(img.alt || img.url),
      width: img.width,
      height: img.height
    };
  }

  /**
   * Extract certifications from AMD specs.
   * AMD publishes RoHS compliance and Energy Star eligibility in specs.
   * CE/FCC compliance is standard for all AMD processors (hardcoded).
   */
  private extractCertifications(
    specs: ReadonlyArray<AmdSpec>,
    sourceUrl: string
  ): ParsedManufacturerSpec["certifications"] {
    const certs: ParsedManufacturerSpec["certifications"] = [
      { name: "RoHS", code: null, issuedBy: "AMD", validUntil: null, sourceUrl },
      { name: "CE", code: null, issuedBy: "AMD", validUntil: null, sourceUrl },
      { name: "FCC", code: null, issuedBy: "AMD", validUntil: null, sourceUrl }
    ];

    // Check for Energy Star spec
    for (const s of specs) {
      const lower = s.name.toLowerCase();
      if (lower.includes("energy star") && s.value.toLowerCase() === "yes") {
        certs.push({
          name: "Energy Star",
          code: null,
          issuedBy: "AMD",
          validUntil: null,
          sourceUrl
        });
        break;
      }
    }

    return certs;
  }

  /**
   * Infer warranty from product family.
   *   - EPYC: 5 years limited
   *   - Ryzen Threadripper PRO: 3 years limited
   *   - Ryzen desktop (boxed): 3 years limited
   *   - Default fallback: 3 years limited
   */
  private inferWarranty(family: string | null): ParsedManufacturerSpec["warranty"] {
    const lower = (family ?? "").toLowerCase();
    if (lower.includes("epyc")) {
      return {
        durationMonths: 60,
        type: "limited",
        region: "global",
        termsUrl: "https://www.amd.com/en/support/warranties"
      };
    }
    if (lower.includes("threadripper pro")) {
      return {
        durationMonths: 36,
        type: "limited",
        region: "global",
        termsUrl: "https://www.amd.com/en/support/warranties"
      };
    }
    return {
      durationMonths: 36,
      type: "limited",
      region: "global",
      termsUrl: "https://www.amd.com/en/support/warranties"
    };
  }

  /**
   * Extract physical dimensions from AMD "Package Dimensions" spec.
   * AMD publishes dimensions like "40 × 40 mm" or "71.0 × 56.5 mm".
   */
  private extractPhysical(specs: ReadonlyArray<AmdSpec>): ParsedManufacturerSpec["physical"] {
    let lengthMm: number | null = null;
    let widthMm: number | null = null;
    let heightMm: number | null = null;
    let weightGrams: number | null = null;

    for (const s of specs) {
      const label = s.name.toLowerCase();
      if (label.includes("package dimensions") || label.includes("dimensions")) {
        const match = s.value.match(/([\d.]+)\s*[×x]\s*([\d.]+)\s*(?:mm)?/i);
        if (match) {
          lengthMm = Number(match[1]);
          widthMm = Number(match[2]);
        }
      }
      if (label.includes("package height") || label === "height") {
        const num = parseFloat(s.value);
        if (!isNaN(num)) heightMm = num;
      }
      if (label === "weight" || label.includes("weight")) {
        const num = parseFloat(s.value);
        if (!isNaN(num)) weightGrams = num;
      }
    }

    return {
      lengthMm,
      widthMm,
      heightMm,
      weightGrams,
      packageContents: ["Processor", "Installation manual"] // AMD boxed adds cooler for non-X variants
    };
  }

  /**
   * Extract compatibility info from AMD specs.
   * Socket + chipsets (if present in "CPU Socket" or "Compatible Chipsets" spec).
   */
  private extractCompatibility(specs: ReadonlyArray<AmdSpec>): string[] {
    const compatibility: string[] = [];
    for (const s of specs) {
      const label = s.name.toLowerCase();
      if (label === "cpu socket" || label === "socket") {
        compatibility.push(`${s.value} socket`);
      }
      if (label.includes("chipset") || label.includes("compatible chipset")) {
        for (const c of s.value.split(/[,;]/).map((x) => x.trim()).filter(Boolean)) {
          compatibility.push(`${c} chipset`);
        }
      }
      // AMD's "Motherboard Chipsets" spec is Ryzen-specific
      if (label === "motherboard chipsets") {
        for (const c of s.value.split(/[,;]/).map((x) => x.trim()).filter(Boolean)) {
          compatibility.push(`${c} chipset`);
        }
      }
    }
    return compatibility;
  }
}
