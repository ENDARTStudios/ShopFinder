/**
 * @workspace/domain/discovery/normalizer/stages
 *
 * 7 normalization stages (R4). Each stage:
 *   - Takes a raw value + context
 *   - Produces a NormalizationStageResult<T>
 *   - Is independently swappable
 *
 * Pipeline:
 *   TitleNormalizer → BrandNormalizer → CategoryNormalizer →
 *   AttributeNormalizer → ImageNormalizer → PriceNormalizer →
 *   SemanticHasher
 *
 * Each stage can be replaced without touching the others. For example,
 * swapping the BrandNormalizer from dictionary-based to AI-based only
 * changes one class.
 */
import type {
  NormalizationStageResult,
  CanonicalAttribute,
  NormalizedImage,
  NormalizedPrice,
  CanonicalAttributeName,
  SemanticFingerprint,
  ImageFingerprint
} from "./types";
import type { NormalizedDiscoveredProduct } from "../../marketplace";

// ── Stage context ──────────────────────────────────────────

export interface StageContext {
  readonly providerCode: string;
  readonly region: string;
  readonly language: string;
}

// ── 1. TitleNormalizer ────────────────────────────────────

export interface TitleNormalizer {
  normalize(rawTitle: string, ctx: StageContext): Promise<NormalizationStageResult<string>>;
}

// ── 2. BrandNormalizer ────────────────────────────────────

export interface BrandNormalizer {
  normalize(
    rawBrand: string | undefined,
    ctx: StageContext
  ): Promise<NormalizationStageResult<string>>;
}

// ── 3. CategoryNormalizer ─────────────────────────────────

export interface CategoryNormalizer {
  normalize(
    rawCategory: string | undefined,
    ctx: StageContext
  ): Promise<NormalizationStageResult<string>>;
}

// ── 4. AttributeNormalizer ────────────────────────────────

export interface AttributeNormalizer {
  normalize(
    rawAttributes: Record<string, string>,
    ctx: StageContext
  ): Promise<NormalizationStageResult<ReadonlyArray<CanonicalAttribute>>>;
}

// ── 5. ImageNormalizer ────────────────────────────────────

export interface ImageNormalizer {
  normalize(
    imageUrls: ReadonlyArray<string>,
    ctx: StageContext
  ): Promise<NormalizationStageResult<ReadonlyArray<NormalizedImage>>>;
}

// ── 6. PriceNormalizer ────────────────────────────────────

export interface PriceNormalizer {
  normalize(
    amount: number,
    currency: string,
    ctx: StageContext
  ): Promise<NormalizationStageResult<NormalizedPrice>>;
}

// ── 7. SemanticHasher ─────────────────────────────────────

export interface SemanticHasher {
  compute(
    title: string,
    brand: string,
    category: string,
    attributes: ReadonlyArray<CanonicalAttribute>,
    priceBand: string
  ): Promise<NormalizationStageResult<SemanticFingerprint>>;
}

// ── Default implementations (stubs suitable for initial dev) ──

/**
 * Default title normalizer: trims, lowercases, collapses whitespace,
 * removes marketplace-specific noise (e.g. "[Free Shipping]" prefixes).
 */
export class DefaultTitleNormalizer implements TitleNormalizer {
  async normalize(rawTitle: string, _ctx: StageContext): Promise<NormalizationStageResult<string>> {
    const cleaned = rawTitle
      .trim()
      .replace(/\s+/g, " ")
      .replace(/^\[.*?\]\s*/g, "") // remove [Free Shipping] etc.
      .replace(/^\(.*?\)\s*/g, "");
    return {
      value: cleaned,
      warnings: cleaned !== rawTitle ? ["title had noise removed"] : [],
      confidence: 0.95
    };
  }
}

/**
 * Default brand normalizer: trims, title-cases, maps common aliases.
 */
export class DefaultBrandNormalizer implements BrandNormalizer {
  private readonly aliases: Readonly<Record<string, string>> = {
    nike: "Nike",
    adidas: "Adidas",
    samsung: "Samsung",
    apple: "Apple",
    sony: "Sony",
    lg: "LG",
    xiaomi: "Xiaomi",
    huawei: "Huawei"
  };

  async normalize(
    rawBrand: string | undefined,
    _ctx: StageContext
  ): Promise<NormalizationStageResult<string>> {
    if (!rawBrand || rawBrand.trim().length === 0) {
      return { value: "UNKNOWN", warnings: ["brand missing"], confidence: 0.1 };
    }
    const trimmed = rawBrand.trim();
    const lower = trimmed.toLowerCase();
    const mapped = this.aliases[lower] ?? trimmed;
    return {
      value: mapped,
      warnings: mapped === "UNKNOWN" ? ["unknown brand"] : [],
      confidence: 0.9
    };
  }
}

/**
 * Default category normalizer: trims, maps to canonical taxonomy.
 */
export class DefaultCategoryNormalizer implements CategoryNormalizer {
  async normalize(
    rawCategory: string | undefined,
    _ctx: StageContext
  ): Promise<NormalizationStageResult<string>> {
    if (!rawCategory || rawCategory.trim().length === 0) {
      return { value: "UNCATEGORIZED", warnings: ["category missing"], confidence: 0.1 };
    }
    const trimmed = rawCategory.trim();
    return {
      value: trimmed.toUpperCase().replace(/\s+/g, "_"),
      warnings: [],
      confidence: 0.85
    };
  }
}

/**
 * Default attribute normalizer: uses canonical-attributes dictionary.
 * R3: Produces CanonicalAttribute with normalizerVersion + source.
 */
export class DefaultAttributeNormalizer implements AttributeNormalizer {
  constructor(private readonly normalizerVersion: string = "1.0.0") {}

  async normalize(
    rawAttributes: Record<string, string>,
    _ctx: StageContext
  ): Promise<NormalizationStageResult<ReadonlyArray<CanonicalAttribute>>> {
    const { canonicalizeAttributesWithVersion } = await import("./canonical-attributes");
    const canonical = canonicalizeAttributesWithVersion(rawAttributes, this.normalizerVersion);
    const unmapped = Object.keys(rawAttributes).length - canonical.length;
    return {
      value: canonical,
      warnings: unmapped > 0 ? [`${unmapped} attributes could not be mapped`] : [],
      confidence: canonical.length > 0 ? 0.85 : 0.2
    };
  }
}

/**
 * Default image normalizer: computes fingerprint for each image URL.
 * R2: Produces ImageFingerprint (algorithm-versioned) instead of plain phash.
 */
export class DefaultImageNormalizer implements ImageNormalizer {
  async normalize(
    imageUrls: ReadonlyArray<string>,
    _ctx: StageContext
  ): Promise<NormalizationStageResult<ReadonlyArray<NormalizedImage>>> {
    const { getDefaultImageHasher } = await import("./image-hash");
    const hasher = getDefaultImageHasher();
    const images: NormalizedImage[] = [];
    for (const url of imageUrls) {
      const phashValue = await hasher.computePhash(url);
      const fingerprint: ImageFingerprint = {
        algorithm: hasher.algorithm,
        version: "v1",
        value: phashValue
      };
      images.push({ url, fingerprint });
    }
    return {
      value: images,
      warnings: images.length === 0 ? ["no images"] : [],
      confidence: images.length > 0 ? 0.9 : 0.3
    };
  }
}

/**
 * Default price normalizer: classifies into bands.
 */
export class DefaultPriceNormalizer implements PriceNormalizer {
  async normalize(
    amount: number,
    currency: string,
    _ctx: StageContext
  ): Promise<NormalizationStageResult<NormalizedPrice>> {
    const { normalizePrice } = await import("./price-bands");
    const normalized = normalizePrice(amount, currency);
    return {
      value: normalized,
      warnings: [],
      confidence: 1.0
    };
  }
}

/**
 * Default semantic hasher: FNV-1a over canonical fields.
 * R1: Produces SemanticFingerprint (algorithm-versioned) instead of plain string.
 */
export class DefaultSemanticHasher implements SemanticHasher {
  async compute(
    title: string,
    brand: string,
    category: string,
    attributes: ReadonlyArray<CanonicalAttribute>,
    priceBand: string
  ): Promise<NormalizationStageResult<SemanticFingerprint>> {
    const parts = [
      title.toLowerCase().trim(),
      brand.toLowerCase().trim(),
      category.toLowerCase().trim(),
      priceBand,
      ...attributes.map((a) => `${a.name}:${a.value}`.toLowerCase().trim()).sort()
    ];
    const input = parts.join("|");
    let h1 = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      h1 ^= input.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193) >>> 0;
    }
    let h2 = 0x84222325;
    for (let i = input.length - 1; i >= 0; i--) {
      h2 ^= input.charCodeAt(i);
      h2 = Math.imul(h2, 0x01000193) >>> 0;
    }
    h1 = Math.imul(h1 ^ h2, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ h1, 0x01000193) >>> 0;
    const value = `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
    const fingerprint: SemanticFingerprint = {
      algorithm: "fnv",
      version: "v1",
      value
    };
    return {
      value: fingerprint,
      warnings: [],
      confidence: 1.0
    };
  }
}
