/**
 * @workspace/domain/discovery/orchestrator/validator
 *
 * PlanValidator implementation (A2.2 — refined).
 *
 * R3: Returns structured ValidationResult with severity + retryable:
 *   - severity="error" + retryable=false → permanent failure (e.g. plan empty)
 *   - severity="error" + retryable=true  → transient (e.g. budget insufficient)
 *   - severity="warning" + retryable=true → soft issue (e.g. some signals expired)
 *
 * Pure function — no DB, no providers.
 */
import type { PlanValidator } from "./interfaces";
import type {
  ExecutionContext,
  ValidationResult,
  ValidationCode,
  ValidationSeverity
} from "./types";
import type { ImmutableDiscoveryPlan } from "../planner";

const DEFAULT_PLAN_TTL_MS = 1000 * 60 * 60 * 24; // 24h

/**
 * Severity + retryability matrix per validation code.
 * Used for observability and to drive Worker retry decisions in A2.3.
 */
const CODE_META: Record<ValidationCode, { severity: ValidationSeverity; retryable: boolean }> = {
  OK: { severity: "warning", retryable: true }, // unused for failures
  PLAN_EXPIRED: { severity: "error", retryable: false },
  PLAN_EMPTY: { severity: "error", retryable: false },
  PLAN_NO_SOURCES: { severity: "error", retryable: false },
  PLAN_NO_REGIONS: { severity: "error", retryable: false },
  PLAN_NO_LANGUAGES: { severity: "error", retryable: false },
  PLAN_BUDGET_ZERO: { severity: "error", retryable: true }, // refill possible
  PLAN_BUDGET_NEGATIVE: { severity: "error", retryable: true },
  PLAN_STATUS_INVALID: { severity: "error", retryable: false },
  PLAN_TTL_EXCEEDED: { severity: "error", retryable: false }
};

export class DefaultPlanValidator implements PlanValidator {
  validate(plan: ImmutableDiscoveryPlan, ctx: ExecutionContext): ValidationResult {
    const now = (ctx.now ?? (() => new Date()))();

    // 1. Status check
    if (plan.status !== "draft") {
      return fail("PLAN_STATUS_INVALID", `Plan status is '${plan.status}', expected 'draft'`);
    }

    // 2. TTL check
    const ttl = ctx.planTtlMs ?? DEFAULT_PLAN_TTL_MS;
    const age = now.getTime() - plan.createdAt.getTime();
    if (age > ttl) {
      return fail("PLAN_TTL_EXCEEDED", `Plan age ${age}ms exceeds TTL ${ttl}ms`);
    }

    // 3. Expiry check — all signals expired
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
    if (plan.budget.totalApiCalls < 0) {
      return fail("PLAN_BUDGET_NEGATIVE", "Plan budget.totalApiCalls is negative");
    }
    if (plan.budget.totalApiCalls === 0) {
      return fail("PLAN_BUDGET_ZERO", "Plan budget.totalApiCalls is zero");
    }

    // 6. Empty plan check
    const hasCategories = plan.categories.length > 0;
    const hasNiches = plan.niches.length > 0;
    const hasKeywords = plan.signals.some((s) => s.scope.niche);
    if (!hasCategories && !hasNiches && !hasKeywords) {
      return fail(
        "PLAN_EMPTY",
        "Plan has no categories, niches, or keyword-bearing signals — nothing to discover"
      );
    }

    return { ok: true, code: "OK", severity: "warning", retryable: true };
  }
}

function fail(code: ValidationCode, message: string): ValidationResult {
  const meta = CODE_META[code];
  return { ok: false, code, severity: meta.severity, retryable: meta.retryable, message };
}

export function createPlanValidator(): PlanValidator {
  return new DefaultPlanValidator();
}
