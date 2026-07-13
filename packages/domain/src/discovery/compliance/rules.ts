/**
 * @workspace/domain/discovery/compliance/rules
 *
 * Default compliance post-check rules.
 *
 * Categories:
 *   - score_minimum: overall score must meet threshold
 *   - documentation: required fields must be present
 *   - certification: certain categories require certifications
 *   - regional_restriction: some products blocked in certain regions
 *   - commercial_policy: margin/price checks
 *   - safety: safety-related attribute checks
 */
import type { ComplianceRule } from "./types";

/**
 * Default rules:
 *   1. overall_score_minimum (error): overall >= 60
 *   2. compliance_score_minimum (error): compliance >= 70
 *   3. title_present (error): title not empty
 *   4. brand_resolved (warning): brand is not UNKNOWN
 *   5. has_images (error): at least 1 image
 *   6. has_attributes (warning): at least 1 attribute
 *   7. price_positive (error): min price > 0
 *   8. margin_healthy (warning): margin score >= 50
 */
export const DEFAULT_COMPLIANCE_RULES: ReadonlyArray<ComplianceRule> = [
  {
    name: "overall_score_minimum",
    category: "score_minimum",
    severity: "error",
    evaluate: (_product, eval_) => ({
      passed: eval_.productScore.overall >= 60,
      details: `overall score ${eval_.productScore.overall.toFixed(2)} >= 60`
    })
  },
  {
    name: "compliance_score_minimum",
    category: "score_minimum",
    severity: "error",
    evaluate: (_product, eval_) => ({
      passed: eval_.productScore.compliance >= 70,
      details: `compliance score ${eval_.productScore.compliance} >= 70`
    })
  },
  {
    name: "title_present",
    category: "documentation",
    severity: "error",
    evaluate: (product, _eval) => ({
      passed: !!product.title && product.title.trim().length > 0,
      details: `title: "${product.title?.slice(0, 50) ?? ""}"`
    })
  },
  {
    name: "brand_resolved",
    category: "documentation",
    severity: "warning",
    evaluate: (product, _eval) => ({
      passed: !!product.brand && product.brand !== "UNKNOWN",
      details: `brand: ${product.brand}`
    })
  },
  {
    name: "has_images",
    category: "documentation",
    severity: "error",
    evaluate: (product, _eval) => ({
      passed: product.images.length > 0,
      details: `${product.images.length} images`
    })
  },
  {
    name: "has_attributes",
    category: "documentation",
    severity: "warning",
    evaluate: (product, _eval) => ({
      passed: product.attributes.length > 0,
      details: `${product.attributes.length} attributes`
    })
  },
  {
    name: "price_positive",
    category: "commercial_policy",
    severity: "error",
    evaluate: (product, _eval) => ({
      passed: product.priceRange.min.amount > 0,
      details: `min price: ${product.priceRange.min.amount} ${product.priceRange.currency}`
    })
  },
  {
    name: "margin_healthy",
    category: "commercial_policy",
    severity: "warning",
    evaluate: (_product, eval_) => ({
      passed: eval_.productScore.margin >= 50,
      details: `margin score: ${eval_.productScore.margin}`
    })
  }
];

export function createDefaultComplianceRules(): ReadonlyArray<ComplianceRule> {
  return DEFAULT_COMPLIANCE_RULES;
}
