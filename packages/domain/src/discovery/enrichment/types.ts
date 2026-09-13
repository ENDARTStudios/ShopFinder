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

// ── Attribute types ────────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════
// 1. PROVENANCE GRAPH — AttributeEvidence
// ═══════════════════════════════════════════════════════════
// An attribute is not a single assertion — it's a CONCLUSION drawn
// from multiple evidence sources. This is the Knowledge Graph model.

export type EvidenceId = BrandedId<"EvidenceId">;
export type ProductAttributeId = BrandedId<"ProductAttributeId">;

export type SourceType =
  | "manufacturer"
  | "datasheet"
  | "distributor"
  | "retailer"
  | "marketplace"
  | "ai_inference"
  | "user_input"
  | "third_party";

export interface AttributeEvidence {
  readonly id: EvidenceId;
  readonly sourceType: SourceType;
  readonly sourceName: string;         // "Intel Ark", "DigiKey", "Amazon"
  readonly connectorId: ConnectorId | null;
  readonly confidence: number;          // 0-1
  readonly extractedValue: string;      // raw value as found
  readonly normalizedValue: string;     // value after normalization
  readonly checksum: string;            // SHA-256 of extractedValue
  readonly retrievedAt: string;         // ISO date
  readonly url: string;                 // exact URL
}

export interface ProductAttribute {
  readonly id: ProductAttributeId;
  readonly name: string;                // "socket", "cores", "base_clock"
  readonly value: string;               // final concluded value "LGA1700"
  readonly attributeType: AttributeType;
  readonly evidence: ReadonlyArray<AttributeEvidence>;
  readonly resolvedAt: string;          // when the conclusion was reached
  readonly resolver: string;            // "authority_policy_v1"
  readonly confidence: number;          // 0-1, weighted from evidence
}

// ── InformationSource (raw source metadata, separate from evidence) ──

export type InformationSourceId = BrandedId<"InformationSourceId">;

export interface InformationSource {
  readonly id: InformationSourceId;
  readonly manufacturerId: ManufacturerId;
  readonly manufacturerCode: string;
  readonly connectorId: ConnectorId | null;
  readonly attributeType: AttributeType;
  readonly attributeName: string;
  readonly url: string;
  readonly retrievedAt: string;
  readonly checksum: string;
  readonly confidence: number;
  readonly rawValue: string;
}

// ═══════════════════════════════════════════════════════════
// 2. AUTHORITY POLICY — dynamic, not static
// ═══════════════════════════════════════════════════════════
// Authority is resolved by a Policy, not hardcoded per manufacturer.
// The resolver considers: country, segment, age, connector, confidence.

export interface AuthorityPolicyInput {
  readonly attribute: AttributeType;
  readonly sourceType: SourceType;
  readonly manufacturerCode: string;
  readonly manufacturerCountry: CountryCode;
  readonly segment: ProductSegment | null;
  readonly connectorKind: ConnectorKind | null;
  readonly evidenceAge: number;         // seconds since retrieval
  readonly evidenceConfidence: number;  // 0-1
}

export interface AuthorityPolicyResult {
  readonly score: number;               // 0-100
  readonly reason: string;
  readonly factors: ReadonlyArray<{ name: string; value: number; weight: number }>;
}

export interface AuthorityPolicy {
  readonly name: string;
  readonly version: string;
  resolve(input: AuthorityPolicyInput): AuthorityPolicyResult;
}

// ── Default AuthorityPolicy implementation ─────────────────

export const DEFAULT_AUTHORITY_POLICY: AuthorityPolicy = {
  name: "default-authority-v1",
  version: "1.0.0",
  resolve(input: AuthorityPolicyInput): AuthorityPolicyResult {
    const factors: Array<{ name: string; value: number; weight: number }> = [];

    // Factor 1: Source type base authority
    const sourceBase: Record<SourceType, number> = {
      manufacturer: 100,
      datasheet: 95,
      distributor: 80,
      retailer: 70,
      marketplace: 60,
      ai_inference: 50,
      user_input: 40,
      third_party: 30
    };
    const sourceScore = sourceBase[input.sourceType] ?? 50;
    factors.push({ name: "source_type", value: sourceScore, weight: 0.40 });

    // Factor 2: Evidence confidence
    factors.push({ name: "confidence", value: input.evidenceConfidence * 100, weight: 0.30 });

    // Factor 3: Freshness (newer = better, decays over 30 days)
    const ageDays = input.evidenceAge / 86400;
    const freshnessScore = Math.max(0, 100 - (ageDays / 30) * 100);
    factors.push({ name: "freshness", value: freshnessScore, weight: 0.15 });

    // Factor 4: Connector quality (official_api > scraper > partner)
    const connectorScore = input.connectorKind === "official_api" ? 100
      : input.connectorKind === "scraper" ? 70
      : input.connectorKind === "partner" ? 60
      : input.connectorKind === "mirror" ? 80
      : 50;
    factors.push({ name: "connector", value: connectorScore, weight: 0.15 });

    // Weighted sum
    const score = Math.round(
      factors.reduce((sum, f) => sum + f.value * f.weight, 0)
    );

    const reason = `source=${input.sourceType}(${sourceScore}) conf=${input.evidenceConfidence} age=${ageDays.toFixed(1)}d connector=${input.connectorKind ?? "none"}`;

    return { score, reason, factors };
  }
};

// ═══════════════════════════════════════════════════════════
// 3. CONNECTOR REGISTRY — Definition + Instance
// ═══════════════════════════════════════════════════════════
// ConnectorDefinition = template (what the connector IS)
// ConnectorInstance = runtime (how it's deployed + health)

export type ConnectorDefinitionId = BrandedId<"ConnectorDefinitionId">;
export type ConnectorInstanceId = BrandedId<"ConnectorInstanceId">;

export type ConnectorKind = "official_api" | "scraper" | "mirror" | "partner";
export type ConnectorStatus = "healthy" | "degraded" | "down" | "not_configured";
export type ConnectorEnvironment = "production" | "staging" | "internal" | "partner";

export type AuthType = "api_key" | "oauth2" | "basic" | "hmac" | "none";
export type ProtocolType = "rest" | "graphql" | "soap" | "scrape_html" | "ftp" | "file";

export interface ConnectorDefinition {
  readonly id: ConnectorDefinitionId;
  readonly manufacturerCode: string;
  readonly name: string;                // "Intel Ark API"
  readonly kind: ConnectorKind;
  readonly version: string;             // "ark-v1"
  readonly protocol: ProtocolType;
  readonly endpoint: string;
  readonly authType: AuthType;
  readonly capabilities: ConnectorCapabilityDescriptor;
  readonly parserModule: string;        // "intel/parser.ts"
  readonly mapperModule: string;        // "intel/mapper.ts"
  readonly rateLimitPerHour: number;
}

export interface ConnectorInstance {
  readonly id: ConnectorInstanceId;
  readonly definitionId: ConnectorDefinitionId;
  readonly manufacturerCode: string;
  readonly environment: ConnectorEnvironment;
  readonly status: ConnectorStatus;
  readonly successRate: number;
  readonly averageLatencyMs: number;
  readonly lastSuccessfulSync: string | null;
  readonly lastFailure: string | null;
  readonly rateLimitRemaining: number | null;
  readonly rateLimitWindow: number | null;
  readonly credentialsRef: string | null;   // reference to secret store
}

// Legacy alias for backward compat
export type ConnectorId = ConnectorInstanceId;
export type ManufacturerConnector = ConnectorInstance;

// ═══════════════════════════════════════════════════════════
// 4. DECLARATIVE CAPABILITIES — not opinion, but facts
// ═══════════════════════════════════════════════════════════
// Instead of "drivers = excellent", describe WHAT the connector provides.

export type CapabilityLevel = "none" | "partial" | "good" | "excellent";

export const CAPABILITY_LEVEL_VALUES: Record<CapabilityLevel, number> = {
  none: 0, partial: 25, good: 75, excellent: 100
};

export type CapabilityKey =
  | "specifications" | "datasheets" | "drivers" | "firmware"
  | "images" | "warranty" | "certifications" | "lifecycle" | "support";

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

export interface ConnectorCapabilityDescriptor {
  readonly specifications: DataCapability;
  readonly datasheets: DataCapability;
  readonly drivers: DataCapability;
  readonly firmware: DataCapability;
  readonly images: DataCapability;
  readonly warranty: DataCapability;
  readonly certifications: DataCapability;
  readonly lifecycle: DataCapability;
  readonly support: DataCapability;
}

export interface DataCapability {
  readonly level: CapabilityLevel;
  readonly formats: ReadonlyArray<string>;      // ["pdf", "json", "xml", "html"]
  readonly languages: ReadonlyArray<string>;     // ["en", "zh", "pt"]
  readonly supportsSearch: boolean;
  readonly supportsVersionHistory: boolean;
  readonly supportsLocalization: boolean;
  readonly supportsChecksums: boolean;
  readonly supportsAPI: boolean;
  readonly supportsBulk: boolean;
  readonly supportsPagination: boolean;
}

// ── Default capability descriptors ─────────────────────────

export const NO_CAPABILITY: DataCapability = {
  level: "none", formats: [], languages: [],
  supportsSearch: false, supportsVersionHistory: false, supportsLocalization: false,
  supportsChecksums: false, supportsAPI: false, supportsBulk: false, supportsPagination: false
};

export const EXCELLENT_REST_CAPABILITY: DataCapability = {
  level: "excellent", formats: ["json", "xml"], languages: ["en"],
  supportsSearch: true, supportsVersionHistory: true, supportsLocalization: true,
  supportsChecksums: true, supportsAPI: true, supportsBulk: true, supportsPagination: true
};

export const GOOD_REST_CAPABILITY: DataCapability = {
  level: "good", formats: ["json"], languages: ["en"],
  supportsSearch: true, supportsVersionHistory: false, supportsLocalization: false,
  supportsChecksums: false, supportsAPI: true, supportsBulk: false, supportsPagination: true
};

export const PARTIAL_SCRAPE_CAPABILITY: DataCapability = {
  level: "partial", formats: ["html"], languages: ["zh", "en"],
  supportsSearch: false, supportsVersionHistory: false, supportsLocalization: false,
  supportsChecksums: false, supportsAPI: false, supportsBulk: false, supportsPagination: false
};

// ── Default profiles for Manufacturer ──────────────────────

export const DEFAULT_MANUFACTURER_AUTHORITY: AuthorityByAttribute = {
  specifications: 100, images: 95, documentation: 100,
  lifecycle: 100, warranty: 98, compatibility: 95,
  pricing: 10, inventory: 5
};

export const DEFAULT_CAPABILITIES: CapabilityProfile = {
  specifications: "excellent", datasheets: "good", drivers: "none",
  firmware: "none", images: "good", warranty: "good",
  certifications: "partial", lifecycle: "good", support: "partial"
};

// ── Legacy connector type re-export ────────────────────────

export type ConnectorHealth = {
  readonly status: ConnectorStatus;
  readonly successRate: number;
  readonly averageLatencyMs: number;
  readonly lastSuccessfulSync: string | null;
  readonly lastFailure: string | null;
  readonly rateLimitRemaining: number | null;
};

// ═══════════════════════════════════════════════════════════
// ManufacturerVersion (immutable history — unchanged)
// ═══════════════════════════════════════════════════════════

export type ManufacturerVersionId = BrandedId<"ManufacturerVersionId">;

export interface ManufacturerVersion {
  readonly id: ManufacturerVersionId;
  readonly manufacturerId: ManufacturerId;
  readonly manufacturerCode: string;
  readonly version: number;
  readonly effectiveFrom: string;
  readonly changes: ReadonlyArray<string>;
  readonly previousVersionId: ManufacturerVersionId | null;
}

// ── Legacy tier mapping ────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════
// CONFIDENCE SCORE — multi-dimensional, not just a number
// ═══════════════════════════════════════════════════════════

export interface ConfidenceScore {
  readonly overall: number;         // 0-100, weighted composite
  readonly manufacturer: number;    // 0-100, authority of manufacturer source
  readonly consensus: number;       // 0-100, agreement across sources
  readonly freshness: number;       // 0-100, how recent the data is
  readonly parser: number;          // 0-100, extraction quality
  readonly ai: number;              // 0-100, AI model confidence
}

export function computeOverallConfidence(components: Omit<ConfidenceScore, "overall">): number {
  const weights = { manufacturer: 0.30, consensus: 0.25, freshness: 0.15, parser: 0.15, ai: 0.15 };
  return Math.round(
    components.manufacturer * weights.manufacturer +
    components.consensus * weights.consensus +
    components.freshness * weights.freshness +
    components.parser * weights.parser +
    components.ai * weights.ai
  );
}

// ═══════════════════════════════════════════════════════════
// DECISION EXPLANATION — structured audit trail from PolicyEngine
// ═══════════════════════════════════════════════════════════

export interface DecisionExplanation {
  readonly attributeName: string;           // "cpu.socket"
  readonly chosenValue: string;              // "LGA1700"
  readonly confidence: ConfidenceScore;
  readonly winningEvidence: AttributeEvidence;
  readonly discardedEvidence: ReadonlyArray<{
    evidence: AttributeEvidence;
    reason: string;                          // "Lower authority source"
  }>;
  readonly policyApplied: string;            // "default-authority-v1"
  readonly reason: string;                   // "Manufacturer outranks Marketplace. Manufacturer confidence 100. Marketplace confidence 72. Consensus 96%."
}

export type { BrandedId };

// ═══════════════════════════════════════════════════════════
// LEGACY COMPAT — aliases for the original enrichment module
// These exist so that packages/infrastructure/src/connectors/manufacturers/
// can still import from @workspace/domain/discovery/enrichment/types
// until they are migrated to ConnectorDefinition + ConnectorInstance.
// ═══════════════════════════════════════════════════════════

export type ManufacturerCode = string;

export interface ManufacturerCapabilities {
  readonly supportsDatasheets: boolean;
  readonly supportsDrivers: boolean;
  readonly supportsBios: boolean;
  readonly supportsFirmware: boolean;
  readonly supportsLifecycle: boolean;
  readonly supportsCertifications: boolean;
  readonly supportsWarranty: boolean;
  readonly supportsPhysicalSpecs: boolean;
  readonly supportsCompatibility: boolean;
  readonly supportsOfficialImages: boolean;
}

export interface ManufacturerEnrichmentRequest {
  readonly manufacturer: string;
  readonly mpn: string | null;
  readonly brand: string;
  readonly title: string;
  readonly gtin: string | null;
  readonly upc: string | null;
  readonly ean: string | null;
  readonly traceId: import("../../shared").DiscoveryTraceId;
}

export interface OfficialIdentifiers {
  readonly mpn: string | null;
  readonly ean: string | null;
  readonly upc: string | null;
  readonly gtin: string | null;
  readonly family: string | null;
  readonly successorMpn: string | null;
}

export interface ManufacturerSpec {
  readonly name: string;
  readonly value: string;
  readonly unit: string | null;
  readonly sourceUrl: string;
  readonly confidence: number;
}

export interface LifecycleInfo {
  readonly status: "active" | "announced" | "end_of_life" | "discontinued" | "obsolete" | "unknown";
  readonly launchDate: string | null;
  readonly eolDate: string | null;
  readonly endOfSaleDate: string | null;
  readonly successorMpn: string | null;
  readonly sourceUrl: string;
}

export interface ManufacturerDownload {
  readonly kind: "datasheet" | "manual" | "driver" | "bios" | "firmware" | "certificate" | "other";
  readonly title: string;
  readonly url: string;
  readonly mimeType: string;
  readonly sizeBytes: number | null;
  readonly version: string | null;
  readonly publishedAt: string | null;
}

export interface OfficialImage {
  readonly url: string;
  readonly kind: "primary" | "angle" | "detail" | "diagram" | "package" | "environmental";
  readonly width: number | null;
  readonly height: number | null;
  readonly fingerprint: { algorithm: string; version: string; value: string };
}

export interface WarrantyInfo {
  readonly durationMonths: number | null;
  readonly type: "limited" | "lifetime" | "extended" | "none" | "unknown";
  readonly region: string | null;
  readonly termsUrl: string | null;
}

export interface ManufacturerSource {
  readonly id: ManufacturerSourceId;
  readonly canonicalProductId: import("../resolution/types").CanonicalProductId;
  readonly manufacturer: string;
  readonly matchedMpn: string;
  readonly identifiers: OfficialIdentifiers;
  readonly specifications: ReadonlyArray<ManufacturerSpec>;
  readonly lifecycle: LifecycleInfo;
  readonly downloads: ReadonlyArray<ManufacturerDownload>;
  readonly images: ReadonlyArray<OfficialImage>;
  readonly certifications: ReadonlyArray<Certification>;
  readonly warranty: WarrantyInfo;
  readonly physical: {
    readonly lengthMm: number | null;
    readonly widthMm: number | null;
    readonly heightMm: number | null;
    readonly weightGrams: number | null;
    readonly packageContents: ReadonlyArray<string>;
  };
  readonly compatibility: ReadonlyArray<string>;
  readonly fetchStatus: "ok" | "partial" | "not_found" | "error";
  readonly fetchWarnings: ReadonlyArray<string>;
  readonly fetchedAt: Date;
  readonly sourceUrl: string;
  readonly schemaVersion: "1.0.0";
}
