/**
 * @workspace/domain/discovery/evaluation/policy
 *
 * PolicyEngine — the ONLY component that decides final approval.
 *
 * The DecisionProvider produces an EvaluationResult with a recommendation,
 * but the PolicyEngine makes the final call based on configurable rules.
 * This separation ensures business logic is centralized and testable.
 */
import type {
  PolicyEngine,
  EvaluationResult,
  ApprovalDecision,
  DecisionTrace,
  RuleResult
} from "./types";

export interface PolicyRule {
  readonly name: string;
  readonly evaluate: (result: EvaluationResult) => { passed: boolean; details: string };
}

/**
 * Default policy rules:
 *   - compliance >= 70 (required)
 *   - confidence >= 60 (required)
 *   - risk <= 50 (preferred)
 *   - overall >= 65 (for publish)
 */
export class DefaultPolicyEngine implements PolicyEngine {
  readonly version = "1.0.0";

  private readonly rules: ReadonlyArray<PolicyRule> = [
    {
      name: "compliance_minimum",
      evaluate: (r) => ({
        passed: r.productScore.compliance >= 70,
        details: `compliance ${r.productScore.compliance} >= 70`
      })
    },
    {
      name: "confidence_minimum",
      evaluate: (r) => ({
        passed: r.confidence >= 0.6,
        details: `confidence ${r.confidence.toFixed(2)} >= 0.60`
      })
    },
    {
      name: "risk_threshold",
      evaluate: (r) => ({
        passed: r.productScore.risk <= 50,
        details: `risk ${r.productScore.risk} <= 50`
      })
    },
    {
      name: "overall_publish_threshold",
      evaluate: (r) => ({
        passed: r.productScore.overall >= 65,
        details: `overall ${r.productScore.overall.toFixed(2)} >= 65`
      })
    }
  ];

  evaluate(result: EvaluationResult): { decision: ApprovalDecision; trace: DecisionTrace } {
    const ruleResults: RuleResult[] = this.rules.map((rule) => {
      const evalResult = rule.evaluate(result);
      return {
        ruleName: rule.name,
        passed: evalResult.passed,
        details: evalResult.details
      };
    });

    const allPassed = ruleResults.every((r) => r.passed);
    const criticalPassed = ruleResults
      .filter((r) => r.ruleName === "compliance_minimum" || r.ruleName === "confidence_minimum")
      .every((r) => r.passed);

    let decision: ApprovalDecision;
    if (!criticalPassed) {
      decision = {
        action: "reject",
        reason: `Critical rules failed: ${ruleResults
          .filter((r) => !r.passed)
          .map((r) => r.ruleName)
          .join(", ")}`,
        conditions: [],
        decidedBy: "policy-engine",
        decidedAt: new Date()
      };
    } else if (allPassed) {
      decision = {
        action: "publish",
        reason: `All ${ruleResults.length} rules passed (overall=${result.productScore.overall.toFixed(2)})`,
        conditions: [],
        decidedBy: "policy-engine",
        decidedAt: new Date()
      };
    } else {
      decision = {
        action: "review",
        reason: `Non-critical rules failed: ${ruleResults
          .filter((r) => !r.passed)
          .map((r) => r.ruleName)
          .join(", ")}`,
        conditions: ["manual review required"],
        decidedBy: "policy-engine",
        decidedAt: new Date()
      };
    }

    const trace: DecisionTrace = {
      inferenceId: result.inferenceId,
      evaluationId: result.id,
      policyVersion: this.version,
      ruleResults,
      finalDecision: decision,
      decidedAt: new Date()
    };

    return { decision, trace };
  }
}

export function createDefaultPolicyEngine(): PolicyEngine {
  return new DefaultPolicyEngine();
}
