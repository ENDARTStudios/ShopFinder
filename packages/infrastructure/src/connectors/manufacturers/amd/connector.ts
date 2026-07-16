/**
 * @workspace/infrastructure/connectors/manufacturers/amd/connector
 *
 * AmdConnector — implements ManufacturerConnector for AMD Product Master.
 *
 * Extends BaseManufacturerConnector and implements:
 *   - buildEnrichRequest: GET https://api.amd.com/product-master/v1/products/{opn}
 *   - parseSpec: AmdProductParser.parse(response) → AmdProductMapper.map(...)
 *
 * Capabilities:
 *   - supportsDatasheets: true (AMD publishes datasheets for all SKUs)
 *   - supportsDrivers: true (AMD publishes chipset drivers + Ryzen Master)
 *   - supportsBios: false (BIOS is motherboard's responsibility)
 *   - supportsFirmware: true (AMD publishes AGESA firmware for some SKUs)
 *   - supportsLifecycle: true (AMD publishes launch/EOL dates)
 *   - supportsCertifications: true (RoHS, CE, FCC, Energy Star)
 *   - supportsWarranty: true (3 years Ryzen / 5 years EPYC)
 *   - supportsPhysicalSpecs: true (Package Dimensions)
 *   - supportsCompatibility: true (Socket + Chipsets)
 *   - supportsOfficialImages: true (product photos)
 *
 * Note that supportsDrivers=true and supportsFirmware=true — DIFFERENT
 * from IntelConnector, which sets both to false. This is intentional:
 * AMD publishes chipset drivers and Ryzen Master utility, while Intel
 * publishes drivers via the motherboard vendor.
 */
import { BaseManufacturerConnector } from "../common/base-manufacturer-connector";
import type { ManufacturerConnectorConfig, ParsedManufacturerSpec } from "../common/types";
import type {
  ManufacturerCode,
  ManufacturerCapabilities,
  ManufacturerEnrichmentRequest
} from "@workspace/domain/discovery/enrichment/types";
import type { HttpRequest, HttpResponse } from "../../core/types";
import { AmdProductParser } from "./parser";
import { AmdProductMapper } from "./mapper";

export class AmdConnector extends BaseManufacturerConnector {
  readonly manufacturer: ManufacturerCode = "amd";
  readonly providerVersion = "product-master-v1";
  readonly capabilities: ManufacturerCapabilities = {
    supportsDatasheets: true,
    supportsDrivers: true,    // AMD publishes chipset drivers + Ryzen Master
    supportsBios: false,      // BIOS is motherboard's responsibility
    supportsFirmware: true,   // AMD publishes AGESA firmware
    supportsLifecycle: true,
    supportsCertifications: true,
    supportsWarranty: true,
    supportsPhysicalSpecs: true,
    supportsCompatibility: true,
    supportsOfficialImages: true
  };

  private readonly parser: AmdProductParser;
  private readonly mapper: AmdProductMapper;
  private readonly apiBaseUrl: string;

  constructor(config: ManufacturerConnectorConfig, apiBaseUrl?: string) {
    super(config);
    this.parser = new AmdProductParser();
    this.mapper = new AmdProductMapper();
    this.apiBaseUrl = apiBaseUrl ?? "https://api.amd.com/product-master/v1";
  }

  protected buildEnrichRequest(request: ManufacturerEnrichmentRequest): HttpRequest {
    if (!request.mpn) {
      throw new Error("AmdConnector requires an MPN (OPN) to enrich");
    }

    // AMD Product Master API: GET /products/{opn}
    // OPN (Ordering Part Number) is AMD's canonical MPN,
    // e.g. "100-100000514WOF" for Ryzen 9 7950X
    return {
      method: "GET",
      url: `${this.apiBaseUrl}/products/${encodeURIComponent(request.mpn)}`,
      headers: {
        "Accept": "application/json"
      },
      timeoutMs: this.config.timeoutMs
    };
  }

  protected parseSpec(response: HttpResponse): ParsedManufacturerSpec {
    const parsed = this.parser.parse(response);
    if (!parsed.found) {
      return {
        matchedMpn: "",
        identifiers: { mpn: null, ean: null, upc: null, gtin: null, family: null, successorMpn: null },
        specifications: [],
        lifecycle: {
          status: "unknown",
          launchDate: null,
          eolDate: null,
          endOfSaleDate: null,
          successorMpn: null,
          sourceUrl: ""
        },
        downloads: [],
        images: [],
        certifications: [],
        warranty: {
          durationMonths: null,
          type: "unknown",
          region: null,
          termsUrl: null
        },
        physical: {
          lengthMm: null,
          widthMm: null,
          heightMm: null,
          weightGrams: null,
          packageContents: []
        },
        compatibility: [],
        sourceUrl: "",
        fetchWarnings: ["Product not found in AMD Product Master"]
      };
    }
    return this.mapper.map(parsed);
  }
}

export function createAmdConnector(
  config: ManufacturerConnectorConfig,
  apiBaseUrl?: string
): AmdConnector {
  return new AmdConnector(config, apiBaseUrl);
}
