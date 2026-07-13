/**
 * @workspace/domain/discovery/evaluation/types
 *
 * Type contracts for AI Evaluation (A2.8).
 *
 * Design principle (per architectural review):
 *   Separate Inference from Evaluation. The InferenceProvider knows the
 *   model (OpenAI, Ollama, Gemini, vLLM). The DecisionProvider transforms
 *   the model output into a deterministic domain contract. The PolicyEngine
 *   decides final approval.
 *
 * Flow:
 *   CanonicalProduct → Compliance PreCheck → (blocked | eligible)
 *   eligible → cache check → (cached | inference) → DecisionProvider
 *   → EvaluationResult → PolicyEngine → ApprovalDecision
 *
 * 4 artifacts:
 *   1. InferenceArtifact  — raw AI output (model metadata + cost + raw response)
 *   2. EvaluationResult   — clean domain contract (score + factors + recommendation)
 *   3. DecisionTrace      — audit trail (policy rules + final decision)
 *   4. ApprovalDecision   — publish | review | reject
 */
import type { BrandedId } from "../../shared";
import type { Money } from "../../shared";
import type { CanonicalProductId, CanonicalProduct } from "../resolution/types";

// ── Branded IDs ────────────────────────────────────────────

export type InferenceId = BrandedId<"InferenceId">;
export type EvaluationId = BrandedId<"EvaluationId">;
export type EvaluationBatchId = BrandedId<"EvaluationBatchId">;

// ── ProductScore (9 independent components, overall derived) ──

export interface ProductScore {
  readonly commercial: number; // 0-100
  readonly quality: number; // 0-100
  readonly confidence: number; // 0-100
  readonly risk: number; // 0-100 (higher = more risky)
  readonly trend: number; // 0-100
  readonly competition: number; // 0-100
  readonly supplier: number; // 0-100
  readonly margin: number; // 0-100
  readonly compliance: number; // 0-100
  /** Derived — never persisted as the single truth. Recomputed from components. */
  readonly overall: number; // 0-100
}

export interface AIScoreFactor {
  readonly name: string;
  readonly value: number; // 0-100
  readonly weight: number; // 0-1
  readonly explanation: string;
}

// ── 1. InferenceArtifact (raw AI output) ───────────────────

export interface InferenceArtifact {
  readonly id: InferenceId;
  readonly canonicalProductId: CanonicalProductId;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  readonly startedAt: Date;
  readonly completedAt: Date;
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly estimatedCost: Money;
  /** Raw model response — never consumed directly by the domain. */
  readonly rawResponse: unknown;
}

// ── 2. EvaluationResult (clean domain contract) ────────────

export interface EvaluationResult {
  readonly id: EvaluationId;
  readonly canonicalProductId: CanonicalProductId;
  readonly inferenceId: InferenceId;
  readonly productScore: ProductScore;
  readonly aiScoreFactors: ReadonlyArray<AIScoreFactor>;
  readonly recommendation: "publish" | "review" | "reject";
  readonly confidence: number; // 0-1
  readonly explanation: ReadonlyArray<string>;
  readonly evaluatedAt: Date;
  readonly schemaVersion: "1.0.0";
}

// ── 3. DecisionTrace (audit trail) ─────────────────────────

export interface DecisionTrace {
  readonly inferenceId: InferenceId;
  readonly evaluationId: EvaluationId;
  readonly policyVersion: string;
  readonly ruleResults: ReadonlyArray<RuleResult>;
  readonly finalDecision: ApprovalDecision;
  readonly decidedAt: Date;
}

export interface RuleResult {
  readonly ruleName: string;
  readonly passed: boolean;
  readonly details: string;
}

// ── 4. ApprovalDecision ────────────────────────────────────

export interface ApprovalDecision {
  readonly action: "publish" | "review" | "reject";
  readonly reason: string;
  readonly conditions: ReadonlyArray<string>;
  readonly decidedBy: "policy-engine" | "manual";
  readonly decidedAt: Date;
}

// ── Compliance PreCheck ────────────────────────────────────

export type ComplianceStatus = "eligible" | "blocked" | "requires_review";

export interface CompliancePreCheckResult {
  readonly status: ComplianceStatus;
  readonly reason: string;
  readonly violations: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
}

// ── Cache ──────────────────────────────────────────────────

export interface InferenceCacheKey {
  readonly canonicalProductVersion: string;
  readonly modelVersion: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
}

export interface InferenceCacheEntry {
  readonly key: InferenceCacheKey;
  readonly inferenceId: InferenceId;
  readonly evaluationId: EvaluationId;
  readonly cachedAt: Date;
}

// ── Provider interfaces ────────────────────────────────────

export interface InferenceProvider {
  readonly modelId: string;
  readonly modelVersion: string;
  readonly promptVersion: string;
  infer(product: CanonicalProduct): Promise<InferenceArtifact>;
}

export interface DecisionProvider {
  readonly name: string;
  readonly version: string;
  decide(artifact: InferenceArtifact, product: CanonicalProduct): EvaluationResult;
}

export interface PolicyEngine {
  readonly version: string;
  evaluate(result: EvaluationResult): { decision: ApprovalDecision; trace: DecisionTrace };
}

// ── Repository ─────────────────────────────────────────────

export interface EvaluationRepository {
  appendInference(artifact: InferenceArtifact): Promise<InferenceArtifact>;
  appendEvaluation(result: EvaluationResult): Promise<EvaluationResult>;
  appendDecisionTrace(trace: DecisionTrace): Promise<DecisionTrace>;
  findInference(id: InferenceId): Promise<InferenceArtifact | null>;
  findEvaluation(id: EvaluationId): Promise<EvaluationResult | null>;
  findEvaluationByProduct(productId: CanonicalProductId): Promise<EvaluationResult | null>;
  findTraceByEvaluation(evaluationId: EvaluationId): Promise<DecisionTrace | null>;
  readonly inferenceCount: number;
  readonly evaluationCount: number;
  readonly traceCount: number;
}

// ── Coordinator ────────────────────────────────────────────

export interface EvaluationCoordinatorInput {
  readonly batchId: string;
  readonly products: ReadonlyArray<CanonicalProduct>;
}

export interface EvaluationCoordinatorResult {
  readonly batchId: EvaluationBatchId;
  readonly evaluations: ReadonlyArray<EvaluationResult>;
  readonly decisions: ReadonlyArray<{
    result: EvaluationResult;
    decision: ApprovalDecision;
    trace: DecisionTrace;
  }>;
  readonly blocked: ReadonlyArray<{ product: CanonicalProduct; reason: string }>;
  readonly cached: ReadonlyArray<{ product: CanonicalProduct; evaluationId: EvaluationId }>;
  readonly metrics: EvaluationMetrics;
  readonly durationMs: number;
}

export interface EvaluationMetrics {
  readonly productsProcessed: number;
  readonly inferencesRun: number;
  readonly inferencesCached: number;
  readonly productsBlocked: number;
  readonly evaluationsCompleted: number;
  readonly publishDecisions: number;
  readonly reviewDecisions: number;
  readonly rejectDecisions: number;
  readonly totalInferenceCost: Money;
  readonly averageConfidence: number;
  readonly durationMs: number;
}

export type { CanonicalProductId, CanonicalProduct, Money };
