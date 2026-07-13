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
  ManufacturerConnector,
  ConnectorId,
  InformationSource,
  InformationSourceId,
  ManufacturerVersion,
  ManufacturerVersionId,
  ConnectorStatus,
  ConnectorKind
} from "./types";
import { DEFAULT_MANUFACTURER_AUTHORITY, DEFAULT_CAPABILITIES } from "./types";

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

function c(params: {
  manufacturerCode: string;
  name: string;
  kind: ConnectorKind;
  version: string;
  status: ConnectorStatus;
  successRate: number;
  averageLatencyMs: number;
  endpoint: string;
  authType: string;
  rateLimitRemaining?: number | null;
  rateLimitWindow?: number | null;
}): ManufacturerConnector {
  const manufacturerId = `mfr_${params.manufacturerCode}` as unknown as ManufacturerId;
  return {
    id: `conn_${params.manufacturerCode}_${params.kind}` as unknown as ConnectorId,
    manufacturerId,
    manufacturerCode: params.manufacturerCode,
    name: params.name,
    kind: params.kind,
    version: params.version,
    status: params.status,
    successRate: params.successRate,
    averageLatencyMs: params.averageLatencyMs,
    lastSuccessfulSync: params.status !== "not_configured" ? new Date().toISOString() : null,
    lastFailure: params.status === "degraded" ? new Date(Date.now() - 1800000).toISOString() : null,
    rateLimitRemaining: params.rateLimitRemaining ?? null,
    rateLimitWindow: params.rateLimitWindow ?? null,
    endpoint: params.endpoint,
    authType: params.authType
  };
}

export const CONNECTORS: ReadonlyArray<ManufacturerConnector> = [
  // Tier A — live connectors
  c({
    manufacturerCode: "intel",
    name: "Intel Ark API",
    kind: "official_api",
    version: "ark-v1",
    status: "healthy",
    successRate: 99.8,
    averageLatencyMs: 420,
    endpoint: "https://api.intel.com/ark/v1",
    authType: "api_key",
    rateLimitRemaining: 850
  }),
  c({
    manufacturerCode: "amd",
    name: "AMD Product Master API",
    kind: "official_api",
    version: "product-master-v1",
    status: "healthy",
    successRate: 99.5,
    averageLatencyMs: 380,
    endpoint: "https://api.amd.com/product-master/v1",
    authType: "api_key",
    rateLimitRemaining: 920
  }),
  c({
    manufacturerCode: "nvidia",
    name: "NVIDIA Product API",
    kind: "official_api",
    version: "nvapi-v1",
    status: "healthy",
    successRate: 99.2,
    averageLatencyMs: 510,
    endpoint: "https://api.nvidia.com/v1",
    authType: "api_key",
    rateLimitRemaining: 780
  }),
  c({
    manufacturerCode: "samsung",
    name: "Samsung Semiconductor API",
    kind: "official_api",
    version: "ss-v1",
    status: "healthy",
    successRate: 98.9,
    averageLatencyMs: 620,
    endpoint: "https://api.samsungsemiconductor.com/v1",
    authType: "oauth2",
    rateLimitRemaining: 450
  }),
  // Tier B — live connectors
  c({
    manufacturerCode: "asus",
    name: "ASUS Product API",
    kind: "official_api",
    version: "asus-v1",
    status: "healthy",
    successRate: 97.5,
    averageLatencyMs: 750,
    endpoint: "https://api.asus.com/v1",
    authType: "oauth2",
    rateLimitRemaining: 320
  }),
  c({
    manufacturerCode: "msi",
    name: "MSI Product API",
    kind: "official_api",
    version: "msi-v1",
    status: "healthy",
    successRate: 96.8,
    averageLatencyMs: 820,
    endpoint: "https://api.msi.com/v1",
    authType: "api_key",
    rateLimitRemaining: 210
  }),
  // Tier C — scraper connectors for Chinese manufacturers
  c({
    manufacturerCode: "colorful",
    name: "Colorful Scraper",
    kind: "scraper",
    version: "scraper-v1",
    status: "healthy",
    successRate: 94.5,
    averageLatencyMs: 820,
    endpoint: "https://www.colorful.cn/products",
    authType: "none",
    rateLimitRemaining: null
  }),
  c({
    manufacturerCode: "huananzhi",
    name: "Huananzhi Scraper",
    kind: "scraper",
    version: "scraper-v1",
    status: "degraded",
    successRate: 87.2,
    averageLatencyMs: 1850,
    endpoint: "https://huananzhi.com/products",
    authType: "none",
    rateLimitRemaining: 23
  }),
  c({
    manufacturerCode: "deepcool",
    name: "DeepCool Scraper",
    kind: "scraper",
    version: "scraper-v1",
    status: "healthy",
    successRate: 95.1,
    averageLatencyMs: 680,
    endpoint: "https://www.deepcool.com/products",
    authType: "none",
    rateLimitRemaining: null
  }),
  c({
    manufacturerCode: "jonsbo",
    name: "Jonsbo Scraper",
    kind: "scraper",
    version: "scraper-v1",
    status: "healthy",
    successRate: 93.8,
    averageLatencyMs: 910,
    endpoint: "https://www.jonsbo.com/products",
    authType: "none",
    rateLimitRemaining: null
  }),
  c({
    manufacturerCode: "minisforum",
    name: "Minisforum API",
    kind: "official_api",
    version: "mf-v1",
    status: "healthy",
    successRate: 96.2,
    averageLatencyMs: 540,
    endpoint: "https://api.minisforum.com/v1",
    authType: "api_key",
    rateLimitRemaining: 180
  }),
  // Partner connectors (via AliExpress)
  c({
    manufacturerCode: "netac",
    name: "Netac via AliExpress",
    kind: "partner",
    version: "aliexpress-v1",
    status: "healthy",
    successRate: 92.3,
    averageLatencyMs: 1200,
    endpoint: "https://api.aliexpress.com",
    authType: "oauth2",
    rateLimitRemaining: null
  }),
  c({
    manufacturerCode: "gloway",
    name: "Gloway via AliExpress",
    kind: "partner",
    version: "aliexpress-v1",
    status: "healthy",
    successRate: 91.8,
    averageLatencyMs: 1250,
    endpoint: "https://api.aliexpress.com",
    authType: "oauth2",
    rateLimitRemaining: null
  })
];

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
  const connectorId = `conn_${params.manufacturerCode}_official_api` as unknown as ConnectorId;
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
  is({
    manufacturerCode: "intel",
    attributeType: "specifications",
    attributeName: "cores",
    url: "https://ark.intel.com/14900k",
    confidence: 1.0,
    rawValue: "24"
  }),
  is({
    manufacturerCode: "intel",
    attributeType: "specifications",
    attributeName: "base_clock",
    url: "https://ark.intel.com/14900k",
    confidence: 1.0,
    rawValue: "3.2 GHz"
  }),
  is({
    manufacturerCode: "intel",
    attributeType: "specifications",
    attributeName: "tdp",
    url: "https://ark.intel.com/14900k",
    confidence: 1.0,
    rawValue: "125 W"
  }),
  is({
    manufacturerCode: "amd",
    attributeType: "specifications",
    attributeName: "cores",
    url: "https://api.amd.com/product-master/v1/products/100-100000514WOF",
    confidence: 1.0,
    rawValue: "16"
  }),
  is({
    manufacturerCode: "amd",
    attributeType: "specifications",
    attributeName: "max_turbo",
    url: "https://api.amd.com/product-master/v1/products/100-100000514WOF",
    confidence: 1.0,
    rawValue: "5.7 GHz"
  }),
  is({
    manufacturerCode: "colorful",
    attributeType: "specifications",
    attributeName: "socket",
    url: "https://www.colorful.cn/product/x79-turbo",
    confidence: 0.85,
    rawValue: "LGA2011"
  }),
  is({
    manufacturerCode: "huananzhi",
    attributeType: "specifications",
    attributeName: "socket",
    url: "https://huananzhi.com/product/x99-f8",
    confidence: 0.75,
    rawValue: "LGA2011-3"
  }),
  is({
    manufacturerCode: "deepcool",
    attributeType: "specifications",
    attributeName: "tdp",
    url: "https://www.deepcool.com/product/ak620",
    confidence: 0.9,
    rawValue: "260W"
  })
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
    previousVersionId:
      params.version > 1
        ? (`mver_${params.manufacturerCode}_${params.version - 1}` as unknown as ManufacturerVersionId)
        : null
  };
}

export const MANUFACTURER_VERSIONS: ReadonlyArray<ManufacturerVersion> = [
  v({ manufacturerCode: "intel", version: 1, changes: ["Initial profile"] }),
  v({
    manufacturerCode: "intel",
    version: 2,
    changes: ["Added Arc GPU segment", "Updated downloadCenter URL"]
  }),
  v({ manufacturerCode: "amd", version: 1, changes: ["Initial profile"] }),
  v({
    manufacturerCode: "amd",
    version: 2,
    changes: ["Added Ryzen 9000 series", "Updated datasheetBase"]
  }),
  v({
    manufacturerCode: "colorful",
    version: 1,
    changes: ["Initial profile", "Added Chinese aliases: 七彩虹, qicaihong"]
  }),
  v({
    manufacturerCode: "huananzhi",
    version: 1,
    changes: ["Initial profile", "Low coverage — limited public documentation"]
  }),
  v({ manufacturerCode: "deepcool", version: 1, changes: ["Initial profile"] }),
  v({
    manufacturerCode: "deepcool",
    version: 2,
    changes: ["Added Peripherals segment", "Updated authority for specifications"]
  }),
  v({
    manufacturerCode: "jonsbo",
    version: 1,
    changes: ["Initial profile", "Added Cooling segment"]
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
