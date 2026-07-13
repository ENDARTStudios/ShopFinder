/**
 * @workspace/domain/discovery/normalizer/canonical-attributes
 *
 * Marketplace-agnostic attribute mapping.
 *
 * The marketplace sends "颜色", "Color", "Colour", "Cor" → all map to
 * COLOR. Never "AliExpressColor" or "ShopeeColor".
 *
 * The dictionary is versioned (attributeDictionaryVersion in
 * NormalizerVersions) so that reprocessing with a new dictionary
 * produces new NormalizedProductRecords without overwriting old ones.
 */
import type { CanonicalAttribute, CanonicalAttributeName } from "./types";

// ── Attribute name aliases ─────────────────────────────────

const ATTRIBUTE_ALIASES: Readonly<Record<string, CanonicalAttributeName>> = {
  // COLOR
  color: "COLOR",
  colour: "COLOR",
  cor: "COLOR",
  颜色: "COLOR",
  цвет: "COLOR",
  couleur: "COLOR",
  farbe: "COLOR",
  colore: "COLOR",
  色: "COLOR",

  // SIZE
  size: "SIZE",
  sizes: "SIZE",
  tamanho: "SIZE",
  taille: "SIZE",
  tamaño: "SIZE",
  尺寸: "SIZE",
  размер: "SIZE",
  größe: "SIZE",
  misura: "SIZE",

  // MATERIAL
  material: "MATERIAL",
  materials: "MATERIAL",
  materiale: "MATERIAL",
  材料: "MATERIAL",
  материал: "MATERIAL",
  matériau: "MATERIAL",
  stoff: "MATERIAL",

  // BRAND
  brand: "BRAND",
  brands: "BRAND",
  marca: "BRAND",
  marque: "BRAND",
  marken: "BRAND",
  品牌: "BRAND",
  бренд: "BRAND",

  // WEIGHT
  weight: "WEIGHT",
  peso: "WEIGHT",
  poids: "WEIGHT",
  gewicht: "WEIGHT",
  重量: "WEIGHT",
  вес: "WEIGHT",

  // DIMENSIONS
  dimensions: "DIMENSIONS",
  dimension: "DIMENSIONS",
  medidas: "DIMENSIONS",
  dimensioni: "DIMENSIONS",
  abmessungen: "DIMENSIONS",

  // GENDER
  gender: "GENDER",
  género: "GENDER",
  genere: "GENDER",
  性别: "GENDER",
  пол: "GENDER",

  // STYLE
  style: "STYLE",
  estilo: "STYLE",
  stile: "STYLE",
  stil: "STYLE",
  风格: "STYLE",
  стиль: "STYLE",

  // PATTERN
  pattern: "PATTERN",
  padrão: "PATTERN",
  motifs: "PATTERN",
  muster: "PATTERN",
  图案: "PATTERN",
  узор: "PATTERN",

  // SLEEVE_LENGTH
  "sleeve length": "SLEEVE_LENGTH",
  sleeve_length: "SLEEVE_LENGTH",
  sleevelength: "SLEEVE_LENGTH",
  manga: "SLEEVE_LENGTH",
  manica: "SLEEVE_LENGTH",
  袖长: "SLEEVE_LENGTH",

  // NECKLINE
  neckline: "NECKLINE",
  "neck line": "NECKLINE",
  cuello: "NECKLINE",
  col: "NECKLINE",
  领型: "NECKLINE",

  // OCCASION
  occasion: "OCCASION",
  occasione: "OCCASION",
  anlass: "OCCASION",
  场合: "OCCASION",
  случай: "OCCASION",

  // SEASON
  season: "SEASON",
  temporada: "SEASON",
  stagione: "SEASON",
  jahreszeit: "SEASON",
  季节: "SEASON",
  сезон: "SEASON",

  // CAPACITY
  capacity: "CAPACITY",
  capacidad: "CAPACITY",
  capacità: "CAPACITY",
  kapazität: "CAPACITY",
  容量: "CAPACITY",
  емкость: "CAPACITY",

  // VOLTAGE
  voltage: "VOLTAGE",
  voltaje: "VOLTAGE",
  tensione: "VOLTAGE",
  spannung: "VOLTAGE",
  电压: "VOLTAGE",
  напряжение: "VOLTAGE",

  // POWER
  power: "POWER",
  potencia: "POWER",
  potenza: "POWER",
  leistung: "POWER",
  功率: "POWER",
  мощность: "POWER",

  // CONNECTOR_TYPE
  "connector type": "CONNECTOR_TYPE",
  connector_type: "CONNECTOR_TYPE",
  connectortype: "CONNECTOR_TYPE",
  "tipo de conector": "CONNECTOR_TYPE",
  "tipo di connettore": "CONNECTOR_TYPE",
  接口类型: "CONNECTOR_TYPE"
};

/**
 * Normalize an attribute name to its canonical form.
 * Returns null if no mapping exists (the attribute is unknown).
 */
export function canonicalizeAttributeName(rawName: string): CanonicalAttributeName | null {
  const normalized = rawName.trim().toLowerCase();
  return ATTRIBUTE_ALIASES[normalized] ?? null;
}

/**
 * Canonicalize a full attribute (name + value).
 */
export function canonicalizeAttribute(
  rawName: string,
  rawValue: string
): CanonicalAttribute | null {
  const canonical = canonicalizeAttributeName(rawName);
  if (!canonical) return null;
  return {
    name: canonical,
    value: rawValue.trim(),
    confidence: 0.9, // dictionary match = high confidence
    sourceAttribute: rawName
  };
}

/**
 * Canonicalize all attributes from a raw product.
 * Unknown attributes are skipped (not stored).
 */
export function canonicalizeAttributes(
  rawAttributes: Record<string, string>
): ReadonlyArray<CanonicalAttribute> {
  const result: CanonicalAttribute[] = [];
  for (const [rawName, rawValue] of Object.entries(rawAttributes)) {
    const canonical = canonicalizeAttribute(rawName, rawValue);
    if (canonical) result.push(canonical);
  }
  return result;
}

/**
 * Get the list of all known canonical attribute names.
 */
export function getKnownAttributeNames(): ReadonlyArray<CanonicalAttributeName> {
  return [...new Set(Object.values(ATTRIBUTE_ALIASES))];
}
