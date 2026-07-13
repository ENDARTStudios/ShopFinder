/**
 * @workspace/domain/discovery/evaluation/compliance-check
 *
 * CompliancePreCheck — runs BEFORE inference to avoid wasting model calls
 * on products that would be blocked anyway.
 *
 * Flow:
 *   CanonicalProduct → CompliancePreCheck → (eligible | blocked | requires_review)
 *   eligible → proceed to inference
 *   blocked → skip inference, emit EvaluationRejected
 *   requires_review → skip inference, mark for manual review
 */
import type { CanonicalProduct } from "../resolution/types";
import type { CompliancePreCheckResult, ComplianceStatus } from "./types";

export interface ComplianceRule {
  readonly name: string;
  readonly check: (product: CanonicalProduct) => {
    passed: boolean;
    violation?: string;
    warning?: string;
  };
}

/**
 * Default compliance rules:
 *   - title not empty
 *   - brand not UNKNOWN
 *   - price > 0
 *   - at least 1 image
 *   - no prohibited keywords in title
 */
export class DefaultCompliancePreCheck {
  private readonly prohibitedKeywords = ["counterfeit", "fake", "replica", "forbidden", "banned"];

  check(product: CanonicalProduct): CompliancePreCheckResult {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Title check
    if (!product.title || product.title.trim().length === 0) {
      violations.push("title is empty");
    }

    // Brand check
    if (!product.brand || product.brand === "UNKNOWN") {
      warnings.push("brand is UNKNOWN — requires manual verification");
    }

    // Price check
    if (product.priceRange.min.amount <= 0) {
      violations.push("price must be greater than 0");
    }

    // Image check
    if (!product.images || product.images.length === 0) {
      violations.push("product must have at least 1 image");
    }

    // Prohibited keywords
    const titleLower = product.title?.toLowerCase() ?? "";
    for (const kw of this.prohibitedKeywords) {
      if (titleLower.includes(kw)) {
        violations.push(`prohibited keyword in title: ${kw}`);
      }
    }

    let status: ComplianceStatus;
    let reason: string;

    if (violations.length > 0) {
      status = "blocked";
      reason = `Blocked: ${violations.join("; ")}`;
    } else if (warnings.length > 0) {
      status = "requires_review";
      reason = `Requires review: ${warnings.join("; ")}`;
    } else {
      status = "eligible";
      reason = "All compliance checks passed";
    }

    return { status, reason, violations, warnings };
  }
}

export function createCompliancePreCheck(): DefaultCompliancePreCheck {
  return new DefaultCompliancePreCheck();
}
