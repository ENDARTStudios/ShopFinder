/**
 * @workspace/domain/discovery/enrichment/registry
 *
 * Manufacturer registry — 77 manufacturers with rich metadata.
 *
 * Each manufacturer has:
 *   - Country of origin (US, TW, CN, JP, KR, DE, NL)
 *   - AuthorityScore (0-100): overall trustworthiness (derived)
 *   - CoverageScore (0-100): overall completeness (derived from segmentCoverage)
 *   - segmentCoverage: coverage per segment (e.g. ASUS Motherboard:100, GPU:98, Monitor:82)
 *   - authority: authority per attribute type (specs:100, pricing:10, inventory:5, ...)
 *   - capabilities: explicit matrix of what enrichment steps to run
  *   - Segments: product categories they manufacture
 *   - Aliases: multilingual (English + Chinese characters + pinyin)
 *   - Brands: commercial brand names (separate from manufacturer entity)
 *   - Status: ACTIVE, DISCONTINUED, OEM, ODM
 *   - Official domains: website, support, download center, datasheet base
 *   - Certifications: CE, FCC, RoHS, UL, ANATEL, INMETRO, etc.
 */
import type {
  Manufacturer,
  ManufacturerId,
  CountryCode,
  ProductSegment,
  Certification,
  ManufacturerStatus,
  AuthorityByAttribute,
  CapabilityProfile,
  CapabilityLevel,
  ConnectorDefinition,
  ConnectorInstance,
  ConnectorDefinitionId,
  ConnectorInstanceId,
  ConnectorStatus,
  ConnectorKind,
  ConnectorEnvironment,
  AuthType,
  ProtocolType,
  DataCapability,
  ConnectorCapabilityDescriptor,
  InformationSource,
  InformationSourceId,
  ManufacturerVersion,
  ManufacturerVersionId
} from "./types";
import {
  DEFAULT_MANUFACTURER_AUTHORITY,
  DEFAULT_CAPABILITIES,
  EXCELLENT_REST_CAPABILITY,
  GOOD_REST_CAPABILITY,
  PARTIAL_SCRAPE_CAPABILITY,
  NO_CAPABILITY
} from "./types";

// Helper to create a manufacturer without boilerplate
function m(params: {
  code: string;
  name: string;
  shortName: string;
  country: CountryCode;
  authorityScore: number;
  coverageScore: number;
  segments: ReadonlyArray<ProductSegment>;
  segmentCoverage?: Readonly<Partial<Record<ProductSegment, number>>>;
  authority?: Partial<Record<string, number>>;
  capabilities?: Partial<Record<string, CapabilityLevel>>;
  aliases: ReadonlyArray<string>;
  brands?: ReadonlyArray<string>;
  status?: ManufacturerStatus;
  officialWebsite?: string;
  supportWebsite?: string;
  downloadCenter?: string;
  datasheetBase?: string;
  certifications?: ReadonlyArray<Certification>;
}): Manufacturer {
  // Derive segmentCoverage from coverageScore if not provided
  const segmentCoverage: Partial<Record<ProductSegment, number>> = {};
  for (const seg of params.segments) {
    segmentCoverage[seg] = params.segmentCoverage?.[seg] ?? params.coverageScore;
  }

  return {
    id: `mfr_${params.code}` as unknown as ManufacturerId,
    code: params.code,
    name: params.name,
    shortName: params.shortName,
    country: params.country,
    authorityScore: params.authorityScore,
    coverageScore: params.coverageScore,
    segmentCoverage,
    authority: { ...DEFAULT_MANUFACTURER_AUTHORITY, ...params.authority } as AuthorityByAttribute,
    capabilities: { ...DEFAULT_CAPABILITIES, ...params.capabilities } as CapabilityProfile,
    segments: params.segments,
    aliases: params.aliases,
    brands: params.brands ?? [params.shortName],
    status: params.status ?? "ACTIVE",
    officialWebsite: params.officialWebsite,
    supportWebsite: params.supportWebsite,
    downloadCenter: params.downloadCenter,
    datasheetBase: params.datasheetBase,
    certifications: params.certifications ?? ["CE", "FCC", "RoHS"]
  };
}

// ── ManufacturerConnector registry (operational, separate from Manufacturer) ──

// ── Connector Definition + Instance helpers ───────────────

function cd(params: {
  manufacturerCode: string;
  name: string;
  kind: ConnectorKind;
  version: string;
  protocol: ProtocolType;
  endpoint: string;
  authType: AuthType;
  rateLimitPerHour: number;
  capabilities: ConnectorCapabilityDescriptor;
  parserModule: string;
  mapperModule: string;
}): ConnectorDefinition {
  return {
    id: `cdef_${params.manufacturerCode}_${params.kind}` as unknown as ConnectorDefinitionId,
    manufacturerCode: params.manufacturerCode,
    name: params.name,
    kind: params.kind,
    version: params.version,
    protocol: params.protocol,
    endpoint: params.endpoint,
    authType: params.authType,
    capabilities: params.capabilities,
    parserModule: params.parserModule,
    mapperModule: params.mapperModule,
    rateLimitPerHour: params.rateLimitPerHour
  };
}

function ci(params: {
  manufacturerCode: string;
  kind: ConnectorKind;
  environment: ConnectorEnvironment;
  status: ConnectorStatus;
  successRate: number;
  averageLatencyMs: number;
  rateLimitRemaining?: number | null;
  rateLimitWindow?: number | null;
}): ConnectorInstance {
  const defId = `cdef_${params.manufacturerCode}_${params.kind}` as unknown as ConnectorDefinitionId;
  return {
    id: `cinst_${params.manufacturerCode}_${params.kind}_${params.environment}` as unknown as ConnectorInstanceId,
    definitionId: defId,
    manufacturerCode: params.manufacturerCode,
    environment: params.environment,
    status: params.status,
    successRate: params.successRate,
    averageLatencyMs: params.averageLatencyMs,
    lastSuccessfulSync: params.status !== "not_configured" ? new Date().toISOString() : null,
    lastFailure: params.status === "degraded" ? new Date(Date.now() - 1800000).toISOString() : null,
    rateLimitRemaining: params.rateLimitRemaining ?? null,
    rateLimitWindow: params.rateLimitWindow ?? null,
    credentialsRef: params.status !== "not_configured" ? `secret://${params.manufacturerCode}/${params.kind}` : null
  };
}

// ── Capability descriptor presets ──────────────────────────

const FULL_REST_CAPS: ConnectorCapabilityDescriptor = {
  specifications: EXCELLENT_REST_CAPABILITY,
  datasheets: EXCELLENT_REST_CAPABILITY,
  drivers: EXCELLENT_REST_CAPABILITY,
  firmware: EXCELLENT_REST_CAPABILITY,
  images: EXCELLENT_REST_CAPABILITY,
  warranty: EXCELLENT_REST_CAPABILITY,
  certifications: EXCELLENT_REST_CAPABILITY,
  lifecycle: EXCELLENT_REST_CAPABILITY,
  support: EXCELLENT_REST_CAPABILITY
};

const STANDARD_REST_CAPS: ConnectorCapabilityDescriptor = {
  specifications: GOOD_REST_CAPABILITY,
  datasheets: GOOD_REST_CAPABILITY,
  drivers: NO_CAPABILITY,
  firmware: NO_CAPABILITY,
  images: GOOD_REST_CAPABILITY,
  warranty: GOOD_REST_CAPABILITY,
  certifications: PARTIAL_SCRAPE_CAPABILITY,
  lifecycle: GOOD_REST_CAPABILITY,
  support: PARTIAL_SCRAPE_CAPABILITY
};

const SCRAPE_CAPS: ConnectorCapabilityDescriptor = {
  specifications: PARTIAL_SCRAPE_CAPABILITY,
  datasheets: NO_CAPABILITY,
  drivers: NO_CAPABILITY,
  firmware: NO_CAPABILITY,
  images: PARTIAL_SCRAPE_CAPABILITY,
  warranty: NO_CAPABILITY,
  certifications: PARTIAL_SCRAPE_CAPABILITY,
  lifecycle: NO_CAPABILITY,
  support: NO_CAPABILITY
};

// ── Connector Definitions (templates) ─────────────────────

export const CONNECTOR_DEFINITIONS: ReadonlyArray<ConnectorDefinition> = [
  cd({ manufacturerCode: "intel", name: "Intel Ark API", kind: "official_api", version: "ark-v1", protocol: "rest", endpoint: "https://api.intel.com/ark/v1", authType: "api_key", rateLimitPerHour: 1000, capabilities: FULL_REST_CAPS, parserModule: "intel/parser.ts", mapperModule: "intel/mapper.ts" }),
  cd({ manufacturerCode: "amd", name: "AMD Product Master API", kind: "official_api", version: "product-master-v1", protocol: "rest", endpoint: "https://api.amd.com/product-master/v1", authType: "api_key", rateLimitPerHour: 1000, capabilities: FULL_REST_CAPS, parserModule: "amd/parser.ts", mapperModule: "amd/mapper.ts" }),
  cd({ manufacturerCode: "nvidia", name: "NVIDIA Product API", kind: "official_api", version: "nvapi-v1", protocol: "rest", endpoint: "https://api.nvidia.com/v1", authType: "api_key", rateLimitPerHour: 800, capabilities: FULL_REST_CAPS, parserModule: "nvidia/parser.ts", mapperModule: "nvidia/mapper.ts" }),
  cd({ manufacturerCode: "samsung", name: "Samsung Semiconductor API", kind: "official_api", version: "ss-v1", protocol: "rest", endpoint: "https://api.samsungsemiconductor.com/v1", authType: "oauth2", rateLimitPerHour: 500, capabilities: STANDARD_REST_CAPS, parserModule: "samsung/parser.ts", mapperModule: "samsung/mapper.ts" }),
  cd({ manufacturerCode: "asus", name: "ASUS Product API", kind: "official_api", version: "asus-v1", protocol: "rest", endpoint: "https://api.asus.com/v1", authType: "oauth2", rateLimitPerHour: 400, capabilities: STANDARD_REST_CAPS, parserModule: "asus/parser.ts", mapperModule: "asus/mapper.ts" }),
  cd({ manufacturerCode: "msi", name: "MSI Product API", kind: "official_api", version: "msi-v1", protocol: "rest", endpoint: "https://api.msi.com/v1", authType: "api_key", rateLimitPerHour: 300, capabilities: STANDARD_REST_CAPS, parserModule: "msi/parser.ts", mapperModule: "msi/mapper.ts" }),
  cd({ manufacturerCode: "colorful", name: "Colorful Scraper", kind: "scraper", version: "scraper-v1", protocol: "scrape_html", endpoint: "https://www.colorful.cn/products", authType: "none", rateLimitPerHour: 100, capabilities: SCRAPE_CAPS, parserModule: "colorful/parser.ts", mapperModule: "colorful/mapper.ts" }),
  cd({ manufacturerCode: "huananzhi", name: "Huananzhi Scraper", kind: "scraper", version: "scraper-v1", protocol: "scrape_html", endpoint: "https://huananzhi.com/products", authType: "none", rateLimitPerHour: 50, capabilities: SCRAPE_CAPS, parserModule: "huananzhi/parser.ts", mapperModule: "huananzhi/mapper.ts" }),
  cd({ manufacturerCode: "deepcool", name: "DeepCool Scraper", kind: "scraper", version: "scraper-v1", protocol: "scrape_html", endpoint: "https://www.deepcool.com/products", authType: "none", rateLimitPerHour: 100, capabilities: SCRAPE_CAPS, parserModule: "deepcool/parser.ts", mapperModule: "deepcool/mapper.ts" }),
  cd({ manufacturerCode: "jonsbo", name: "Jonsbo Scraper", kind: "scraper", version: "scraper-v1", protocol: "scrape_html", endpoint: "https://www.jonsbo.com/products", authType: "none", rateLimitPerHour: 80, capabilities: SCRAPE_CAPS, parserModule: "jonsbo/parser.ts", mapperModule: "jonsbo/mapper.ts" }),
  cd({ manufacturerCode: "minisforum", name: "Minisforum API", kind: "official_api", version: "mf-v1", protocol: "rest", endpoint: "https://api.minisforum.com/v1", authType: "api_key", rateLimitPerHour: 200, capabilities: STANDARD_REST_CAPS, parserModule: "minisforum/parser.ts", mapperModule: "minisforum/mapper.ts" }),
  cd({ manufacturerCode: "netac", name: "Netac via AliExpress", kind: "partner", version: "aliexpress-v1", protocol: "rest", endpoint: "https://api.aliexpress.com", authType: "oauth2", rateLimitPerHour: 300, capabilities: STANDARD_REST_CAPS, parserModule: "netac/parser.ts", mapperModule: "netac/mapper.ts" }),
  cd({ manufacturerCode: "gloway", name: "Gloway via AliExpress", kind: "partner", version: "aliexpress-v1", protocol: "rest", endpoint: "https://api.aliexpress.com", authType: "oauth2", rateLimitPerHour: 300, capabilities: STANDARD_REST_CAPS, parserModule: "gloway/parser.ts", mapperModule: "gloway/mapper.ts" })
];

// ── Connector Instances (runtime) ──────────────────────────

export const CONNECTOR_INSTANCES: ReadonlyArray<ConnectorInstance> = [
  ci({ manufacturerCode: "intel", kind: "official_api", environment: "production", status: "healthy", successRate: 99.8, averageLatencyMs: 420, rateLimitRemaining: 850 }),
  ci({ manufacturerCode: "amd", kind: "official_api", environment: "production", status: "healthy", successRate: 99.5, averageLatencyMs: 380, rateLimitRemaining: 920 }),
  ci({ manufacturerCode: "nvidia", kind: "official_api", environment: "production", status: "healthy", successRate: 99.2, averageLatencyMs: 510, rateLimitRemaining: 780 }),
  ci({ manufacturerCode: "samsung", kind: "official_api", environment: "production", status: "healthy", successRate: 98.9, averageLatencyMs: 620, rateLimitRemaining: 450 }),
  ci({ manufacturerCode: "asus", kind: "official_api", environment: "production", status: "healthy", successRate: 97.5, averageLatencyMs: 750, rateLimitRemaining: 320 }),
  ci({ manufacturerCode: "msi", kind: "official_api", environment: "production", status: "healthy", successRate: 96.8, averageLatencyMs: 820, rateLimitRemaining: 210 }),
  ci({ manufacturerCode: "colorful", kind: "scraper", environment: "production", status: "healthy", successRate: 94.5, averageLatencyMs: 820 }),
  ci({ manufacturerCode: "huananzhi", kind: "scraper", environment: "production", status: "degraded", successRate: 87.2, averageLatencyMs: 1850, rateLimitRemaining: 23 }),
  ci({ manufacturerCode: "deepcool", kind: "scraper", environment: "production", status: "healthy", successRate: 95.1, averageLatencyMs: 680 }),
  ci({ manufacturerCode: "jonsbo", kind: "scraper", environment: "production", status: "healthy", successRate: 93.8, averageLatencyMs: 910 }),
  ci({ manufacturerCode: "minisforum", kind: "official_api", environment: "production", status: "healthy", successRate: 96.2, averageLatencyMs: 540, rateLimitRemaining: 180 }),
  ci({ manufacturerCode: "netac", kind: "partner", environment: "partner", status: "healthy", successRate: 92.3, averageLatencyMs: 1200 }),
  ci({ manufacturerCode: "gloway", kind: "partner", environment: "partner", status: "healthy", successRate: 91.8, averageLatencyMs: 1250 })
];

// Legacy compat: flat connector list combining definition + instance
export const CONNECTORS = CONNECTOR_INSTANCES;

// ── InformationSource registry (provenance examples) ───────

function is(params: {
  manufacturerCode: string;
  attributeType: string;
  attributeName: string;
  url: string;
  confidence: number;
  rawValue: string;
}): InformationSource {
  const manufacturerId = `mfr_${params.manufacturerCode}` as unknown as ManufacturerId;
  const connectorId = `cinst_${params.manufacturerCode}_official_api_production` as unknown as ConnectorInstanceId;
  return {
    id: `isrc_${params.manufacturerCode}_${params.attributeName}` as unknown as InformationSourceId,
    manufacturerId,
    manufacturerCode: params.manufacturerCode,
    connectorId,
    attributeType: params.attributeType as any,
    attributeName: params.attributeName,
    url: params.url,
    retrievedAt: new Date().toISOString(),
    checksum: `${params.manufacturerCode}_${params.attributeName}_${params.rawValue.length}`,
    confidence: params.confidence,
    rawValue: params.rawValue
  };
}

export const INFORMATION_SOURCES: ReadonlyArray<InformationSource> = [
  is({ manufacturerCode: "intel", attributeType: "specifications", attributeName: "cores", url: "https://ark.intel.com/14900k", confidence: 1.0, rawValue: "24" }),
  is({ manufacturerCode: "intel", attributeType: "specifications", attributeName: "base_clock", url: "https://ark.intel.com/14900k", confidence: 1.0, rawValue: "3.2 GHz" }),
  is({ manufacturerCode: "intel", attributeType: "specifications", attributeName: "tdp", url: "https://ark.intel.com/14900k", confidence: 1.0, rawValue: "125 W" }),
  is({ manufacturerCode: "amd", attributeType: "specifications", attributeName: "cores", url: "https://api.amd.com/product-master/v1/products/100-100000514WOF", confidence: 1.0, rawValue: "16" }),
  is({ manufacturerCode: "amd", attributeType: "specifications", attributeName: "max_turbo", url: "https://api.amd.com/product-master/v1/products/100-100000514WOF", confidence: 1.0, rawValue: "5.7 GHz" }),
  is({ manufacturerCode: "colorful", attributeType: "specifications", attributeName: "socket", url: "https://www.colorful.cn/product/x79-turbo", confidence: 0.85, rawValue: "LGA2011" }),
  is({ manufacturerCode: "huananzhi", attributeType: "specifications", attributeName: "socket", url: "https://huananzhi.com/product/x99-f8", confidence: 0.75, rawValue: "LGA2011-3" }),
  is({ manufacturerCode: "deepcool", attributeType: "specifications", attributeName: "tdp", url: "https://www.deepcool.com/product/ak620", confidence: 0.90, rawValue: "260W" })
];

// ── ManufacturerVersion registry (immutable history) ───────

function v(params: {
  manufacturerCode: string;
  version: number;
  changes: ReadonlyArray<string>;
}): ManufacturerVersion {
  const manufacturerId = `mfr_${params.manufacturerCode}` as unknown as ManufacturerId;
  return {
    id: `mver_${params.manufacturerCode}_${params.version}` as unknown as ManufacturerVersionId,
    manufacturerId,
    manufacturerCode: params.manufacturerCode,
    version: params.version,
    effectiveFrom: params.version === 1 ? "2024-01-01T00:00:00Z" : new Date().toISOString(),
    changes: params.changes,
    previousVersionId: params.version > 1
      ? `mver_${params.manufacturerCode}_${params.version - 1}` as unknown as ManufacturerVersionId
      : null
  };
}

export const MANUFACTURER_VERSIONS: ReadonlyArray<ManufacturerVersion> = [
  v({ manufacturerCode: "intel", version: 1, changes: ["Initial profile"] }),
  v({ manufacturerCode: "intel", version: 2, changes: ["Added Arc GPU segment", "Updated downloadCenter URL"] }),
  v({ manufacturerCode: "amd", version: 1, changes: ["Initial profile"] }),
  v({ manufacturerCode: "amd", version: 2, changes: ["Added Ryzen 9000 series", "Updated datasheetBase"] }),
  v({ manufacturerCode: "colorful", version: 1, changes: ["Initial profile", "Added Chinese aliases: 七彩虹, qicaihong"] }),
  v({ manufacturerCode: "huananzhi", version: 1, changes: ["Initial profile", "Low coverage — limited public documentation"] }),
  v({ manufacturerCode: "deepcool", version: 1, changes: ["Initial profile"] }),
  v({ manufacturerCode: "deepcool", version: 2, changes: ["Added Peripherals segment", "Updated authority for specifications"] }),
  v({ manufacturerCode: "jonsbo", version: 1, changes: ["Initial profile", "Added Cooling segment"] })
];

// ── Provenance Graph: ProductAttribute with AttributeEvidence[] ──
// Each attribute is a CONCLUSION drawn from multiple evidence sources.

import type { ProductAttribute, AttributeEvidence, EvidenceId, ProductAttributeId } from "./types";

function ev(params: {
  sourceType: string;
  sourceName: string;
  confidence: number;
  extractedValue: string;
  normalizedValue: string;
  url: string;
}): AttributeEvidence {
  return {
    id: `evd_${params.sourceName}_${params.normalizedValue}_${Math.random().toString(36).slice(2, 6)}` as unknown as EvidenceId,
    sourceType: params.sourceType as any,
    sourceName: params.sourceName,
    connectorId: null,
    confidence: params.confidence,
    extractedValue: params.extractedValue,
    normalizedValue: params.normalizedValue,
    checksum: `${params.sourceName}_${params.extractedValue.length}`,
    retrievedAt: new Date().toISOString(),
    url: params.url
  };
}

function pa(params: {
  name: string;
  value: string;
  attributeType: string;
  evidence: ReadonlyArray<AttributeEvidence>;
}): ProductAttribute {
  const confidence = params.evidence.reduce((sum, e) => sum + e.confidence, 0) / params.evidence.length;
  return {
    id: `pattr_${params.name}_${Math.random().toString(36).slice(2, 6)}` as unknown as ProductAttributeId,
    name: params.name,
    value: params.value,
    attributeType: params.attributeType as any,
    evidence: params.evidence,
    resolvedAt: new Date().toISOString(),
    resolver: "default-authority-v1",
    confidence
  };
}

export const PRODUCT_ATTRIBUTES: ReadonlyArray<ProductAttribute> = [
  // Intel i9-14900K socket — 4 evidence sources
  pa({
    name: "socket",
    value: "LGA1700",
    attributeType: "specifications",
    evidence: [
      ev({ sourceType: "manufacturer", sourceName: "Intel Ark", confidence: 1.0, extractedValue: "FCLGA1700", normalizedValue: "LGA1700", url: "https://ark.intel.com/14900k" }),
      ev({ sourceType: "datasheet", sourceName: "Intel Datasheet PDF", confidence: 0.99, extractedValue: "LGA1700", normalizedValue: "LGA1700", url: "https://cdrdv2.intel.com/datasheet/14900k.pdf" }),
      ev({ sourceType: "distributor", sourceName: "DigiKey", confidence: 0.96, extractedValue: "Socket LGA1700", normalizedValue: "LGA1700", url: "https://www.digikey.com/product-detail/14900k" }),
      ev({ sourceType: "marketplace", sourceName: "Amazon", confidence: 0.72, extractedValue: "LGA 1700", normalizedValue: "LGA1700", url: "https://amazon.com/dp/B0CJ4LL1YK" })
    ]
  }),
  // Intel i9-14900K cores — 3 evidence sources
  pa({
    name: "cores",
    value: "24",
    attributeType: "specifications",
    evidence: [
      ev({ sourceType: "manufacturer", sourceName: "Intel Ark", confidence: 1.0, extractedValue: "24", normalizedValue: "24", url: "https://ark.intel.com/14900k" }),
      ev({ sourceType: "datasheet", sourceName: "Intel Datasheet PDF", confidence: 0.99, extractedValue: "24 (8P+16E)", normalizedValue: "24", url: "https://cdrdv2.intel.com/datasheet/14900k.pdf" }),
      ev({ sourceType: "marketplace", sourceName: "Newegg", confidence: 0.85, extractedValue: "24 Cores", normalizedValue: "24", url: "https://www.newegg.com/p/N82E16819118410" })
    ]
  }),
  // AMD Ryzen 9 7950X socket — 3 evidence sources
  pa({
    name: "socket",
    value: "AM5",
    attributeType: "specifications",
    evidence: [
      ev({ sourceType: "manufacturer", sourceName: "AMD Product Master", confidence: 1.0, extractedValue: "Socket AM5", normalizedValue: "AM5", url: "https://api.amd.com/product-master/v1/products/100-100000514WOF" }),
      ev({ sourceType: "datasheet", sourceName: "AMD Datasheet PDF", confidence: 0.99, extractedValue: "AM5", normalizedValue: "AM5", url: "https://www.amd.com/datasheets/ryzen-9-7950x.pdf" }),
      ev({ sourceType: "marketplace", sourceName: "Amazon", confidence: 0.78, extractedValue: "AM5 Socket", normalizedValue: "AM5", url: "https://amazon.com/dp/B0BBJ59PJ5" })
    ]
  }),
  // Colorful X79 socket — 2 evidence sources (lower confidence)
  pa({
    name: "socket",
    value: "LGA2011",
    attributeType: "specifications",
    evidence: [
      ev({ sourceType: "manufacturer", sourceName: "Colorful Website", confidence: 0.85, extractedValue: "LGA2011", normalizedValue: "LGA2011", url: "https://www.colorful.cn/product/x79-turbo" }),
      ev({ sourceType: "marketplace", sourceName: "AliExpress", confidence: 0.65, extractedValue: "2011 pin", normalizedValue: "LGA2011", url: "https://aliexpress.com/item/colorful-x79" })
    ]
  })
];

// ── Tier A: CPU/GPU/memory/storage giants (14) ─────────────

const tierA: ReadonlyArray<Manufacturer> = [
  m({
    code: "intel",
    name: "Intel Corporation",
    shortName: "Intel",
    country: "US",
    authorityScore: 100,
    coverageScore: 100,
    segments: ["CPU", "SSD", "Networking", "MiniPC"],
    segmentCoverage: { CPU: 100, SSD: 95, Networking: 90, MiniPC: 85 },
    authority: {
      specifications: 100,
      images: 98,
      documentation: 100,
      lifecycle: 100,
      warranty: 100,
      compatibility: 98,
      pricing: 5,
      inventory: 0
    },
    capabilities: {
      specifications: "excellent",
      datasheets: "excellent",
      drivers: "excellent",
      firmware: "excellent",
      images: "excellent",
      warranty: "excellent",
      certifications: "excellent",
      lifecycle: "excellent",
      support: "excellent"
    },
    
    aliases: ["intel", "intel corporation"],
    brands: ["Intel", "Core", "Xeon", "NUC", "Arc"],
    officialWebsite: "https://www.intel.com",
    downloadCenter: "https://www.intel.com/content/www/us/en/download-center/home.html",
    datasheetBase: "https://ark.intel.com",
    certifications: ["CE", "FCC", "RoHS", "UL", "EnergyStar"]
  }),
  m({
    code: "amd",
    name: "Advanced Micro Devices",
    shortName: "AMD",
    country: "US",
    authorityScore: 100,
    coverageScore: 100,
    segments: ["CPU", "GPU"],
    aliases: ["amd", "advanced micro devices", "ryzen", "epyc", "radeon"],
    brands: ["AMD", "Ryzen", "EPYC", "Radeon"],
    officialWebsite: "https://www.amd.com",
    downloadCenter: "https://www.amd.com/en/support",
    datasheetBase: "https://www.amd.com/en/products",
    certifications: ["CE", "FCC", "RoHS", "UL", "EnergyStar"]
  }),
  m({
    code: "nvidia",
    name: "NVIDIA Corporation",
    shortName: "NVIDIA",
    country: "US",
    authorityScore: 100,
    coverageScore: 100,
    segments: ["GPU", "Networking"],
    aliases: ["nvidia", "geforce", "quadro", "rtx", "tesla"],
    brands: ["NVIDIA", "GeForce", "Quadro", "RTX"],
    officialWebsite: "https://www.nvidia.com",
    downloadCenter: "https://www.nvidia.com/Download/index.aspx",
    datasheetBase: "https://www.nvidia.com/en-us/geforce/graphics-cards/",
    certifications: ["CE", "FCC", "RoHS", "UL", "EnergyStar"]
  }),
  m({
    code: "qualcomm",
    name: "Qualcomm Technologies",
    shortName: "Qualcomm",
    country: "US",
    authorityScore: 99,
    coverageScore: 95,
    segments: ["CPU", "Networking"],
    aliases: ["qualcomm", "snapdragon"],
    brands: ["Qualcomm", "Snapdragon"],
    officialWebsite: "https://www.qualcomm.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "samsung",
    name: "Samsung Electronics",
    shortName: "Samsung",
    country: "KR",
    authorityScore: 100,
    coverageScore: 98,
    segments: ["SSD", "Memory", "Displays"],
    aliases: ["samsung", "samsung electronics"],
    brands: ["Samsung", "980", "990", "EVO"],
    officialWebsite: "https://www.samsung.com",
    downloadCenter: "https://www.samsung.com/semiconductor/support",
    certifications: ["CE", "FCC", "RoHS", "UL", "EnergyStar"]
  }),
  m({
    code: "sk_hynix",
    name: "SK hynix",
    shortName: "SK hynix",
    country: "KR",
    authorityScore: 98,
    coverageScore: 90,
    segments: ["SSD", "Memory"],
    aliases: ["sk hynix", "skhynix", "hynix"],
    brands: ["SK hynix", "Platinum", "Gold"],
    officialWebsite: "https://www.skhynix.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "micron",
    name: "Micron Technology",
    shortName: "Micron",
    country: "US",
    authorityScore: 98,
    coverageScore: 92,
    segments: ["SSD", "Memory"],
    aliases: ["micron", "crucial"],
    brands: ["Micron", "Crucial"],
    officialWebsite: "https://www.micron.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "kingston",
    name: "Kingston Technology",
    shortName: "Kingston",
    country: "US",
    authorityScore: 99,
    coverageScore: 95,
    segments: ["SSD", "Memory", "Peripherals"],
    aliases: ["kingston", "hyperx", "fury"],
    brands: ["Kingston", "HyperX", "FURY"],
    officialWebsite: "https://www.kingston.com",
    certifications: ["CE", "FCC", "RoHS", "UL"]
  }),
  m({
    code: "crucial",
    name: "Crucial (by Micron)",
    shortName: "Crucial",
    country: "US",
    authorityScore: 98,
    coverageScore: 93,
    segments: ["SSD", "Memory"],
    aliases: ["crucial"],
    brands: ["Crucial", "Ballistix"],
    officialWebsite: "https://www.crucial.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "corsair",
    name: "CORSAIR Gaming",
    shortName: "Corsair",
    country: "US",
    authorityScore: 98,
    coverageScore: 94,
    segments: ["Memory", "PowerSupply", "Case", "Cooling", "Peripherals"],
    aliases: ["corsair"],
    brands: ["Corsair", "iCUE"],
    officialWebsite: "https://www.corsair.com",
    certifications: ["CE", "FCC", "RoHS", "UL"]
  }),
  m({
    code: "wdc",
    name: "Western Digital",
    shortName: "Western Digital",
    country: "US",
    authorityScore: 99,
    coverageScore: 96,
    segments: ["SSD"],
    aliases: ["western digital", "wd", "wdc", "sandisk"],
    brands: ["Western Digital", "WD", "SanDisk"],
    officialWebsite: "https://www.westerndigital.com",
    certifications: ["CE", "FCC", "RoHS", "UL"]
  }),
  m({
    code: "seagate",
    name: "Seagate Technology",
    shortName: "Seagate",
    country: "US",
    authorityScore: 99,
    coverageScore: 95,
    segments: ["SSD"],
    aliases: ["seagate"],
    brands: ["Seagate", "Barracuda", "IronWolf"],
    officialWebsite: "https://www.seagate.com",
    certifications: ["CE", "FCC", "RoHS", "UL"]
  }),
  m({
    code: "kioxia",
    name: "Kioxia Corporation",
    shortName: "Kioxia",
    country: "JP",
    authorityScore: 98,
    coverageScore: 88,
    segments: ["SSD"],
    aliases: ["kioxia", "toshiba memory"],
    brands: ["Kioxia"],
    officialWebsite: "https://www.kioxia.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "solidigm",
    name: "Solidigm",
    shortName: "Solidigm",
    country: "US",
    authorityScore: 98,
    coverageScore: 87,
    segments: ["SSD"],
    aliases: ["solidigm", "intel nand"],
    brands: ["Solidigm"],
    officialWebsite: "https://www.solidigm.com",
    certifications: ["CE", "FCC", "RoHS"]
  })
];

// ── Tier B: Global motherboard/GPU/peripheral manufacturers (18) ──

const tierB: ReadonlyArray<Manufacturer> = [
  m({
    code: "asus",
    name: "ASUSTeK Computer",
    shortName: "ASUS",
    country: "TW",
    authorityScore: 97,
    coverageScore: 98,
    segments: ["Motherboard", "GPU", "Displays", "Networking", "Peripherals", "MiniPC"],
    aliases: ["asus", "asustek", "rog", "tuf gaming"],
    brands: ["ASUS", "ROG", "TUF", "Prime"],
    officialWebsite: "https://www.asus.com",
    certifications: ["CE", "FCC", "RoHS", "UL", "EnergyStar"]
  }),
  m({
    code: "msi",
    name: "Micro-Star International",
    shortName: "MSI",
    country: "TW",
    authorityScore: 96,
    coverageScore: 95,
    segments: ["Motherboard", "GPU", "Displays", "Peripherals", "MiniPC", "Case"],
    aliases: ["msi", "micro-star"],
    brands: ["MSI", "MEG", "MAG"],
    officialWebsite: "https://www.msi.com",
    certifications: ["CE", "FCC", "RoHS", "UL"]
  }),
  m({
    code: "gigabyte",
    name: "GIGABYTE Technology",
    shortName: "Gigabyte",
    country: "TW",
    authorityScore: 96,
    coverageScore: 95,
    segments: ["Motherboard", "GPU", "Displays", "MiniPC"],
    aliases: ["gigabyte", "aorus"],
    brands: ["Gigabyte", "AORUS"],
    officialWebsite: "https://www.gigabyte.com",
    certifications: ["CE", "FCC", "RoHS", "UL"]
  }),
  m({
    code: "asrock",
    name: "ASRock Inc.",
    shortName: "ASRock",
    country: "TW",
    authorityScore: 95,
    coverageScore: 92,
    segments: ["Motherboard", "MiniPC"],
    aliases: ["asrock"],
    brands: ["ASRock", "Phantom Gaming"],
    officialWebsite: "https://www.asrock.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "biostar",
    name: "BIOSTAR Microtech",
    shortName: "Biostar",
    country: "TW",
    authorityScore: 93,
    coverageScore: 85,
    segments: ["Motherboard"],
    aliases: ["biostar"],
    brands: ["Biostar", "Racing"],
    officialWebsite: "https://www.biostar.com.tw",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "acer",
    name: "Acer Inc.",
    shortName: "Acer",
    country: "TW",
    authorityScore: 94,
    coverageScore: 88,
    segments: ["Displays", "MiniPC", "Peripherals"],
    aliases: ["acer", "predator", "nitro"],
    brands: ["Acer", "Predator", "Nitro"],
    officialWebsite: "https://www.acer.com",
    certifications: ["CE", "FCC", "RoHS", "UL", "EnergyStar"]
  }),
  m({
    code: "dell",
    name: "Dell Technologies",
    shortName: "Dell",
    country: "US",
    authorityScore: 97,
    coverageScore: 93,
    segments: ["Displays", "MiniPC", "Peripherals"],
    aliases: ["dell", "alienware"],
    brands: ["Dell", "Alienware", "UltraSharp"],
    officialWebsite: "https://www.dell.com",
    certifications: ["CE", "FCC", "RoHS", "UL", "EnergyStar"]
  }),
  m({
    code: "hp",
    name: "HP Inc.",
    shortName: "HP",
    country: "US",
    authorityScore: 97,
    coverageScore: 92,
    segments: ["Displays", "MiniPC", "Peripherals"],
    aliases: ["hp", "hewlett packard", "omen"],
    brands: ["HP", "OMEN", "Victus"],
    officialWebsite: "https://www.hp.com",
    certifications: ["CE", "FCC", "RoHS", "UL", "EnergyStar"]
  }),
  m({
    code: "lenovo",
    name: "Lenovo Group",
    shortName: "Lenovo",
    country: "CN",
    authorityScore: 96,
    coverageScore: 90,
    segments: ["Displays", "MiniPC", "Peripherals"],
    aliases: ["lenovo", "legion", "thinkpad"],
    brands: ["Lenovo", "Legion", "ThinkCentre", "ThinkPad"],
    officialWebsite: "https://www.lenovo.com",
    certifications: ["CE", "FCC", "RoHS", "UL", "EnergyStar"]
  }),
  m({
    code: "intel_nuc",
    name: "Intel NUC",
    shortName: "Intel NUC",
    country: "US",
    authorityScore: 95,
    coverageScore: 85,
    segments: ["MiniPC"],
    aliases: ["intel nuc", "nuc"],
    brands: ["Intel NUC"],
    officialWebsite: "https://www.intel.com/nuc",
    certifications: ["CE", "FCC", "RoHS", "EnergyStar"]
  }),
  m({
    code: "zotac",
    name: "ZOTAC International",
    shortName: "Zotac",
    country: "CN",
    authorityScore: 93,
    coverageScore: 85,
    segments: ["GPU", "MiniPC"],
    aliases: ["zotac"],
    brands: ["Zotac", "ZBOX"],
    officialWebsite: "https://www.zotac.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "palit",
    name: "Palit Microsystems",
    shortName: "Palit",
    country: "TW",
    authorityScore: 93,
    coverageScore: 82,
    segments: ["GPU"],
    aliases: ["palit"],
    brands: ["Palit", "JetStream", "GamingPro"],
    officialWebsite: "https://www.palit.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "gainward",
    name: "Gainward",
    shortName: "Gainward",
    country: "TW",
    authorityScore: 92,
    coverageScore: 80,
    segments: ["GPU"],
    aliases: ["gainward"],
    brands: ["Gainward", "Phoenix", "Ghost"],
    officialWebsite: "https://www.gainward.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "pny",
    name: "PNY Technologies",
    shortName: "PNY",
    country: "US",
    authorityScore: 93,
    coverageScore: 84,
    segments: ["GPU", "SSD", "Memory"],
    aliases: ["pny"],
    brands: ["PNY", "XLR8"],
    officialWebsite: "https://www.pny.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "sapphire",
    name: "SAPPHIRE Technology",
    shortName: "Sapphire",
    country: "TW",
    authorityScore: 94,
    coverageScore: 87,
    segments: ["GPU"],
    aliases: ["sapphire", "sapphire pulse", "sapphire nitro"],
    brands: ["Sapphire", "Pulse", "Nitro"],
    officialWebsite: "https://www.sapphiretech.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "powercolor",
    name: "PowerColor (TUL Corporation)",
    shortName: "PowerColor",
    country: "TW",
    authorityScore: 93,
    coverageScore: 83,
    segments: ["GPU"],
    aliases: ["powercolor"],
    brands: ["PowerColor", "Red Devil", "Hellhound"],
    officialWebsite: "https://www.powercolor.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "xfx",
    name: "XFX (Pine Technology)",
    shortName: "XFX",
    country: "CN",
    authorityScore: 92,
    coverageScore: 80,
    segments: ["GPU"],
    aliases: ["xfx"],
    brands: ["XFX", "Speedster", "Merc"],
    officialWebsite: "https://www.xfxforce.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "inno3d",
    name: "Inno3D",
    shortName: "Inno3D",
    country: "TW",
    authorityScore: 92,
    coverageScore: 79,
    segments: ["GPU"],
    aliases: ["inno3d", "innod3"],
    brands: ["Inno3D", "iChill", "Twin X2"],
    officialWebsite: "https://www.inno3d.com",
    certifications: ["CE", "FCC", "RoHS"]
  })
];

// ── Tier C: Major Chinese manufacturers (35) ───────────────

const tierC: ReadonlyArray<Manufacturer> = [
  // Motherboards
  m({
    code: "colorful",
    name: "Shenzhen Colorful Technology",
    shortName: "Colorful",
    country: "CN",
    authorityScore: 90,
    coverageScore: 85,
    segments: ["Motherboard", "GPU", "SSD"],
    segmentCoverage: { Motherboard: 85, GPU: 88, SSD: 70 },
    authority: {
      specifications: 90,
      images: 85,
      documentation: 75,
      lifecycle: 70,
      warranty: 80,
      compatibility: 75,
      pricing: 15,
      inventory: 10
    },
    capabilities: {
      specifications: "good",
      datasheets: "partial",
      drivers: "none",
      firmware: "none",
      images: "good",
      warranty: "good",
      certifications: "partial",
      lifecycle: "none",
      support: "partial"
    },
    
    aliases: ["colorful", "七彩虹", "qicaihong", "igame"],
    brands: ["Colorful", "iGame", "BattleAgent"],
    officialWebsite: "https://www.colorful.cn",
    certifications: ["CE", "FCC", "RoHS", "CCC"]
  }),
  m({
    code: "maxsun",
    name: "Maxsun (Guangzhou Shangke)",
    shortName: "Maxsun",
    country: "CN",
    authorityScore: 88,
    coverageScore: 75,
    segments: ["Motherboard", "GPU"],
    aliases: ["maxsun", "铭瑄", "mingshuān"],
    brands: ["Maxsun", "MS-终结者"],
    officialWebsite: "https://www.maxsun.com.cn",
    certifications: ["CE", "RoHS", "CCC"]
  }),
  m({
    code: "huananzhi",
    name: "Huananzhi (华南)",
    shortName: "Huananzhi",
    country: "CN",
    authorityScore: 82,
    coverageScore: 60,
    segments: ["Motherboard"],
    segmentCoverage: { Motherboard: 60 },
    authority: {
      specifications: 82,
      images: 60,
      documentation: 30,
      lifecycle: 20,
      warranty: 50,
      compatibility: 40,
      pricing: 20,
      inventory: 15
    },
    capabilities: {
      specifications: "partial",
      datasheets: "none",
      drivers: "none",
      firmware: "none",
      images: "partial",
      warranty: "none",
      certifications: "partial",
      lifecycle: "none",
      support: "none"
    },
    
    aliases: ["huananzhi", "华南", "huanánzhì"],
    brands: ["Huananzhi"],
    officialWebsite: "https://huananzhi.com",
    certifications: ["CE", "RoHS", "CCC"]
  }),
  m({
    code: "machinist",
    name: "Machinist (Jingyue)",
    shortName: "Machinist",
    country: "CN",
    authorityScore: 82,
    coverageScore: 58,
    segments: ["Motherboard"],
    aliases: ["machinist", "机械师", "jīxièshī", "jingyue"],
    brands: ["Machinist"],
    officialWebsite: "https://www.machinist.com.cn",
    certifications: ["CE", "RoHS"]
  }),
  m({
    code: "soyo",
    name: "SOYO (梅捷)",
    shortName: "SOYO",
    country: "CN",
    authorityScore: 82,
    coverageScore: 60,
    segments: ["Motherboard"],
    aliases: ["soyo", "梅梗", "méi梗", "soyotek"],
    brands: ["SOYO"],
    officialWebsite: "https://www.soyo.com.cn",
    certifications: ["CE", "RoHS", "CCC"]
  }),
  m({
    code: "jginyue",
    name: "JGINYUE (精粤)",
    shortName: "JGINYUE",
    country: "CN",
    authorityScore: 82,
    coverageScore: 55,
    segments: ["Motherboard"],
    aliases: ["jginyue", "精粤", "jīngyuè"],
    brands: ["JGINYUE"],
    officialWebsite: "https://www.jginyue.com",
    certifications: ["CE", "RoHS"]
  }),
  m({
    code: "onda",
    name: "ONDA (昂达)",
    shortName: "ONDA",
    country: "CN",
    authorityScore: 83,
    coverageScore: 62,
    segments: ["Motherboard", "GPU"],
    aliases: ["onda", "昂达", "ángdá"],
    brands: ["ONDA"],
    officialWebsite: "https://www.onda.cn",
    certifications: ["CE", "RoHS", "CCC"]
  }),
  m({
    code: "yeston",
    name: "Yeston (盈通)",
    shortName: "Yeston",
    country: "CN",
    authorityScore: 84,
    coverageScore: 65,
    segments: ["Motherboard", "GPU"],
    aliases: ["yeston", "盈通", "yíngtōng"],
    brands: ["Yeston", "GameSoul"],
    officialWebsite: "https://www.yeston.com",
    certifications: ["CE", "RoHS", "CCC"]
  }),
  m({
    code: "erying",
    name: "Erying (尔英)",
    shortName: "Erying",
    country: "CN",
    authorityScore: 82,
    coverageScore: 55,
    segments: ["Motherboard"],
    aliases: ["erying", "尔英", "ěryīng"],
    brands: ["Erying"],
    officialWebsite: "https://www.erying.com",
    certifications: ["CE", "RoHS"]
  }),
  // GPUs
  m({
    code: "peladn",
    name: "Peladn (培恩)",
    shortName: "Peladn",
    country: "CN",
    authorityScore: 82,
    coverageScore: 50,
    segments: ["GPU", "MiniPC"],
    aliases: ["peladn", "培恩", "péiēn"],
    brands: ["Peladn"],
    officialWebsite: "https://www.peladn.com",
    certifications: ["CE", "RoHS", "CCC"]
  }),
  // SSD / Memory
  m({
    code: "netac",
    name: "Netac Technology (朗科)",
    shortName: "Netac",
    country: "CN",
    authorityScore: 88,
    coverageScore: 80,
    segments: ["SSD", "Memory"],
    aliases: ["netac", "朗科", "lǎngkē"],
    brands: ["Netac"],
    officialWebsite: "https://www.netac.com.cn",
    certifications: ["CE", "FCC", "RoHS", "CCC"]
  }),
  m({
    code: "asgard",
    name: "Asgard (阿斯加德)",
    shortName: "Asgard",
    country: "CN",
    authorityScore: 85,
    coverageScore: 70,
    segments: ["SSD", "Memory"],
    aliases: ["asgard", "阿斯加德", "āsījiādé"],
    brands: ["Asgard", "Anker", "VMA"],
    officialWebsite: "https://www.asgard.com",
    certifications: ["CE", "RoHS", "CCC"]
  }),
  m({
    code: "kingspec",
    name: "KingSpec (金胜)",
    shortName: "KingSpec",
    country: "CN",
    authorityScore: 84,
    coverageScore: 72,
    segments: ["SSD", "Memory"],
    aliases: ["kingspec", "金胜", "jīnshèng"],
    brands: ["KingSpec"],
    officialWebsite: "https://www.kingspec.com",
    certifications: ["CE", "FCC", "RoHS", "CCC"]
  }),
  m({
    code: "kingdian",
    name: "KingDian (金典)",
    shortName: "KingDian",
    country: "CN",
    authorityScore: 83,
    coverageScore: 68,
    segments: ["SSD"],
    aliases: ["kingdian", "金典", "jīndiǎn"],
    brands: ["KingDian"],
    officialWebsite: "https://www.kingdian.com",
    certifications: ["CE", "RoHS", "CCC"]
  }),
  m({
    code: "gloway",
    name: "Gloway (光威)",
    shortName: "Gloway",
    country: "CN",
    authorityScore: 87,
    coverageScore: 78,
    segments: ["SSD", "Memory"],
    aliases: ["gloway", "光威", "guāngwēi"],
    brands: ["Gloway", "Pro"],
    officialWebsite: "https://www.gloway.com",
    certifications: ["CE", "RoHS", "CCC"]
  }),
  m({
    code: "biwin",
    name: "Biwin (佰维)",
    shortName: "Biwin",
    country: "CN",
    authorityScore: 86,
    coverageScore: 75,
    segments: ["SSD", "Memory"],
    aliases: ["biwin", "佰维", "bǎiwéi"],
    brands: ["Biwin", "Datak"],
    officialWebsite: "https://www.biwin.com",
    certifications: ["CE", "FCC", "RoHS", "CCC"]
  }),
  m({
    code: "fanxiang",
    name: "Fanxiang (梵想)",
    shortName: "Fanxiang",
    country: "CN",
    authorityScore: 84,
    coverageScore: 70,
    segments: ["SSD"],
    aliases: ["fanxiang", "梵想", "fànxiǎng"],
    brands: ["Fanxiang"],
    officialWebsite: "https://www.fanxiang.com",
    certifications: ["CE", "RoHS", "CCC"]
  }),
  m({
    code: "goldenfir",
    name: "Goldenfir (金泰)",
    shortName: "Goldenfir",
    country: "CN",
    authorityScore: 83,
    coverageScore: 65,
    segments: ["SSD"],
    aliases: ["goldenfir", "金泰", "jīntài"],
    brands: ["Goldenfir"],
    officialWebsite: "https://www.goldenfir.com",
    certifications: ["CE", "RoHS", "CCC"]
  }),
  m({
    code: "walram",
    name: "Walram",
    shortName: "Walram",
    country: "CN",
    authorityScore: 82,
    coverageScore: 60,
    segments: ["SSD", "Memory"],
    aliases: ["walram"],
    brands: ["Walram"],
    officialWebsite: "https://www.walram.com",
    certifications: ["CE", "RoHS"]
  }),
  m({
    code: "lexar_china",
    name: "Lexar (Longsys)",
    shortName: "Lexar",
    country: "CN",
    authorityScore: 89,
    coverageScore: 82,
    segments: ["SSD", "Memory"],
    aliases: ["lexar china", "lexar", "雷克沙", "léikèshā"],
    brands: ["Lexar", "NS100", "NM710"],
    officialWebsite: "https://www.lexar.com",
    certifications: ["CE", "FCC", "RoHS", "CCC"]
  }),
  // PSUs
  m({
    code: "segotep",
    name: "Segotep (鑫谷)",
    shortName: "Segotep",
    country: "CN",
    authorityScore: 87,
    coverageScore: 75,
    segments: ["PowerSupply", "Case"],
    aliases: ["segotep", "鑫谷", "xīngǔ"],
    brands: ["Segotep", "GP", "PG"],
    officialWebsite: "https://www.segotep.com",
    certifications: ["CE", "FCC", "RoHS", "CCC"]
  }),
  m({
    code: "huntkey",
    name: "Huntkey (航嘉)",
    shortName: "Huntkey",
    country: "CN",
    authorityScore: 88,
    coverageScore: 80,
    segments: ["PowerSupply"],
    aliases: ["huntkey", "航嘉", "hángjiā"],
    brands: ["Huntkey", "MVP"],
    officialWebsite: "https://www.huntkey.com",
    certifications: ["CE", "FCC", "RoHS", "UL", "CCC"]
  }),
  m({
    code: "great_wall",
    name: "Great Wall (长城)",
    shortName: "Great Wall",
    country: "CN",
    authorityScore: 86,
    coverageScore: 72,
    segments: ["PowerSupply"],
    aliases: ["great wall", "长城", "chángchéng", "gw"],
    brands: ["Great Wall", "GW"],
    officialWebsite: "https://www.greatwall.com",
    certifications: ["CE", "FCC", "RoHS", "CCC"]
  }),
  m({
    code: "gamemax",
    name: "GameMax",
    shortName: "GameMax",
    country: "CN",
    authorityScore: 84,
    coverageScore: 68,
    segments: ["PowerSupply", "Case", "Cooling"],
    aliases: ["gamemax"],
    brands: ["GameMax", "Rampage"],
    officialWebsite: "https://www.gamemax.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  // Cases / Coolers
  m({
    code: "jonsbo",
    name: "Jonsbo (乔思伯)",
    shortName: "Jonsbo",
    country: "CN",
    authorityScore: 89,
    coverageScore: 78,
    segments: ["Case", "Cooling"],
    aliases: ["jonsbo", "乔思伯", "qiáosībó"],
    brands: ["Jonsbo", "D31", "T8"],
    officialWebsite: "https://www.jonsbo.com",
    certifications: ["CE", "RoHS"]
  }),
  m({
    code: "pccooler",
    name: "PCCooler (超频三)",
    shortName: "PCCooler",
    country: "CN",
    authorityScore: 86,
    coverageScore: 72,
    segments: ["Cooling", "Case"],
    aliases: ["pccooler", "超频三", "chāopínsān"],
    brands: ["PCCooler"],
    officialWebsite: "https://www.pccooler.com",
    certifications: ["CE", "RoHS", "CCC"]
  }),
  m({
    code: "id_cooling",
    name: "ID-COOLING",
    shortName: "ID-COOLING",
    country: "CN",
    authorityScore: 87,
    coverageScore: 75,
    segments: ["Cooling"],
    aliases: ["id-cooling", "id cooling", "idcooling"],
    brands: ["ID-COOLING", "SE", "FX"],
    officialWebsite: "https://www.idcooling.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "deepcool",
    name: "DeepCool (九州风神)",
    shortName: "DeepCool",
    country: "CN",
    authorityScore: 91,
    coverageScore: 88,
    segments: ["Cooling", "Case", "PowerSupply", "Peripherals"],
    aliases: ["deepcool", "九州风神", "jiǔzhōufēngshén"],
    brands: ["DeepCool", "AK", "CK"],
    officialWebsite: "https://www.deepcool.com",
    certifications: ["CE", "FCC", "RoHS", "CCC"]
  }),
  m({
    code: "thermalright",
    name: "Thermalright",
    shortName: "Thermalright",
    country: "TW",
    authorityScore: 90,
    coverageScore: 82,
    segments: ["Cooling"],
    aliases: ["thermalright"],
    brands: ["Thermalright", "Peerless Assassin", "Silver Soul"],
    officialWebsite: "https://www.thermalright.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "snowman",
    name: "Snowman (利民)",
    shortName: "Snowman",
    country: "CN",
    authorityScore: 88,
    coverageScore: 76,
    segments: ["Cooling"],
    aliases: ["snowman", "利民", "lìmín", "thermalright snowman"],
    brands: ["Snowman", "利民"],
    officialWebsite: "https://www.snowman.com",
    certifications: ["CE", "RoHS", "CCC"]
  }),
  // Networking / Mini PCs
  m({
    code: "topton",
    name: "Topton",
    shortName: "Topton",
    country: "CN",
    authorityScore: 82,
    coverageScore: 55,
    segments: ["MiniPC", "Networking"],
    aliases: ["topton"],
    brands: ["Topton"],
    officialWebsite: "https://www.topton.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "cwwk",
    name: "CWWK",
    shortName: "CWWK",
    country: "CN",
    authorityScore: 82,
    coverageScore: 52,
    segments: ["MiniPC", "Networking", "Motherboard"],
    aliases: ["cwwk"],
    brands: ["CWWK"],
    officialWebsite: "https://www.cwwk.com",
    certifications: ["CE", "FCC", "RoHS"]
  }),
  m({
    code: "minisforum",
    name: "Minisforum (零刻)",
    shortName: "Minisforum",
    country: "CN",
    authorityScore: 86,
    coverageScore: 80,
    segments: ["MiniPC"],
    aliases: ["minisforum", "零刻", "língkè"],
    brands: ["Minisforum", "UM", "N", "H"],
    officialWebsite: "https://www.minisforum.com",
    certifications: ["CE", "FCC", "RoHS", "CCC"]
  }),
  m({
    code: "beelink",
    name: "Beelink",
    shortName: "Beelink",
    country: "CN",
    authorityScore: 85,
    coverageScore: 78,
    segments: ["MiniPC"],
    aliases: ["beelink"],
    brands: ["Beelink", "SER", "GTR"],
    officialWebsite: "https://www.bee-link.com",
    certifications: ["CE", "FCC", "RoHS", "CCC"]
  }),
  m({
    code: "gmktec",
    name: "GMKtec",
    shortName: "GMKtec",
    country: "CN",
    authorityScore: 83,
    coverageScore: 70,
    segments: ["MiniPC"],
    aliases: ["gmktec"],
    brands: ["GMKtec", "M5", "NucBox"],
    officialWebsite: "https://www.gmktec.com",
    certifications: ["CE", "FCC", "RoHS"]
  })
];

// ── Tier D: Emerging manufacturers (10) ────────────────────

const tierD: ReadonlyArray<Manufacturer> = [
  m({
    code: "kllisre",
    name: "Kllisre",
    shortName: "Kllisre",
    country: "CN",
    authorityScore: 75,
    coverageScore: 32,
    segments: ["Motherboard"],
    aliases: ["kllisre"],
    brands: ["Kllisre"],
    officialWebsite: "https://www.kllisre.com",
    certifications: ["CE", "RoHS"]
  }),
  m({
    code: "atermiter",
    name: "Atermiter",
    shortName: "Atermiter",
    country: "CN",
    authorityScore: 73,
    coverageScore: 30,
    segments: ["Motherboard"],
    aliases: ["atermiter"],
    brands: ["Atermiter"],
    certifications: ["CE", "RoHS"]
  }),
  m({
    code: "szcpu",
    name: "SZCPU",
    shortName: "SZCPU",
    country: "CN",
    authorityScore: 71,
    coverageScore: 28,
    segments: ["Motherboard", "CPU"],
    aliases: ["szcpu"],
    brands: ["SZCPU"],
    certifications: ["RoHS"]
  }),
  m({
    code: "mllse",
    name: "MLLSE",
    shortName: "MLLSE",
    country: "CN",
    authorityScore: 78,
    coverageScore: 40,
    segments: ["Cooling"],
    aliases: ["mllse"],
    brands: ["MLLSE"],
    certifications: ["CE", "RoHS"]
  }),
  m({
    code: "reletech",
    name: "Reletech (雷克)",
    shortName: "Reletech",
    country: "CN",
    authorityScore: 76,
    coverageScore: 42,
    segments: ["SSD"],
    aliases: ["reletech", "雷克", "léikè"],
    brands: ["Reletech"],
    officialWebsite: "https://www.reletech.com",
    certifications: ["CE", "RoHS"]
  }),
  m({
    code: "xraydisk",
    name: "XrayDisk",
    shortName: "XrayDisk",
    country: "CN",
    authorityScore: 74,
    coverageScore: 35,
    segments: ["SSD"],
    aliases: ["xraydisk"],
    brands: ["XrayDisk"],
    officialWebsite: "https://www.xraydisk.com",
    certifications: ["CE", "RoHS"]
  }),
  m({
    code: "elsa_china",
    name: "ELSA China",
    shortName: "ELSA",
    country: "CN",
    authorityScore: 72,
    coverageScore: 30,
    segments: ["GPU"],
    aliases: ["elsa china", "elsa"],
    brands: ["ELSA"],
    certifications: ["CE", "RoHS"]
  }),
  m({
    code: "puskill",
    name: "Puskill",
    shortName: "Puskill",
    country: "CN",
    authorityScore: 71,
    coverageScore: 25,
    segments: ["PowerSupply"],
    aliases: ["puskill"],
    brands: ["Puskill"],
    certifications: ["CE", "RoHS"]
  }),
  m({
    code: "teclast",
    name: "Teclast (台电)",
    shortName: "Teclast",
    country: "CN",
    authorityScore: 80,
    coverageScore: 55,
    segments: ["SSD", "Memory", "MiniPC"],
    aliases: ["teclast", "台电", "táidiàn"],
    brands: ["Teclast"],
    officialWebsite: "https://www.teclast.com",
    certifications: ["CE", "FCC", "RoHS", "CCC"]
  }),
  m({
    code: "alseye",
    name: "Alseye",
    shortName: "Alseye",
    country: "CN",
    authorityScore: 72,
    coverageScore: 28,
    segments: ["Cooling"],
    aliases: ["alseye"],
    brands: ["Alseye"],
    certifications: ["CE", "RoHS"]
  })
];

// ── Combined registry ──────────────────────────────────────

export const MANUFACTURERS: ReadonlyArray<Manufacturer> = [...tierA, ...tierB, ...tierC, ...tierD];

// ── Lookup helpers ─────────────────────────────────────────

const MANUFACTURER_BY_CODE = new Map<string, Manufacturer>(
  MANUFACTURERS.map((mfr) => [mfr.code, mfr])
);

const MANUFACTURER_BY_ALIAS = new Map<string, Manufacturer>();
for (const mfr of MANUFACTURERS) {
  for (const alias of mfr.aliases) {
    MANUFACTURER_BY_ALIAS.set(alias.toLowerCase().trim(), mfr);
  }
  // Also index brand names
  for (const brand of mfr.brands) {
    MANUFACTURER_BY_ALIAS.set(brand.toLowerCase().trim(), mfr);
  }
}

export function getManufacturerByCode(code: string): Manufacturer | null {
  return MANUFACTURER_BY_CODE.get(code) ?? null;
}

export function getManufacturersByCountry(country: CountryCode): ReadonlyArray<Manufacturer> {
  return MANUFACTURERS.filter((m) => m.country === country);
}

export function getManufacturersBySegment(segment: ProductSegment): ReadonlyArray<Manufacturer> {
  return MANUFACTURERS.filter((m) => m.segments.includes(segment));
}

export function getManufacturersByTier(tier: "A" | "B" | "C" | "D"): ReadonlyArray<Manufacturer> {
  const ranges = { A: [98, 100], B: [92, 97], C: [82, 91], D: [70, 81] } as const;
  const [min, max] = ranges[tier];
  return MANUFACTURERS.filter((m) => m.authorityScore >= min && m.authorityScore <= max);
}

export function getManufacturerCount(): number {
  return MANUFACTURERS.length;
}

export function getSegmentCoverage(): Record<ProductSegment, number> {
  const counts: Record<string, number> = {};
  for (const mfr of MANUFACTURERS) {
    for (const seg of mfr.segments) {
      counts[seg] = (counts[seg] ?? 0) + 1;
    }
  }
  return counts as Record<ProductSegment, number>;
}

export function getCountryCoverage(): Record<CountryCode, number> {
  const counts: Record<string, number> = {};
  for (const mfr of MANUFACTURERS) {
    counts[mfr.country] = (counts[mfr.country] ?? 0) + 1;
  }
  return counts as Record<CountryCode, number>;
}

// ── Brand → Manufacturer routing (multilingual) ────────────

export function routeBrandToManufacturer(brand: string): Manufacturer | null {
  const normalized = brand.trim().toLowerCase();
  if (!normalized || normalized === "unknown") return null;

  // Exact match on alias or brand
  const exact = MANUFACTURER_BY_ALIAS.get(normalized);
  if (exact) return exact;

  // Substring match (for "Intel Corporation", "AMD Ryzen", etc.)
  for (const [alias, mfr] of MANUFACTURER_BY_ALIAS) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return mfr;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// KNOWLEDGE GRAPH — example nodes and edges
// ═══════════════════════════════════════════════════════════

import {
  node as kn,
  edge as ke,
  type KnowledgeNode,
  type KnowledgeEdge,
  type KnowledgeGraph
} from "./knowledge-graph";

const kgNodes: KnowledgeNode[] = [
  // Manufacturers
  kn({ type: "manufacturer", label: "Intel", externalId: "mfr_intel", properties: { country: "US", authority: 100 } }),
  kn({ type: "manufacturer", label: "AMD", externalId: "mfr_amd", properties: { country: "US", authority: 100 } }),
  kn({ type: "manufacturer", label: "Colorful", externalId: "mfr_colorful", properties: { country: "CN", authority: 90 } }),
  // Products
  kn({ type: "product", label: "Intel Core i9-14900K", externalId: "prod_i9_14900k", properties: { mpn: "BX8071514900K" } }),
  kn({ type: "product", label: "AMD Ryzen 9 7950X", externalId: "prod_r9_7950x", properties: { mpn: "100-100000514WOF" } }),
  kn({ type: "product", label: "Colorful X79 Turbo", externalId: "prod_colorful_x79", properties: { mpn: "X79-TURBO" } }),
  // Brands
  kn({ type: "brand", label: "Core", externalId: "brand_core" }),
  kn({ type: "brand", label: "Ryzen", externalId: "brand_ryzen" }),
  kn({ type: "brand", label: "iGame", externalId: "brand_igame" }),
  // Categories
  kn({ type: "category", label: "CPU", externalId: "cat_cpu" }),
  kn({ type: "category", label: "Motherboard", externalId: "cat_motherboard" }),
  // Attributes
  kn({ type: "product_attribute", label: "cpu.socket = LGA1700", externalId: "attr_i9_socket", properties: { attributeId: "cpu.socket", value: "LGA1700" } }),
  kn({ type: "product_attribute", label: "cpu.cores = 24", externalId: "attr_i9_cores", properties: { attributeId: "cpu.cores", value: "24" } }),
  kn({ type: "product_attribute", label: "cpu.socket = AM5", externalId: "attr_r9_socket", properties: { attributeId: "cpu.socket", value: "AM5" } }),
  // Datasheets
  kn({ type: "datasheet", label: "Intel i9-14900K Datasheet", externalId: "ds_i9_14900k", properties: { url: "https://cdrdv2.intel.com/datasheet/14900k.pdf", format: "pdf" } }),
  // Connectors
  kn({ type: "connector_instance", label: "Intel Ark API", externalId: "cinst_intel_official_api_production", properties: { status: "healthy", successRate: 99.8 } }),
  kn({ type: "connector_instance", label: "Colorful Scraper", externalId: "cinst_colorful_scraper_production", properties: { status: "healthy", successRate: 94.5 } }),
];

const kgEdges: KnowledgeEdge[] = [
  // manufactures
  ke({ source: kgNodes[0]!.id, target: kgNodes[3]!.id, type: "manufactures" }), // Intel → i9-14900K
  ke({ source: kgNodes[1]!.id, target: kgNodes[4]!.id, type: "manufactures" }), // AMD → Ryzen 9 7950X
  ke({ source: kgNodes[2]!.id, target: kgNodes[5]!.id, type: "manufactures" }), // Colorful → X79 Turbo
  // owns_brand
  ke({ source: kgNodes[0]!.id, target: kgNodes[6]!.id, type: "owns_brand" }), // Intel → Core
  ke({ source: kgNodes[1]!.id, target: kgNodes[7]!.id, type: "owns_brand" }), // AMD → Ryzen
  ke({ source: kgNodes[2]!.id, target: kgNodes[8]!.id, type: "owns_brand" }), // Colorful → iGame
  // belongs_to (product → category)
  ke({ source: kgNodes[3]!.id, target: kgNodes[9]!.id, type: "belongs_to" }), // i9 → CPU
  ke({ source: kgNodes[4]!.id, target: kgNodes[9]!.id, type: "belongs_to" }), // Ryzen 9 → CPU
  ke({ source: kgNodes[5]!.id, target: kgNodes[10]!.id, type: "belongs_to" }), // X79 → Motherboard
  // has_attribute (product → attribute)
  ke({ source: kgNodes[3]!.id, target: kgNodes[11]!.id, type: "has_attribute" }), // i9 → socket=LGA1700
  ke({ source: kgNodes[3]!.id, target: kgNodes[12]!.id, type: "has_attribute" }), // i9 → cores=24
  ke({ source: kgNodes[4]!.id, target: kgNodes[13]!.id, type: "has_attribute" }), // Ryzen 9 → socket=AM5
  // supported_by (attribute → datasheet)
  ke({ source: kgNodes[11]!.id, target: kgNodes[14]!.id, type: "supported_by" }), // i9 socket ← Datasheet
  // retrieved_by (datasheet → connector)
  ke({ source: kgNodes[14]!.id, target: kgNodes[15]!.id, type: "retrieved_by" }), // Datasheet ← Intel Ark API
];

export const KNOWLEDGE_GRAPH: KnowledgeGraph = {
  nodes: kgNodes,
  edges: kgEdges
};
