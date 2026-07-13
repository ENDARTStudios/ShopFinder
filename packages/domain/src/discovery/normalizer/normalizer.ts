/**
 * @workspace/domain/discovery/normalizer/normalizer
 *
 * DefaultProductNormalizer — orchestrates the 7 normalization stages.
 *
 * Flow:
 *   RawProductRecord + NormalizedDiscoveredProduct
 *     ↓
 *   1. TitleNormalizer    → normalizedTitle
 *   2. BrandNormalizer    → normalizedBrand
 *   3. CategoryNormalizer → normalizedCategory
 *   4. AttributeNormalizer → normalizedAttributes (canonical, marketplace-agnostic)
 *   5. ImageNormalizer    → normalizedImages (with phash)
 *   6. PriceNormalizer    → normalizedPrice (band, not absolute)
 *   7. SemanticHasher     → semanticHash (FNV-1a over canonical fields)
 *     ↓
 *   NormalizedProductRecord (new artifact, RawProductRecord untouched)
 *
 * R10: normalize(record: RawProductRecord, product: NormalizedDiscoveredProduct)
 * accepts the FULL record — the normalizer can use provider, execution,
 * versions, country, language, snapshot for context-aware normalization.
 */
import type {
  ProductNormalizer,
  NormalizerVersions,
  NormalizedProductRecord,
  NormalizedProductRecordId,
  RawProductRecord,
  NormalizationStageResult
} from "./types";
import { NORMALIZER_SCHEMA_VERSION } from "./types";
import type { NormalizedDiscoveredProduct } from "../../marketplace";
import type {
  TitleNormalizer,
  BrandNormalizer,
  CategoryNormalizer,
  AttributeNormalizer,
  ImageNormalizer,
  PriceNormalizer,
  SemanticHasher,
  StageContext
} from "./stages";
import {
  DefaultTitleNormalizer,
  DefaultBrandNormalizer,
  DefaultCategoryNormalizer,
  DefaultAttributeNormalizer,
  DefaultImageNormalizer,
  DefaultPriceNormalizer,
  DefaultSemanticHasher
} from "./stages";
import { createNormalizationMetricsCollector } from "./metrics";

export interface NormalizerDeps {
  readonly titleNormalizer?: TitleNormalizer;
  readonly brandNormalizer?: BrandNormalizer;
  readonly categoryNormalizer?: CategoryNormalizer;
  readonly attributeNormalizer?: AttributeNormalizer;
  readonly imageNormalizer?: ImageNormalizer;
  readonly priceNormalizer?: PriceNormalizer;
  readonly semanticHasher?: SemanticHasher;
}

export class DefaultProductNormalizer implements ProductNormalizer {
  readonly versions: NormalizerVersions;
  private readonly titleNormalizer: TitleNormalizer;
  private readonly brandNormalizer: BrandNormalizer;
  private readonly categoryNormalizer: CategoryNormalizer;
  private readonly attributeNormalizer: AttributeNormalizer;
  private readonly imageNormalizer: ImageNormalizer;
  private readonly priceNormalizer: PriceNormalizer;
  private readonly semanticHasher: SemanticHasher;

  constructor(versions: NormalizerVersions, deps: NormalizerDeps = {}) {
    this.versions = versions;
    this.titleNormalizer = deps.titleNormalizer ?? new DefaultTitleNormalizer();
    this.brandNormalizer = deps.brandNormalizer ?? new DefaultBrandNormalizer();
    this.categoryNormalizer = deps.categoryNormalizer ?? new DefaultCategoryNormalizer();
    this.attributeNormalizer = deps.attributeNormalizer ?? new DefaultAttributeNormalizer();
    this.imageNormalizer = deps.imageNormalizer ?? new DefaultImageNormalizer();
    this.priceNormalizer = deps.priceNormalizer ?? new DefaultPriceNormalizer();
    this.semanticHasher = deps.semanticHasher ?? new DefaultSemanticHasher();
  }

  async normalize(
    record: RawProductRecord,
    product: NormalizedDiscoveredProduct
  ): Promise<NormalizedProductRecord> {
    const ctx: StageContext = {
      providerCode: record.providerCode,
      region: record.partitionKey.split("|")[1] ?? "US",
      language: "en"
    };

    const warnings: string[] = [];
    let confidenceSum = 0;
    let stageCount = 0;

    // 1. Title
    const titleResult = await this.titleNormalizer.normalize(product.title, ctx);
    warnings.push(...titleResult.warnings);
    confidenceSum += titleResult.confidence;
    stageCount++;

    // 2. Brand
    const brandResult = await this.brandNormalizer.normalize(product.brand, ctx);
    warnings.push(...brandResult.warnings);
    confidenceSum += brandResult.confidence;
    stageCount++;

    // 3. Category
    const categoryResult = await this.categoryNormalizer.normalize(product.category, ctx);
    warnings.push(...categoryResult.warnings);
    confidenceSum += categoryResult.confidence;
    stageCount++;

    // 4. Attributes
    const attributeResult = await this.attributeNormalizer.normalize(product.attributes, ctx);
    warnings.push(...attributeResult.warnings);
    confidenceSum += attributeResult.confidence;
    stageCount++;

    // 5. Images
    const imageResult = await this.imageNormalizer.normalize(product.images, ctx);
    warnings.push(...imageResult.warnings);
    confidenceSum += imageResult.confidence;
    stageCount++;

    // 6. Price
    const priceResult = await this.priceNormalizer.normalize(
      product.price.amount,
      product.price.currency,
      ctx
    );
    warnings.push(...priceResult.warnings);
    confidenceSum += priceResult.confidence;
    stageCount++;

    // 7. Semantic hash
    const semanticResult = await this.semanticHasher.compute(
      titleResult.value,
      brandResult.value,
      categoryResult.value,
      attributeResult.value,
      priceResult.value.band
    );
    warnings.push(...semanticResult.warnings);
    confidenceSum += semanticResult.confidence;
    stageCount++;

    const id = this.makeId(record, semanticResult.value) as unknown as NormalizedProductRecordId;

    return {
      id,
      rawProductId: record.id,
      executionId: record.executionId,
      payloadHash: record.payloadHash,
      semanticHash: semanticResult.value,
      normalizedTitle: titleResult.value,
      normalizedBrand: brandResult.value,
      normalizedCategory: categoryResult.value,
      normalizedAttributes: attributeResult.value,
      normalizedImages: imageResult.value,
      normalizedPrice: priceResult.value,
      providerCode: record.providerCode,
      externalId: record.externalId,
      region: ctx.region,
      language: ctx.language,
      discoveredAt: record.discoveredAt,
      normalizedAt: new Date(),
      partitionKey: record.partitionKey,
      normalizerVersions: this.versions,
      rawVersions: record.versions,
      schemaVersion: NORMALIZER_SCHEMA_VERSION,
      confidenceScore: confidenceSum / stageCount,
      warnings
    };
  }

  /**
   * Deterministic ID: same (rawProductId, normalizerVersion, semanticHash) → same ID.
   * Enables idempotent re-normalization: running the same normalizer version
   * on the same raw record produces the same NormalizedProductRecord.
   */
  private makeId(record: RawProductRecord, semanticHash: string): string {
    return `norm_${record.id}_${this.versions.normalizerVersion}_${semanticHash}`;
  }
}

export function createProductNormalizer(
  versions: NormalizerVersions,
  deps?: NormalizerDeps
): ProductNormalizer {
  return new DefaultProductNormalizer(versions, deps);
}
