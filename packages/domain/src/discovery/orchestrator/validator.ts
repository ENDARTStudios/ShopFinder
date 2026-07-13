/**
 * @workspace/domain/discovery/orchestrator/validator
 *
 * PlanValidator implementation. Pure function — no DB, no providers.
 * Validates:
 *   - plan status is "draft" (must not be re-scheduled)
 *   - plan is not expired (TTL check)
 *   - plan has at least one source
 *   - plan has at least one region
 *   - plan has at least one language
 *   - plan budget.totalApiCalls > 0
 *   - plan is not empty (sources + categories OR niches)
 */
import type { PlanValidator } from "./interfaces";
import type { ExecutionContext, ValidationResult, ValidationCode } from "./types";
import type { ImmutableDiscoveryPlan } from "../planner";

const DEFAULT_PLAN_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export class DefaultPlanValidator implements PlanValidator {
  validate(plan: ImmutableDiscoveryPlan, ctx: ExecutionContext): ValidationResult {
    const now = (ctx.now ?? (() => new Date()))();

    // 1. Status check — only draft plans can be scheduled
    if (plan.status !== "draft") {
      return fail("PLAN_STATUS_INVALID", `Plan status is '${plan.status}', expected 'draft'`);
    }

    // 2. TTL check — plan must not be too old
    const ttl = ctx.planTtlMs ?? DEFAULT_PLAN_TTL_MS;
    const age = now.getTime() - plan.createdAt.getTime();
    if (age > ttl) {
      return fail("PLAN_TTL_EXCEEDED", `Plan age ${age}ms exceeds TTL ${ttl}ms`);
    }

    // 3. Expiry check — if plan has explicit expiresAt (rare; usually signals)
    //    We treat plan.signals[].expiresAt as a soft hint: if ALL signals
    //    have expired, the plan is considered expired.
    const allSignalsExpired = plan.signals.every(
      (s) => s.expiresAt && s.expiresAt.getTime() < now.getTime()
    );
    if (plan.signals.length > 0 && allSignalsExpired) {
      return fail("PLAN_EXPIRED", "All signals in the plan have expired");
    }

    // 4. Structural checks
    if (!plan.sources || plan.sources.length === 0) {
      return fail("PLAN_NO_SOURCES", "Plan has no discovery sources");
    }
    if (!plan.regions || plan.regions.length === 0) {
      return fail("PLAN_NO_REGIONS", "Plan has no regions");
    }
    if (!plan.languages || plan.languages.length === 0) {
      return fail("PLAN_NO_LANGUAGES", "Plan has no languages");
    }

    // 5. Budget checks
    if (plan.budget.totalApiCalls <= 0) {
      return fail("PLAN_BUDGET_ZERO", "Plan budget.totalApiCalls is zero or negative");
    }
    if (plan.budget.totalApiCalls < 0) {
      return fail("PLAN_BUDGET_NEGATIVE", "Plan budget.totalApiCalls is negative");
    }

    // 6. Empty plan check — needs at least categories OR niches to scan
    //    (a plan with sources + regions + languages but no categories/niches
    //     would generate jobs that have nothing to query)
    const hasCategories = plan.categories.length > 0;
    const hasNiches = plan.niches.length > 0;
    const hasKeywords = plan.signals.some((s) => s.scope.niche);
    if (!hasCategories && !hasNiches && !hasKeywords) {
      return fail(
        "PLAN_EMPTY",
        "Plan has no categories, niches, or keyword-bearing signals — nothing to discover"
      );
    }

    return { ok: true, code: "OK" };
  }
}

function fail(code: ValidationCode, message: string): ValidationResult {
  return { ok: false, code, message };
}

export function createPlanValidator(): PlanValidator {
  return new DefaultPlanValidator();
}
