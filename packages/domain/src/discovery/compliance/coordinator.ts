/**
 * @workspace/domain/discovery/compliance/coordinator
 *
 * ComplianceCoordinator — runs PostCheck rules on evaluation results.
 *
 * Flow per (product, evaluation, aiDecision):
 *   1. Run all compliance rules
 *   2. Categorize: error fail → rejected, warning fail → requires_review, all pass → approved
 *   3. Build CompliancePostCheckResult
 *   4. Emit appropriate event (Approved/Rejected/RequiresReview)
 */
import type {
  ComplianceCoordinatorInput,
  ComplianceCoordinatorResult,
  ComplianceBatchId,
  CompliancePostCheckResult,
  ComplianceCheckId,
  ComplianceRuleResult,
  ComplianceMetrics,
  ComplianceRule,
  ComplianceRepository,
  CompliancePostStatus
} from "./types";
import type { ApprovalDecision } from "../evaluation/types";
import { DEFAULT_COMPLIANCE_RULES } from "./rules";
import {
  makeCompliancePostCheckCompletedEvent,
  makeComplianceApprovedEvent,
  makeComplianceRejectedEvent,
  makeComplianceRequiresReviewEvent,
  type ComplianceEvent
} from "./events";

export interface ComplianceEventPublisher {
  publish(events: ReadonlyArray<ComplianceEvent>): Promise<void>;
}

export interface ComplianceCoordinatorDeps {
  readonly repository: ComplianceRepository;
  readonly rules?: ReadonlyArray<ComplianceRule>;
  readonly events?: ComplianceEventPublisher;
}

export class ComplianceCoordinator {
  private readonly rules: ReadonlyArray<ComplianceRule>;
  private readonly rulesVersion = "1.0.0";

  constructor(private readonly deps: ComplianceCoordinatorDeps) {
    this.rules = deps.rules ?? DEFAULT_COMPLIANCE_RULES;
  }

  async check(input: ComplianceCoordinatorInput): Promise<ComplianceCoordinatorResult> {
    const start = Date.now();
    const batchId = input.batchId as unknown as ComplianceBatchId;
    const versions = { rulesVersion: this.rulesVersion };

    const results: CompliancePostCheckResult[] = [];
    const approved: CompliancePostCheckResult[] = [];
    const rejected: CompliancePostCheckResult[] = [];
    const requiresReview: CompliancePostCheckResult[] = [];
    let rulesEvaluated = 0;
    let rulesFailed = 0;

    for (const { product, evaluation, aiDecision } of input.evaluations) {
      // Run all rules
      const ruleResults: ComplianceRuleResult[] = this.rules.map((rule) => {
        const evalResult = rule.evaluate(product, evaluation);
        rulesEvaluated++;
        if (!evalResult.passed) rulesFailed++;
        return {
          ruleName: rule.name,
          category: rule.category,
          passed: evalResult.passed,
          details: evalResult.details,
          severity: rule.severity
        };
      });

      // Determine status
      const errorFails = ruleResults.filter((r) => !r.passed && r.severity === "error");
      const warningFails = ruleResults.filter((r) => !r.passed && r.severity === "warning");

      let status: CompliancePostStatus;
      let finalDecision: ApprovalDecision;

      if (errorFails.length > 0) {
        status = "rejected";
        finalDecision = {
          action: "reject",
          reason: `Compliance errors: ${errorFails.map((r) => r.ruleName).join(", ")}`,
          conditions: [],
          decidedBy: "policy-engine",
          decidedAt: new Date()
        };
      } else if (warningFails.length > 0) {
        status = "requires_review";
        finalDecision = {
          action: "review",
          reason: `Compliance warnings: ${warningFails.map((r) => r.ruleName).join(", ")}`,
          conditions: ["manual review required"],
          decidedBy: "policy-engine",
          decidedAt: new Date()
        };
      } else {
        status = "approved";
        finalDecision = {
          action: "publish",
          reason: "All compliance rules passed",
          conditions: [],
          decidedBy: "policy-engine",
          decidedAt: new Date()
        };
      }

      const result: CompliancePostCheckResult = {
        id: `comp_${evaluation.id}` as unknown as ComplianceCheckId,
        canonicalProductId: product.id,
        evaluationId: evaluation.id,
        status,
        rules: ruleResults,
        finalDecision,
        checkedAt: new Date(),
        batchId,
        schemaVersion: "1.0.0"
      };

      await this.deps.repository.appendPostCheck(result);
      results.push(result);

      if (status === "approved") approved.push(result);
      else if (status === "rejected") rejected.push(result);
      else requiresReview.push(result);

      // Emit events
      if (this.deps.events) {
        const events: ComplianceEvent[] = [
          makeCompliancePostCheckCompletedEvent(versions, {
            checkId: result.id,
            canonicalProductId: product.id,
            evaluationId: evaluation.id,
            status,
            rulesPassed: ruleResults.filter((r) => r.passed).length,
            rulesFailed: ruleResults.filter((r) => !r.passed).length
          })
        ];

        if (status === "approved") {
          events.push(
            makeComplianceApprovedEvent(versions, {
              checkId: result.id,
              canonicalProductId: product.id,
              evaluationId: evaluation.id,
              decision: finalDecision.action
            })
          );
        } else if (status === "rejected") {
          events.push(
            makeComplianceRejectedEvent(versions, {
              checkId: result.id,
              canonicalProductId: product.id,
              reason: finalDecision.reason,
              failedRules: errorFails.map((r) => r.ruleName)
            })
          );
        } else {
          events.push(
            makeComplianceRequiresReviewEvent(versions, {
              checkId: result.id,
              canonicalProductId: product.id,
              warnings: warningFails.map((r) => r.ruleName)
            })
          );
        }

        await this.deps.events.publish(events);
      }
    }

    const metrics: ComplianceMetrics = {
      productsChecked: input.evaluations.length,
      approved: approved.length,
      rejected: rejected.length,
      requiresReview: requiresReview.length,
      rulesEvaluated,
      rulesFailed,
      durationMs: Date.now() - start
    };

    return {
      batchId,
      results,
      approved,
      rejected,
      requiresReview,
      metrics,
      durationMs: Date.now() - start
    };
  }
}

export function createComplianceCoordinator(
  deps: ComplianceCoordinatorDeps
): ComplianceCoordinator {
  return new ComplianceCoordinator(deps);
}
