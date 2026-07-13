/**
 * @workspace/domain/discovery/orchestrator/types
 *
 * Type contracts for the Discovery Orchestrator (A2.2).
 *
 * The Orchestrator is a PURE COORDINATOR. It does NOT:
 *   - decide priorities (Planner's job)
 *   - allocate budget (BudgetAllocator's job)
 *   - call marketplaces (Provider's job)
 *   - normalize products (A2.5 Normalizer's job)
 *   - run AI (A2.7 AI Evaluation's job)
 *   - persist catalog (Catalog Publisher's job)
 *
 * It only:
 *   - validates a plan (validator.ts)
 *   - reserves budget (reservation.ts)
 *   - creates deterministic jobs (job-factory.ts)
 *   - deduplicates via executionKey (execution-registry.ts)
 *   - emits events (events.ts)
 *   - collects metrics (metrics.ts)
 *
 * Lifecycle produced by Orchestrator:
 *   Draft ──validate+reserve──▶ Reserved ──create jobs──▶ Scheduled
 *
 * Workers (A2.3) take over from Scheduled:
 *   Scheduled ──▶ Executing ──▶ Completed | Failed
 *
 * Side-states reachable from anywhere:
 *   Cancelled (user), Expired (TTL), Failed (validation/reservation)
 */
import type { DiscoveryJob, DiscoveryPlan, DiscoveryJobId } from "../types";
import type { ImmutableDiscoveryPlan, PlannerContext, PlannerVersion } from "../planner";

// ── Plan lifecycle (Orchestrator-controlled slice) ─────────

export type PlanLifecycleState =
  | "draft"
  | "queued"
  | "reserved"
  | "scheduled"
  | "executing"
  | "completed"
  | "cancelled"
  | "expired"
  | "failed";

/**
 * State machine transitions. The Orchestrator only emits:
 *   draft → reserved → scheduled
 * All other transitions are owned by Workers (A2.3) or external triggers.
 */
export const ORCHESTRATOR_TRANSITIONS: ReadonlyArray<{
  readonly from: PlanLifecycleState;
  readonly to: PlanLifecycleState;
}> = [
  { from: "draft", to: "reserved" },
  { from: "reserved", to: "scheduled" }
  // Workers add: scheduled→executing, executing→completed, executing→failed
  // External: *→cancelled, *→expired
];

export function isOrchestratorTransition(
  from: PlanLifecycleState,
  to: PlanLifecycleState
): boolean {
  return ORCHESTRATOR_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

// ── Versions ───────────────────────────────────────────────

/**
 * Orchestrator code + workflow versioning. Bumping any of these
 * invalidates previous executionKeys, forcing re-execution.
 */
export interface OrchestratorVersion {
  /** Bump when orchestrator.ts coordination logic changes. */
  readonly orchestratorVersion: string;
  /** Bump when job-factory.ts job derivation algorithm changes. */
  readonly workflowVersion: string;
  /** Bump when validator.ts rules change. */
  readonly validatorVersion: string;
}

export const CurrentOrchestratorVersion: OrchestratorVersion = {
  orchestratorVersion: "1.0.0",
  workflowVersion: "1.0.0",
  validatorVersion: "1.0.0"
};

/**
 * External versioning that the orchestrator does NOT control but
 * MUST include in executionKey so plan re-runs when downstream changes.
 */
export interface ProviderManifestVersion {
  /** Hash or version of the provider capability registry snapshot. */
  readonly manifestVersion: string;
  /** Per-provider code versions (optional — empty if unknown). */
  readonly perProvider: Readonly<Record<string, string>>;
}

// ── Execution Key (idempotency) ────────────────────────────

/**
 * ExecutionKey is a deterministic SHA-256 of:
 *   planId + planVersion + workflowVersion + providerVersion
 *
 * Same key ⇒ same jobs ⇒ no duplication.
 * Different key (any version bumped) ⇒ re-execute.
 */
export interface ExecutionKey {
  readonly value: string;
  readonly planId: string;
  readonly planVersion: string;
  readonly workflowVersion: string;
  readonly providerManifestVersion: string;
}

// ── Execution Context ──────────────────────────────────────

/**
 * Context passed to the Orchestrator alongside the Plan.
 * Contains everything the orchestrator needs that is NOT in the plan itself.
 */
export interface ExecutionContext {
  /** Planner context that produced the plan (for traceability). */
  readonly planner: PlannerContext;
  /** Orchestrator code version. */
  readonly orchestratorVersion: OrchestratorVersion;
  /** Snapshot of provider manifest at scheduling time. */
  readonly providerManifest: ProviderManifestVersion;
  /** Store ID for multi-tenant isolation. */
  readonly storeId: string;
  /** Feature flags snapshot. */
  readonly featureFlags: ReadonlySet<string>;
  /** Optional clock injection for deterministic tests. */
  readonly now?: () => Date;
  /** Optional TTL: plans older than this become expired (ms). */
  readonly planTtlMs?: number;
}

// ── Orchestrator results ───────────────────────────────────

export interface OrchestratorResult {
  /** Final state after orchestration. */
  readonly state: PlanLifecycleState;
  /** The plan as scheduled (status mutated to "scheduled"). */
  readonly plan: ImmutableDiscoveryPlan | null;
  /** Jobs created (empty if scheduling did not complete). */
  readonly jobs: ReadonlyArray<DiscoveryJob>;
  /** Execution key for this run. */
  readonly executionKey: ExecutionKey;
  /** Whether this run was a no-op (already scheduled previously). */
  readonly idempotentNoOp: boolean;
  /** Reason for terminal failure (state = "failed" | "expired" | "cancelled"). */
  readonly failureReason?: string;
  /** Metrics snapshot. */
  readonly metrics: OrchestratorMetricsSnapshot;
}

export interface OrchestratorMetricsSnapshot {
  readonly validationDurationMs: number;
  readonly reservationDurationMs: number;
  readonly jobFactoryDurationMs: number;
  readonly totalDurationMs: number;
  readonly jobsCreated: number;
  readonly apiCallsReserved: number;
  readonly sourcesScheduled: number;
  readonly regionsScheduled: number;
}

// ── Validation ─────────────────────────────────────────────

export type ValidationCode =
  | "OK"
  | "PLAN_EXPIRED"
  | "PLAN_EMPTY"
  | "PLAN_NO_SOURCES"
  | "PLAN_NO_REGIONS"
  | "PLAN_NO_LANGUAGES"
  | "PLAN_BUDGET_ZERO"
  | "PLAN_BUDGET_NEGATIVE"
  | "PLAN_STATUS_INVALID"
  | "PLAN_TTL_EXCEEDED";

export interface ValidationResult {
  readonly ok: boolean;
  readonly code: ValidationCode;
  readonly message?: string;
}

// ── Reservation ────────────────────────────────────────────

export type ReservationCode =
  "RESERVED" | "ALREADY_RESERVED" | "INSUFFICIENT_BUDGET" | "RESERVATION_CONFLICT";

export interface ReservationResult {
  readonly ok: boolean;
  readonly code: ReservationCode;
  readonly reservedCalls: number;
  readonly remainingCalls: number;
  readonly message?: string;
}

// ── Job Factory ────────────────────────────────────────────

export interface JobFactoryResult {
  readonly jobs: ReadonlyArray<DiscoveryJob>;
  readonly deterministic: boolean;
  /** Stable sort key used to ensure determinism. */
  readonly sortKey: string;
}

// ── Re-exports for convenience ─────────────────────────────

export type { DiscoveryJob, DiscoveryPlan, DiscoveryJobId };
export type { ImmutableDiscoveryPlan, PlannerContext, PlannerVersion };
