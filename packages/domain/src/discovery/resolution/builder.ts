/**
 * @workspace/domain/discovery/resolution/builder
 *
 * CanonicalBuilder — materializes a CanonicalProduct from a
 * CanonicalIdentity + the cluster's NormalizedProductRecords.
 *
 * The builder does NOT decide identity (that's Resolution's job).
 * It takes the resolved identity and constructs the catalog-facing
 * product by picking the best field from each member:
 *   - title: from primary
 *   - brand: from brandSource (highest confidence brand)
 *   - category: from categorySource
 *   - images: union of all members' images (deduplicated by fingerprint)
 *   - attributes: best confidence per attribute name
 *   - priceRange: min/max across all members
 */
import type {
  CanonicalBuilder as ICanonicalBuilder,
  CanonicalIdentity,
  CanonicalProduct,
  NormalizedProductRecord,
  NormalizedProductRecordId
} from "./types";
import type { Money } from "../../shared";

export class DefaultCanonicalBuilder implements ICanonicalBuilder {
  readonly name = "default-builder-v1";

  build(
    identity: CanonicalIdentity,
    products: ReadonlyMap<NormalizedProductRecordId, NormalizedProductRecord>
  ): CanonicalProduct {
    const members: NormalizedProductRecord[] = [];
    for (const pid of identity.normalizedProductIds) {
      const p = products.get(pid);
      if (p) members.push(p);
    }

    const primary = products.get(identity.primaryProductId) ?? members[0]!;

    // Title: from primary
    const title = primary.normalizedTitle;

    // Brand: from brandSource (evidence-based)
    const brandSource = products.get(identity.evidence.brandSource);
    const brand = brandSource?.normalizedBrand ?? primary.normalizedBrand;
    const canonicalBrandId = brandSource?.canonicalBrandId ?? primary.canonicalBrandId;

    // Category: from categorySource
    const categorySource = products.get(identity.evidence.categorySource);
    const category = categorySource?.normalizedCategory ?? primary.normalizedCategory;
    const canonicalCategoryId = categorySource?.canonicalCategoryId ?? primary.canonicalCategoryId;

    // Images: union of all members, deduplicated by fingerprint value
    const seenFingerprints = new Set<string>();
    const images: CanonicalProduct["images"][number][] = [];
    for (const p of members) {
      for (const img of p.normalizedImages) {
        const fpValue = img.fingerprint.value;
        if (!seenFingerprints.has(fpValue)) {
          seenFingerprints.add(fpValue);
          images.push({
            url: img.url,
            fingerprint: img.fingerprint,
            sourceProductId: p.id
          });
        }
      }
    }

    // Attributes: best confidence per attribute name
    const attrMap = new Map<
      string,
      { value: string; confidence: number; sourceProductId: NormalizedProductRecordId }
    >();
    for (const p of members) {
      for (const attr of p.normalizedAttributes) {
        const existing = attrMap.get(attr.name);
        if (!existing || attr.confidence > existing.confidence) {
          attrMap.set(attr.name, {
            value: attr.value,
            confidence: attr.confidence,
            sourceProductId: p.id
          });
        }
      }
    }
    const attributes = [...attrMap.entries()].map(([name, v]) => ({
      name,
      value: v.value,
      confidence: v.confidence,
      sourceProductId: v.sourceProductId
    }));

    // Price range: min/max across all members
    const prices = members.map((p) => p.normalizedPrice.originalAmount);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const currency = primary.normalizedPrice.currency;
    const priceRange = {
      min: { amount: minPrice, currency } as Money,
      max: { amount: maxPrice, currency } as Money,
      currency
    };

    // Supplier codes: unique list
    const supplierCodes = [...new Set(members.map((p) => p.providerCode))];

    return {
      id: identity.canonicalProductId,
      identityId: identity.id,
      clusterId: identity.clusterId,
      title,
      brand,
      canonicalBrandId,
      category,
      canonicalCategoryId,
      attributes,
      images,
      priceRange,
      offerCount: members.length,
      supplierCodes,
      primaryProductId: identity.primaryProductId,
      builtAt: new Date(),
      schemaVersion: "1.0.0"
    };
  }
}

export function createCanonicalBuilder(): ICanonicalBuilder {
  return new DefaultCanonicalBuilder();
}
