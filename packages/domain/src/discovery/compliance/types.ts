/**
 * @workspace/domain/discovery/compliance/types
 *
 * Type contracts for Compliance PostCheck (A2.9).
 *
 * Design principle (per architectural review):
 *   Compliance PreCheck (A2.8) filters BEFORE inference — saves AI cost.
 *   Compliance PostCheck (A2.9) validates AFTER evaluation — checks score,
 *   documentation, certifications, regional restrictions, commercial policies.
 *
 * The two have different objectives:
 *   Pre: "should we even evaluate this product?" (blocked/eligible/manual_review)
 *   Post: "is the evaluated product approved for publication?" (publish/review/reject)
 */
import type { BrandedId } from "../../shared";
import type { CanonicalProductId, CanonicalProduct } from "../resolution/types";
import type { EvaluationResult, EvaluationId, ApprovalDecision } from "../evaluation/types";

// ── Branded IDs ────────────────────────────────────────────

export type ComplianceCheckId = BrandedId<"ComplianceCheckId">;
export type ComplianceBatchId = BrandedId<"ComplianceBatchId">;

// ── CompliancePostCheckResult ──────────────────────────────

export type CompliancePostStatus = "approved" | "rejected" | "requires_review";

export interface CompliancePostCheckResult {
  readonly id: ComplianceCheckId;
  readonly canonicalProductId: CanonicalProductId;
  readonly evaluationId: EvaluationId;
  readonly status: CompliancePostStatus;
  readonly rules: ReadonlyArray<ComplianceRuleResult>;
  readonly finalDecision: ApprovalDecision;
  readonly checkedAt: Date;
  readonly batchId: ComplianceBatchId;
  readonly schemaVersion: "1.0.0";
}

export interface ComplianceRuleResult {
  readonly ruleName: string;
  readonly category: ComplianceRuleCategory;
  readonly passed: boolean;
  readonly details: string;
  readonly severity: "error" | "warning";
}

export type ComplianceRuleCategory =
  | "score_minimum"
  | "documentation"
  | "certification"
  | "regional_restriction"
  | "commercial_policy"
  | "safety";

// ── Compliance Rules ───────────────────────────────────────

export interface ComplianceRule {
  readonly name: string;
  readonly category: ComplianceRuleCategory;
  readonly severity: "error" | "warning";
  evaluate(
    product: CanonicalProduct,
    evaluation: EvaluationResult
  ): { passed: boolean; details: string };
}

// ── Repository ─────────────────────────────────────────────

export interface ComplianceRepository {
  appendPostCheck(result: CompliancePostCheckResult): Promise<CompliancePostCheckResult>;
  findPostCheck(id: ComplianceCheckId): Promise<CompliancePostCheckResult | null>;
  findPostCheckByProduct(productId: CanonicalProductId): Promise<CompliancePostCheckResult | null>;
  findPostCheckByEvaluation(evaluationId: EvaluationId): Promise<CompliancePostCheckResult | null>;
  streamPostChecks(filter?: ComplianceStreamFilter): AsyncIterable<CompliancePostCheckResult>;
  readonly postCheckCount: number;
}

export interface ComplianceStreamFilter {
  readonly batchId?: ComplianceBatchId;
  readonly status?: CompliancePostStatus;
}

// ── Coordinator ────────────────────────────────────────────

export interface ComplianceCoordinatorInput {
  readonly batchId: string;
  readonly evaluations: ReadonlyArray<{
    product: CanonicalProduct;
    evaluation: EvaluationResult;
    aiDecision: ApprovalDecision;
  }>;
}

export interface ComplianceCoordinatorResult {
  readonly batchId: ComplianceBatchId;
  readonly results: ReadonlyArray<CompliancePostCheckResult>;
  readonly approved: ReadonlyArray<CompliancePostCheckResult>;
  readonly rejected: ReadonlyArray<CompliancePostCheckResult>;
  readonly requiresReview: ReadonlyArray<CompliancePostCheckResult>;
  readonly metrics: ComplianceMetrics;
  readonly durationMs: number;
}

export interface ComplianceMetrics {
  readonly productsChecked: number;
  readonly approved: number;
  readonly rejected: number;
  readonly requiresReview: number;
  readonly rulesEvaluated: number;
  readonly rulesFailed: number;
  readonly durationMs: number;
}

export type {
  CanonicalProductId,
  CanonicalProduct,
  EvaluationResult,
  EvaluationId,
  ApprovalDecision
};
