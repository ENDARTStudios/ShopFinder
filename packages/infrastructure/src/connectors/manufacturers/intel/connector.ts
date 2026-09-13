/**
 * @workspace/infrastructure/connectors/manufacturers/intel/connector
 *
 * IntelConnector — implements ManufacturerConnector for Intel Ark.
 *
 * Extends BaseManufacturerConnector and implements:
 *   - buildEnrichRequest: GET https://api.intel.com/ark/v1/products/{mpn}
 *   - parseSpec: IntelArkParser.parse(response)
 *
 * The mapper (IntelArkMapper) converts ParsedIntelArkSpec → ParsedManufacturerSpec,
 * and the base class converts ParsedManufacturerSpec → ManufacturerSource artifact.
 *
 * Capabilities:
 *   - supportsDatasheets: true (Intel publishes PDFs for all CPUs)
 *   - supportsDrivers: false (CPUs don't have drivers)
 *   - supportsBios: false (BIOS is motherboard's responsibility)
 *   - supportsFirmware: false (CPUs don't have firmware)
 *   - supportsLifecycle: true (Intel Ark has launch/EOL dates)
 *   - supportsCertifications: true (RoHS, CE, FCC)
 *   - supportsWarranty: true (3-year limited standard)
 *   - supportsPhysicalSpecs: true (package size, weight)
 *   - supportsCompatibility: true (socket + chipset list)
 *   - supportsOfficialImages: true (product photos)
 */
import { BaseManufacturerConnector } from "../common/base-manufacturer-connector";
import type { ManufacturerConnectorConfig, ParsedManufacturerSpec } from "../common/types";
import type {
  ManufacturerCode,
  ManufacturerCapabilities,
  ManufacturerEnrichmentRequest
} from "@workspace/domain/discovery/enrichment/types";
import type { HttpRequest, HttpResponse } from "../../core/types";
import { IntelArkParser } from "./parser";
import { IntelArkMapper } from "./mapper";

export class IntelConnector extends BaseManufacturerConnector {
  readonly manufacturer: ManufacturerCode = "intel";
  readonly providerVersion = "ark-v1";
  readonly capabilities: ManufacturerCapabilities = {
    supportsDatasheets: true,
    supportsDrivers: false, // CPUs don't have drivers
    supportsBios: false,    // BIOS is motherboard's responsibility
    supportsFirmware: false,
    supportsLifecycle: true,
    supportsCertifications: true,
    supportsWarranty: true,
    supportsPhysicalSpecs: true,
    supportsCompatibility: true,
    supportsOfficialImages: true
  };

  private readonly parser: IntelArkParser;
  private readonly mapper: IntelArkMapper;
  private readonly apiBaseUrl: string;

  constructor(config: ManufacturerConnectorConfig, apiBaseUrl?: string) {
    super(config);
    this.parser = new IntelArkParser();
    this.mapper = new IntelArkMapper();
    this.apiBaseUrl = apiBaseUrl ?? "https://api.intel.com/ark/v1";
  }

  protected buildEnrichRequest(request: ManufacturerEnrichmentRequest): HttpRequest {
    if (!request.mpn) {
      throw new Error("IntelConnector requires an MPN to enrich");
    }

    // Intel Ark API: GET /products/{productCode}
    // The product code is the MPN (e.g. "BX8071514900K")
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
      // Return an empty spec with not_found fetchWarnings — the base class
      // will treat this as a not_found source
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
        fetchWarnings: ["Product not found in Intel Ark"]
      };
    }
    return this.mapper.map(parsed);
  }
}

export function createIntelConnector(
  config: ManufacturerConnectorConfig,
  apiBaseUrl?: string
): IntelConnector {
  return new IntelConnector(config, apiBaseUrl);
}
