/**
 * @workspace/domain/discovery/enrichment/types
 *
 * Rich Manufacturer domain model for ShopFinder.
 *
 * Replaces the simple Tier A/B/C/D system with two independent axes:
 *   - AuthorityScore (0-100): how trustworthy the source is
 *   - CoverageScore (0-100): how complete the manufacturer's data is
 *
 * Each manufacturer is a full entity with:
 *   - Country of origin (USA, Taiwan, China, Japan, etc.)
 *   - Segments (CPU, GPU, Motherboard, SSD, Memory, Cooling, etc.)
 *   - Multilingual aliases (English + Chinese characters + pinyin)
 *   - Commercial brands (separate from manufacturer entity)
 *   - Status (ACTIVE, DISCONTINUED, OEM, ODM, UNKNOWN)
 *   - Official domains (website, support, download center, datasheet base)
 *   - Supported certifications (CE, FCC, RoHS, UL, ANATEL, INMETRO, etc.)
 *
 * This makes enrichment, conflict resolution, and compliance
 * significantly more robust without changing the pipeline architecture.
 */
import type { BrandedId } from "../../shared";

// ── Branded IDs ────────────────────────────────────────────

export type EnrichmentId = BrandedId<"EnrichmentId">;
export type EnrichmentBatchId = BrandedId<"EnrichmentBatchId">;
export type ManufacturerSourceId = BrandedId<"ManufacturerSourceId">;
export type ManufacturerId = BrandedId<"ManufacturerId">;

// ── Country of origin ──────────────────────────────────────

export type CountryCode =
  | "US" // United States
  | "TW" // Taiwan
  | "CN" // China
  | "JP" // Japan
  | "KR" // South Korea
  | "DE" // Germany
  | "NL" // Netherlands
  | "OTHER";

export const COUNTRY_NAMES: Record<CountryCode, string> = {
  US: "United States",
  TW: "Taiwan",
  CN: "China",
  JP: "Japan",
  KR: "South Korea",
  DE: "Germany",
  NL: "Netherlands",
  OTHER: "Other"
};

// ── Manufacturer status ────────────────────────────────────

export type ManufacturerStatus =
  | "ACTIVE" // Actively selling products
  | "DISCONTINUED" // No longer operating
  | "OEM" // Original Equipment Manufacturer (makes for others)
  | "ODM" // Original Design Manufacturer (designs + makes for others)
  | "UNKNOWN";

// ── Product segments ───────────────────────────────────────

export type ProductSegment =
  | "CPU"
  | "GPU"
  | "Motherboard"
  | "SSD"
  | "Memory"
  | "Cooling"
  | "PowerSupply"
  | "Case"
  | "MiniPC"
  | "Networking"
  | "Peripherals"
  | "Displays";

export const SEGMENT_LABELS: Record<ProductSegment, string> = {
  CPU: "Processadores",
  GPU: "Placas de Vídeo",
  Motherboard: "Placas-mãe",
  SSD: "SSD & Storage",
  Memory: "Memória RAM",
  Cooling: "Refrigeração",
  PowerSupply: "Fontes",
  Case: "Gabinetes",
  MiniPC: "Mini PCs",
  Networking: "Redes",
  Peripherals: "Periféricos",
  Displays: "Monitores"
};

// ── Certifications ─────────────────────────────────────────

export type Certification =
  "CE" | "FCC" | "RoHS" | "UL" | "ANATEL" | "INMETRO" | "UKCA" | "EnergyStar" | "CCC";

export const CERTIFICATION_LABELS: Record<Certification, string> = {
  CE: "CE (European Conformity)",
  FCC: "FCC (US Federal Communications Commission)",
  RoHS: "RoHS (Restriction of Hazardous Substances)",
  UL: "UL (Underwriters Laboratories)",
  ANATEL: "ANATEL (Brazil Telecom Agency)",
  INMETRO: "INMETRO (Brazil Metrology)",
  UKCA: "UKCA (UK Conformity Assessed)",
  EnergyStar: "Energy Star",
  CCC: "CCC (China Compulsory Certification)"
};

// ── Manufacturer entity (rich model) ───────────────────────

export interface Manufacturer {
  readonly id: ManufacturerId;
  readonly code: string; // canonical code, e.g. "colorful"
  readonly name: string; // official name, e.g. "Shenzhen Colorful Technology"
  readonly shortName: string; // common name, e.g. "Colorful"
  readonly country: CountryCode; // country of origin
  readonly authorityScore: number; // 0-100, overall trustworthiness
  readonly coverageScore: number; // 0-100, overall completeness
  readonly segmentCoverage: Readonly<Partial<Record<ProductSegment, number>>>; // coverage per segment
  readonly authority: AuthorityByAttribute; // authority per information type
  readonly capabilities: CapabilityProfile; // quality levels per capability
  readonly segments: ReadonlyArray<ProductSegment>;
  readonly aliases: ReadonlyArray<string>; // multilingual: English + Chinese chars + pinyin
  readonly brands: ReadonlyArray<string>; // commercial brand names (separate from manufacturer)
  readonly status: ManufacturerStatus;
  readonly officialWebsite?: string;
  readonly supportWebsite?: string;
  readonly downloadCenter?: string;
  readonly datasheetBase?: string;
  readonly certifications: ReadonlyArray<Certification>;
}

// ── Authority by attribute ─────────────────────────────────
// Different sources are authoritative for different information types.
// The manufacturer is authoritative for specs/images/docs/lifecycle/warranty,
// but NOT for pricing/inventory (distributors and retailers are better).

export type AttributeType =
  | "specifications"
  | "images"
  | "documentation"
  | "lifecycle"
  | "warranty"
  | "pricing"
  | "inventory"
  | "compatibility";

export type AuthorityByAttribute = Readonly<Partial<Record<AttributeType, number>>>;

export const ATTRIBUTE_LABELS: Record<AttributeType, string> = {
  specifications: "Especificações",
  images: "Imagens oficiais",
  documentation: "Documentação (datasheets)",
  lifecycle: "Ciclo de vida (EOL)",
  warranty: "Garantia",
  pricing: "Preço",
  inventory: "Estoque",
  compatibility: "Compatibilidade"
};

// ── Capability levels (quality, not just boolean) ──────────
// none = doesn't provide this data
// partial = provides incomplete or low-quality data
// good = provides adequate data
// excellent = provides comprehensive, high-quality data

export type CapabilityLevel = "none" | "partial" | "good" | "excellent";

export const CAPABILITY_LEVEL_VALUES: Record<CapabilityLevel, number> = {
  none: 0,
  partial: 25,
  good: 75,
  excellent: 100
};

export type CapabilityKey =
  | "specifications"
  | "datasheets"
  | "drivers"
  | "firmware"
  | "images"
  | "warranty"
  | "certifications"
  | "lifecycle"
  | "support";

export type CapabilityProfile = Readonly<Record<CapabilityKey, CapabilityLevel>>;

export const CAPABILITY_LABELS: Record<CapabilityKey, string> = {
  specifications: "Especificações",
  datasheets: "Datasheets",
  drivers: "Drivers",
  firmware: "Firmware",
  images: "Imagens",
  warranty: "Garantia",
  certifications: "Certificações",
  lifecycle: "Ciclo de vida",
  support: "Suporte"
};

// ── ManufacturerConnector (operational aggregate, separate from Manufacturer) ──
// Multiple connectors can exist for the same manufacturer:
//   - official API connector
//   - scraper connector
//   - mirror/partner connector
// Swapping a connector doesn't change the manufacturer identity.

export type ConnectorId = BrandedId<"ConnectorId">;

export type ConnectorStatus = "healthy" | "degraded" | "down" | "not_configured";

export type ConnectorKind = "official_api" | "scraper" | "mirror" | "partner";

export interface ManufacturerConnector {
  readonly id: ConnectorId;
  readonly manufacturerId: ManufacturerId;
  readonly manufacturerCode: string;
  readonly name: string; // "Intel Ark API", "Colorful Scraper"
  readonly kind: ConnectorKind;
  readonly version: string; // "ark-v1", "scraper-v2"
  readonly status: ConnectorStatus;
  readonly successRate: number; // 0-100
  readonly averageLatencyMs: number;
  readonly lastSuccessfulSync: string | null;
  readonly lastFailure: string | null;
  readonly rateLimitRemaining: number | null;
  readonly rateLimitWindow: number | null; // seconds
  readonly endpoint: string; // "https://api.intel.com/ark/v1"
  readonly authType: string; // "api_key", "oauth2", "none"
}

// ── InformationSource (provenance for each enriched attribute) ──
// Every enriched attribute can be traced back to its source.

export type InformationSourceId = BrandedId<"InformationSourceId">;

export interface InformationSource {
  readonly id: InformationSourceId;
  readonly manufacturerId: ManufacturerId;
  readonly manufacturerCode: string;
  readonly connectorId: ConnectorId | null;
  readonly attributeType: AttributeType;
  readonly attributeName: string; // "cores", "base_clock", "tdp"
  readonly url: string; // exact URL the data came from
  readonly retrievedAt: string; // ISO date
  readonly checksum: string; // SHA-256 of the raw value
  readonly confidence: number; // 0-1
  readonly rawValue: string; // original value before normalization
}

// ── ManufacturerVersion (immutable history of profile changes) ──
// Follows the same "artifacts are immutable" philosophy as the rest
// of the ShopFinder pipeline.

export type ManufacturerVersionId = BrandedId<"ManufacturerVersionId">;

export interface ManufacturerVersion {
  readonly id: ManufacturerVersionId;
  readonly manufacturerId: ManufacturerId;
  readonly manufacturerCode: string;
  readonly version: number; // 1, 2, 3, ...
  readonly effectiveFrom: string; // ISO date
  readonly changes: ReadonlyArray<string>; // ["Changed officialWebsite", "Added segment: GPU"]
  readonly previousVersionId: ManufacturerVersionId | null;
}

// ── Legacy tier mapping (for backward compat) ──────────────

export type ManufacturerTier = "A" | "B" | "C" | "D";

export const TIER_AUTHORITY_RANGES: Record<ManufacturerTier, { min: number; max: number }> = {
  A: { min: 98, max: 100 },
  B: { min: 92, max: 97 },
  C: { min: 82, max: 91 },
  D: { min: 70, max: 81 }
};

export function getTier(authorityScore: number): ManufacturerTier {
  if (authorityScore >= 98) return "A";
  if (authorityScore >= 92) return "B";
  if (authorityScore >= 82) return "C";
  return "D";
}

// ── Default helpers ────────────────────────────────────────

export const DEFAULT_MANUFACTURER_AUTHORITY: AuthorityByAttribute = {
  specifications: 100,
  images: 95,
  documentation: 100,
  lifecycle: 100,
  warranty: 98,
  compatibility: 95,
  pricing: 10,
  inventory: 5
};

export const DEFAULT_CAPABILITIES: CapabilityProfile = {
  specifications: "excellent",
  datasheets: "good",
  drivers: "none",
  firmware: "none",
  images: "good",
  warranty: "good",
  certifications: "partial",
  lifecycle: "good",
  support: "partial"
};

export type { BrandedId };
