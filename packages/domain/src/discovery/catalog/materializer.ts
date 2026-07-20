/**
 * @workspace/domain/discovery/catalog/materializer
 *
 * DefaultCatalogMaterializer — transforms a CanonicalProduct + EvaluationResult
 * + CompliancePostCheckResult into a publishable CatalogEntry.
 *
 * Generates:
 *   - SKU: deterministic from canonicalProductId
 *   - Slug: URL-safe from title
 *   - Variants: from attributes (e.g. COLOR × SIZE)
 *   - SEO: metaTitle, metaDescription, keywords, canonicalUrl
 *   - Pricing: min/max + label
 */
import type {
  CatalogMaterializer,
  CatalogEntry,
  CatalogEntryId,
  CatalogAttribute,
  CatalogVariant,
  CatalogImage,
  CatalogSEO,
  CatalogPricing,
  EvaluationSummary,
  CanonicalProduct,
  EvaluationResult,
  CompliancePostCheckResult
} from "./types";

export class DefaultCatalogMaterializer implements CatalogMaterializer {
  readonly name = "default-catalog-materializer";
  readonly version = "1.0.0";

  materialize(
    product: CanonicalProduct,
    evaluation: EvaluationResult,
    compliance: CompliancePostCheckResult
  ): CatalogEntry {
    const sku = this.generateSku(product.id);
    const slug = this.generateSlug(product.title);

    const attributes: CatalogAttribute[] = product.attributes.map((a) => ({
      name: a.name,
      value: a.value,
      sourceProductId: a.sourceProductId
    }));

    const variants = this.generateVariants(product, sku);
    const images = this.generateImages(product);
    const seo = this.generateSeo(product, slug);
    const pricing = this.generatePricing(product);
    const evaluationSummary = this.generateEvaluationSummary(evaluation, compliance);

    return {
      id: `cat_${product.id}` as unknown as CatalogEntryId,
      canonicalProductId: product.id,
      sku,
      slug,
      title: product.title,
      description: this.generateDescription(product),
      brand: product.brand,
      canonicalBrandId: product.canonicalBrandId,
      category: product.category,
      canonicalCategoryId: product.canonicalCategoryId,
      attributes,
      variants,
      images,
      seo,
      pricing,
      supplierCount: product.supplierCodes.length,
      offerCount: product.offerCount,
      evaluationSummary,
      materializedAt: new Date(),
      materializerVersion: this.version,
      schemaVersion: "1.0.0"
    };
  }

  private generateSku(canonicalProductId: string): string {
    // Deterministic SKU from canonical product ID
    const hash = canonicalProductId
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-8)
      .toUpperCase();
    return `SKU-${hash}`;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  private generateDescription(product: CanonicalProduct): string {
    const parts: string[] = [];
    parts.push(product.title);
    if (product.brand && product.brand !== "UNKNOWN") {
      parts.push(`by ${product.brand}`);
    }
    if (product.attributes.length > 0) {
      const attrList = product.attributes
        .slice(0, 5)
        .map((a) => `${a.name}: ${a.value}`)
        .join(", ");
      parts.push(`Features: ${attrList}`);
    }
    parts.push(`Available from ${product.supplierCodes.length} suppliers`);
    return parts.join(". ") + ".";
  }

  private generateVariants(product: CanonicalProduct, baseSku: string): CatalogVariant[] {
    // Generate variants from COLOR and SIZE attributes if present
    const colors = product.attributes.filter((a) => a.name === "COLOR");
    const sizes = product.attributes.filter((a) => a.name === "SIZE");

    const variants: CatalogVariant[] = [];

    if (colors.length === 0 && sizes.length === 0) {
      // Single variant — the product itself
      variants.push({
        sku: `${baseSku}-001`,
        name: "Default",
        attributes: [],
        price: product.priceRange.min,
        inventory: 100
      });
      return variants;
    }

    const colorValues = colors.length > 0 ? colors.map((c) => c.value) : [""];
    const sizeValues = sizes.length > 0 ? sizes.map((s) => s.value) : [""];

    let idx = 1;
    for (const color of colorValues) {
      for (const size of sizeValues) {
        const attrs: Array<{ name: string; value: string }> = [];
        if (color) attrs.push({ name: "COLOR", value: color });
        if (size) attrs.push({ name: "SIZE", value: size });
        variants.push({
          sku: `${baseSku}-${idx.toString().padStart(3, "0")}`,
          name: [color, size].filter(Boolean).join(" / ") || "Default",
          attributes: attrs,
          price: product.priceRange.min,
          inventory: 50
        });
        idx++;
      }
    }

    return variants;
  }

  private generateImages(product: CanonicalProduct): CatalogImage[] {
    return product.images.map((img, i) => ({
      url: img.url,
      alt: `${product.title} - Image ${i + 1}`,
      fingerprint: img.fingerprint,
      isPrimary: i === 0
    }));
  }

  private generateSeo(product: CanonicalProduct, slug: string): CatalogSEO {
    const metaTitle = product.title.slice(0, 60);
    const metaDescription = this.generateDescription(product).slice(0, 160);
    const keywords = [
      product.title.toLowerCase().split(" ").slice(0, 5).join(", "),
      product.brand !== "UNKNOWN" ? product.brand.toLowerCase() : "",
      product.category.toLowerCase()
    ].filter(Boolean);

    return {
      metaTitle,
      metaDescription,
      keywords,
      canonicalUrl: `/products/${slug}`
    };
  }

  private generatePricing(product: CanonicalProduct): CatalogPricing {
    const min = product.priceRange.min;
    const max = product.priceRange.max;
    const label =
      min.amount === max.amount
        ? `${(min.amount / 100).toFixed(2)} ${min.currency}`
        : `${(min.amount / 100).toFixed(2)} - ${(max.amount / 100).toFixed(2)} ${min.currency}`;

    return {
      minPrice: min,
      maxPrice: max,
      currency: product.priceRange.currency,
      priceRangeLabel: label
    };
  }

  private generateEvaluationSummary(
    evaluation: EvaluationResult,
    compliance: CompliancePostCheckResult
  ): EvaluationSummary {
    return {
      overallScore: evaluation.productScore.overall,
      recommendation: evaluation.recommendation,
      confidence: evaluation.confidence,
      complianceStatus: compliance.status
    };
  }
}

export function createCatalogMaterializer(): CatalogMaterializer {
  return new DefaultCatalogMaterializer();
}
