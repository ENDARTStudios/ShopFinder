/**
 * @workspace/domain/discovery/enrichment/ontology
 *
 * Product Knowledge Ontology — formal vocabulary for the Knowledge Graph.
 *
 * Every attribute in the platform has a canonical ID (e.g., "cpu.socket")
 * with a formal definition: display name, unit, datatype, allowed values,
 * normalizer function, and validator. This eliminates the problem of
 * dozens of equivalent names ("socket", "Socket", "cpu_socket",
 * "processor_socket", "cpuSocket" → all become "cpu.socket").
 *
 * The Normalizer no longer knows about individual attributes — it
 * consults the ontology to find the canonical ID, normalizer, and
 * validator for any raw attribute name it encounters.
 *
 * Hierarchy:
 *   cpu.*        — CPU attributes
 *   gpu.*        — GPU attributes
 *   motherboard.*— Motherboard attributes
 *   memory.*     — RAM attributes
 *   storage.*    — SSD/HDD attributes
 *   psu.*        — Power supply attributes
 *   cooling.*    — Cooler attributes
 *   case.*       — Case attributes
 *   display.*    — Monitor attributes
 *   network.*    — Networking attributes
 *   general.*    — Cross-category attributes (brand, mpn, ean, weight, etc.)
 */
import type { BrandedId } from "../../shared";

// ── Attribute ID (global, canonical) ───────────────────────

export type AttributeId = BrandedId<"AttributeId">;

export function attrId(id: string): AttributeId {
  return id as unknown as AttributeId;
}

// ── Datatypes ──────────────────────────────────────────────

export type AttributeDatatype =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "enum"
  | "frequency"    // GHz, MHz
  | "temperature"  // °C
  | "power"        // W
  | "memory"       // GB, MB, TB
  | "dimension"    // mm
  | "weight"       // g, kg
  | "currency"     // USD, BRL
  | "percentage";

// ── Attribute Definition ───────────────────────────────────

export interface AttributeDefinition {
  readonly id: AttributeId;           // "cpu.socket"
  readonly displayName: string;       // "CPU Socket"
  readonly description: string;       // "Processor socket type"
  readonly unit: string | null;       // "GHz", "W", "mm", null for enums
  readonly datatype: AttributeDatatype;
  readonly allowedValues?: ReadonlyArray<string>;  // for enums: ["LGA1700", "AM5", ...]
  readonly minValue?: number;         // for numeric validation
  readonly maxValue?: number;
  readonly aliases: ReadonlyArray<string>;  // ["socket", "Socket", "cpu_socket", "processor_socket"]
  readonly category: string;          // "cpu", "gpu", "motherboard", "general"
  readonly normalizer: (raw: string) => string;
  readonly validator: (value: string) => boolean;
}

// ── Helper to create attribute definitions ─────────────────

function def(params: {
  id: string;
  displayName: string;
  description: string;
  unit?: string | null;
  datatype: AttributeDatatype;
  allowedValues?: ReadonlyArray<string>;
  minValue?: number;
  maxValue?: number;
  aliases: ReadonlyArray<string>;
  category: string;
}): AttributeDefinition {
  return {
    id: attrId(params.id),
    displayName: params.displayName,
    description: params.description,
    unit: params.unit ?? null,
    datatype: params.datatype,
    allowedValues: params.allowedValues,
    minValue: params.minValue,
    maxValue: params.maxValue,
    aliases: params.aliases,
    category: params.category,
    normalizer: (raw: string): string => {
      const trimmed = raw.trim();
      switch (params.datatype) {
        case "frequency":
          // "3.2 GHz" → "3.2", "3200 MHz" → "3.2"
          const freqMatch = trimmed.match(/^([\d.]+)\s*(GHz|MHz|khz|KHz)?$/i);
          if (freqMatch) {
            const val = parseFloat(freqMatch[1]!);
            const unit = (freqMatch[2] ?? "GHz").toLowerCase();
            return unit === "mhz" ? (val / 1000).toString() : val.toString();
          }
          return trimmed;
        case "power":
          return trimmed.replace(/\s*W\s*$/i, "").trim();
        case "memory":
          const memMatch = trimmed.match(/^([\d.]+)\s*(TB|GB|MB)?$/i);
          if (memMatch) {
            const val = parseFloat(memMatch[1]!);
            const unit = (memMatch[2] ?? "GB").toUpperCase();
            return unit === "TB" ? `${val * 1024}` : unit === "MB" ? `${val / 1024}` : val.toString();
          }
          return trimmed;
        case "dimension":
          return trimmed.replace(/\s*mm\s*$/i, "").trim();
        case "weight":
          return trimmed.replace(/\s*(g|grams|kg)\s*$/i, "").trim();
        case "string":
        case "enum":
        default:
          return trimmed;
      }
    },
    validator: (value: string): boolean => {
      if (params.allowedValues && !params.allowedValues.includes(value)) return false;
      if (params.datatype === "number" || params.datatype === "frequency" || params.datatype === "power" || params.datatype === "memory" || params.datatype === "dimension" || params.datatype === "weight") {
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        if (params.minValue !== undefined && num < params.minValue) return false;
        if (params.maxValue !== undefined && num > params.maxValue) return false;
      }
      return true;
    }
  };
}

// ═══════════════════════════════════════════════════════════
// ONTOLOGY — canonical attribute registry
// ═══════════════════════════════════════════════════════════

export const ONTOLOGY: ReadonlyArray<AttributeDefinition> = [
  // ── CPU attributes ──────────────────────────────────────
  def({ id: "cpu.socket", displayName: "CPU Socket", description: "Processor socket type", datatype: "enum", allowedValues: ["LGA1700", "LGA1851", "LGA2011", "LGA2011-3", "AM4", "AM5", "SP5", "SP3", "sTR5"], aliases: ["socket", "Socket", "cpu_socket", "processor_socket", "cpuSocket", "CPU Socket"], category: "cpu" }),
  def({ id: "cpu.cores", displayName: "Total Cores", description: "Total number of CPU cores", unit: "cores", datatype: "integer", minValue: 1, maxValue: 256, aliases: ["cores", "Cores", "# of CPU Cores", "Total Cores", "core_count", "cpuCores"], category: "cpu" }),
  def({ id: "cpu.threads", displayName: "Total Threads", description: "Total number of CPU threads", unit: "threads", datatype: "integer", minValue: 1, maxValue: 512, aliases: ["threads", "Threads", "# of Threads", "Total Threads", "thread_count"], category: "cpu" }),
  def({ id: "cpu.base_clock", displayName: "Base Clock", description: "Processor base frequency", unit: "GHz", datatype: "frequency", minValue: 0.1, maxValue: 10, aliases: ["base_clock", "Base Clock", "Processor Base Frequency", "base frequency", "baseFrequency", "clock_speed"], category: "cpu" }),
  def({ id: "cpu.max_turbo", displayName: "Max Turbo Frequency", description: "Maximum turbo frequency", unit: "GHz", datatype: "frequency", minValue: 0.1, maxValue: 10, aliases: ["max_turbo", "Max Turbo", "Max Boost Clock", "Max Boost", "boost_clock", "turbo", "maxTurbo"], category: "cpu" }),
  def({ id: "cpu.tdp", displayName: "TDP", description: "Thermal Design Power", unit: "W", datatype: "power", minValue: 1, maxValue: 1000, aliases: ["tdp", "TDP", "Default TDP", "Processor Base Power", "power_draw", "thermal_design_power"], category: "cpu" }),
  def({ id: "cpu.lithography", displayName: "Lithography", description: "Manufacturing process node", datatype: "string", aliases: ["lithography", "Lithography", "process", "node", "fabrication"], category: "cpu" }),
  def({ id: "cpu.cache_l3", displayName: "L3 Cache", description: "Level 3 cache size", unit: "MB", datatype: "memory", aliases: ["l3_cache", "L3 Cache", "Cache", "cache", "L3"], category: "cpu" }),

  // ── GPU attributes ──────────────────────────────────────
  def({ id: "gpu.memory", displayName: "VRAM", description: "Video memory capacity", unit: "GB", datatype: "memory", minValue: 0.5, maxValue: 128, aliases: ["vram", "VRAM", "memory", "Memory Size", "gpu_memory", "video_memory", "GDDR"], category: "gpu" }),
  def({ id: "gpu.memory_type", displayName: "VRAM Type", description: "Video memory type", datatype: "enum", allowedValues: ["GDDR6", "GDDR6X", "GDDR5", "HBM2", "HBM3", "LPDDR5"], aliases: ["memory_type", "Memory Type", "VRAM Type", "gpu_memory_type"], category: "gpu" }),
  def({ id: "gpu.cuda_cores", displayName: "CUDA Cores", description: "Number of CUDA cores (NVIDIA)", unit: "cores", datatype: "integer", minValue: 0, aliases: ["cuda_cores", "CUDA Cores", "CUDA", "cuda"], category: "gpu" }),
  def({ id: "gpu.tdp", displayName: "GPU TDP", description: "GPU thermal design power", unit: "W", datatype: "power", minValue: 1, maxValue: 1000, aliases: ["gpu_tdp", "TDP", "GPU Power", "power_consumption", "graphics_power"], category: "gpu" }),
  def({ id: "gpu.pcie_version", displayName: "PCIe Version", description: "PCI Express version supported", datatype: "string", aliases: ["pcie_version", "PCIe Version", "PCI Express", "pcie", "PCIe"], category: "gpu" }),

  // ── Motherboard attributes ──────────────────────────────
  def({ id: "motherboard.chipset", displayName: "Chipset", description: "Motherboard chipset", datatype: "string", aliases: ["chipset", "Chipset", "motherboard_chipset"], category: "motherboard" }),
  def({ id: "motherboard.form_factor", displayName: "Form Factor", description: "Motherboard form factor", datatype: "enum", allowedValues: ["ATX", "Micro-ATX", "Mini-ITX", "E-ATX", "SSI-EEB", "Thin-ITX"], aliases: ["form_factor", "Form Factor", "size", "footprint"], category: "motherboard" }),
  def({ id: "motherboard.memory_type", displayName: "Memory Type", description: "Supported memory type", datatype: "enum", allowedValues: ["DDR4", "DDR5", "DDR3", "LPDDR4", "LPDDR5"], aliases: ["memory_type", "Memory Type", "Memory Types", "ram_type", "memory_support"], category: "motherboard" }),
  def({ id: "motherboard.memory_slots", displayName: "Memory Slots", description: "Number of DIMM slots", unit: "slots", datatype: "integer", minValue: 1, maxValue: 16, aliases: ["memory_slots", "Memory Slots", "DIMM slots", "dimm_slots"], category: "motherboard" }),

  // ── Memory (RAM) attributes ─────────────────────────────
  def({ id: "memory.capacity", displayName: "Capacity", description: "Total memory capacity", unit: "GB", datatype: "memory", minValue: 1, aliases: ["capacity", "Capacity", "size", "Memory Size", "total_capacity"], category: "memory" }),
  def({ id: "memory.speed", displayName: "Speed", description: "Memory speed", unit: "MHz", datatype: "frequency", aliases: ["speed", "Speed", "frequency", "Memory Speed", "data_rate", "MT/s"], category: "memory" }),
  def({ id: "memory.type", displayName: "Type", description: "Memory generation", datatype: "enum", allowedValues: ["DDR4", "DDR5", "DDR3", "LPDDR4", "LPDDR5"], aliases: ["type", "Type", "Memory Type", "memory_type", "ddr"], category: "memory" }),
  def({ id: "memory.cas_latency", displayName: "CAS Latency", description: "Column Access Strobe latency", unit: "CL", datatype: "integer", minValue: 1, maxValue: 100, aliases: ["cas_latency", "CAS Latency", "CL", "latency", "timing"], category: "memory" }),

  // ── Storage (SSD/HDD) attributes ────────────────────────
  def({ id: "storage.capacity", displayName: "Capacity", description: "Storage capacity", unit: "GB", datatype: "memory", minValue: 1, aliases: ["capacity", "Capacity", "size", "Storage Capacity", "total_capacity"], category: "storage" }),
  def({ id: "storage.interface", displayName: "Interface", description: "Storage interface", datatype: "enum", allowedValues: ["SATA III", "PCIe 3.0 NVMe", "PCIe 4.0 NVMe", "PCIe 5.0 NVMe", "SAS", "USB 3.2"], aliases: ["interface", "Interface", "storage_interface", "connection"], category: "storage" }),
  def({ id: "storage.read_speed", displayName: "Read Speed", description: "Sequential read speed", unit: "MB/s", datatype: "integer", minValue: 0, aliases: ["read_speed", "Read Speed", "sequential_read", "read"], category: "storage" }),
  def({ id: "storage.write_speed", displayName: "Write Speed", description: "Sequential write speed", unit: "MB/s", datatype: "integer", minValue: 0, aliases: ["write_speed", "Write Speed", "sequential_write", "write"], category: "storage" }),
  def({ id: "storage.form_factor", displayName: "Form Factor", description: "Storage form factor", datatype: "enum", allowedValues: ["2.5\"", "3.5\"", "M.2 2280", "M.2 2230", "U.2", "mSATA"], aliases: ["form_factor", "Form Factor", "size", "storage_size"], category: "storage" }),

  // ── Power Supply attributes ─────────────────────────────
  def({ id: "psu.wattage", displayName: "Wattage", description: "Power output", unit: "W", datatype: "power", minValue: 100, maxValue: 3000, aliases: ["wattage", "Wattage", "power", "Power Output", "psu_wattage", "rated_power"], category: "psu" }),
  def({ id: "psu.efficiency", displayName: "Efficiency Rating", description: "80 PLUS efficiency rating", datatype: "enum", allowedValues: ["80+ White", "80+ Bronze", "80+ Silver", "80+ Gold", "80+ Platinum", "80+ Titanium"], aliases: ["efficiency", "Efficiency", "80_plus", "rating", "efficiency_rating"], category: "psu" }),
  def({ id: "psu.modular", displayName: "Modularity", description: "Cable management type", datatype: "enum", allowedValues: ["Non-Modular", "Semi-Modular", "Full Modular"], aliases: ["modular", "Modular", "modularity", "cable_management"], category: "psu" }),

  // ── Cooling attributes ──────────────────────────────────
  def({ id: "cooling.type", displayName: "Cooler Type", description: "Cooling solution type", datatype: "enum", allowedValues: ["Air", "AIO", "Custom Loop", "Fan"], aliases: ["type", "Cooler Type", "cooling_type", "cooler_type"], category: "cooling" }),
  def({ id: "cooling.tdp", displayName: "Cooling TDP", description: "Maximum heat dissipation", unit: "W", datatype: "power", minValue: 1, aliases: ["tdp", "TDP", "cooling_capacity", "max_tdp", "heat_dissipation"], category: "cooling" }),
  def({ id: "cooling.fan_size", displayName: "Fan Size", description: "Fan diameter", unit: "mm", datatype: "dimension", aliases: ["fan_size", "Fan Size", "fan_diameter", "fan"], category: "cooling" }),

  // ── Case attributes ─────────────────────────────────────
  def({ id: "case.form_factor", displayName: "Supported Form Factor", description: "Motherboard form factors supported", datatype: "string", aliases: ["form_factor", "Form Factor", "motherboard_support", "case_type"], category: "case" }),
  def({ id: "case.material", displayName: "Material", description: "Case material", datatype: "string", aliases: ["material", "Material", "body_material", "construction"], category: "case" }),

  // ── Display (Monitor) attributes ────────────────────────
  def({ id: "display.size", displayName: "Screen Size", description: "Diagonal screen size", unit: "in", datatype: "number", minValue: 5, maxValue: 100, aliases: ["size", "Screen Size", "display_size", "diagonal", "inch"], category: "display" }),
  def({ id: "display.resolution", displayName: "Resolution", description: "Native resolution", datatype: "string", aliases: ["resolution", "Resolution", "native_resolution", "display_resolution"], category: "display" }),
  def({ id: "display.refresh_rate", displayName: "Refresh Rate", description: "Maximum refresh rate", unit: "Hz", datatype: "integer", minValue: 24, maxValue: 1000, aliases: ["refresh_rate", "Refresh Rate", "hz", "max_refresh"], category: "display" }),

  // ── General / cross-category attributes ─────────────────
  def({ id: "general.brand", displayName: "Brand", description: "Commercial brand name", datatype: "string", aliases: ["brand", "Brand", "manufacturer", "make"], category: "general" }),
  def({ id: "general.mpn", displayName: "MPN", description: "Manufacturer Part Number", datatype: "string", aliases: ["mpn", "MPN", "Manufacturer Part Number", "part_number", "model_number", "sku"], category: "general" }),
  def({ id: "general.ean", displayName: "EAN", description: "European Article Number", datatype: "string", aliases: ["ean", "EAN", "barcode", "ean13"], category: "general" }),
  def({ id: "general.upc", displayName: "UPC", description: "Universal Product Code", datatype: "string", aliases: ["upc", "UPC", "barcode_us"], category: "general" }),
  def({ id: "general.gtin", displayName: "GTIN", description: "Global Trade Item Number", datatype: "string", aliases: ["gtin", "GTIN", "global_trade_item_number"], category: "general" }),
  def({ id: "general.weight", displayName: "Weight", description: "Product weight", unit: "g", datatype: "weight", aliases: ["weight", "Weight", "mass", "product_weight"], category: "general" }),
  def({ id: "general.dimensions", displayName: "Dimensions", description: "Product dimensions (L×W×H)", unit: "mm", datatype: "dimension", aliases: ["dimensions", "Dimensions", "size", "package_size"], category: "general" }),
  def({ id: "general.warranty_months", displayName: "Warranty", description: "Warranty duration in months", unit: "months", datatype: "integer", minValue: 0, maxValue: 600, aliases: ["warranty", "Warranty", "warranty_months", "guarantee", "warranty_period"], category: "general" }),
];

// ── Lookup helpers ─────────────────────────────────────────

const ONTOLOGY_BY_ID = new Map<string, AttributeDefinition>(
  ONTOLOGY.map((d) => [d.id as string, d])
);

const ONTOLOGY_BY_ALIAS = new Map<string, AttributeDefinition>();
for (const def of ONTOLOGY) {
  // Index by canonical ID
  ONTOLOGY_BY_ALIAS.set((def.id as string).toLowerCase(), def);
  // Index by display name
  ONTOLOGY_BY_ALIAS.set(def.displayName.toLowerCase(), def);
  // Index by all aliases
  for (const alias of def.aliases) {
    ONTOLOGY_BY_ALIAS.set(alias.toLowerCase(), def);
  }
}

export function resolveAttribute(rawName: string): AttributeDefinition | null {
  const normalized = rawName.trim().toLowerCase();
  return ONTOLOGY_BY_ALIAS.get(normalized) ?? null;
}

export function getAttributeById(id: string): AttributeDefinition | null {
  return ONTOLOGY_BY_ID.get(id) ?? null;
}

export function getAttributesByCategory(category: string): ReadonlyArray<AttributeDefinition> {
  return ONTOLOGY.filter((d) => d.category === category);
}

export function getOntologySize(): number {
  return ONTOLOGY.length;
}
