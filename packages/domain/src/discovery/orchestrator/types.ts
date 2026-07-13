/**
 * @workspace/domain/discovery/orchestrator/types
 *
 * Type contracts for the Discovery Orchestrator (A2.2 — refined).
 *
 * Refinements applied (per architectural review):
 *   R1. ExecutionKeyValue is a branded type — prevents confusion with
 *       PlanId, JobId, or other hash strings at compile time.
 *   R2. JobFactory accepts JobFactoryInput (decoupled from DiscoveryPlan).
 *   R3. ValidationResult carries severity + retryable for observability.
 *   R4. Reservation returns a ReservationToken that Workers consume.
 *   R5. Event payloads carry schemaVersion + workflowVersion + plannerVersion.
 *   R6. DiscoveryJob carries parentPlanId + sequenceNumber for debugging.
 *
 * The Orchestrator remains a PURE COORDINATOR. It does NOT:
 *   - decide priorities (Planner's job)
 *   - allocate budget (BudgetAllocator's job)
 *   - call marketplaces (Provider's job — Workers in A2.3)
 *   - normalize products (A2.5 Normalizer's job)
 *   - run AI (A2.7 AI Evaluation's job)
 *   - persist catalog (Catalog Publisher's job)
 */
import type { BrandedId } from "../../shared";
import type { DiscoveryJob, DiscoveryPlan, DiscoveryJobId, DiscoverySignal } from "../types";
import type { ImmutableDiscoveryPlan, PlannerContext, PlannerVersion } from "../planner";

// ── Branded primitives (R1) ────────────────────────────────

/**
 * Branded ExecutionKey value — prevents accidental confusion with
 * PlanId, JobId, or any other hash strings. Two ExecutionKeyValues
 * are assignable only to other ExecutionKeyValues.
 */
export type ExecutionKeyValue = BrandedId<"ExecutionKeyValue">;

/**
 * Branded ReservationToken value. A token is a one-time-use credential
 * that a Worker consumes to debit budget. Tokens cannot be confused
 * with ExecutionKeys, JobIds, or any other string.
 */
export type ReservationTokenValue = BrandedId<"ReservationTokenValue">;

/** Coerce a raw string into a branded ExecutionKeyValue (trust boundary only). */
export function asExecutionKeyValue(v: string): ExecutionKeyValue {
  return v as ExecutionKeyValue;
}

/** Coerce a raw string into a branded ReservationTokenValue (trust boundary only). */
export function asReservationTokenValue(v: string): ReservationTokenValue {
  return v as ReservationTokenValue;
}

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

export const ORCHESTRATOR_TRANSITIONS: ReadonlyArray<{
  readonly from: PlanLifecycleState;
  readonly to: PlanLifecycleState;
}> = [
  { from: "draft", to: "reserved" },
  { from: "reserved", to: "scheduled" }
  // Workers (A2.3) add: scheduled→executing, executing→completed, executing→failed
  // External: *→cancelled, *→expired
];

export function isOrchestratorTransition(
  from: PlanLifecycleState,
  to: PlanLifecycleState
): boolean {
  return ORCHESTRATOR_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

// ── Versions ───────────────────────────────────────────────

export interface OrchestratorVersion {
  readonly orchestratorVersion: string;
  readonly workflowVersion: string;
  readonly validatorVersion: string;
}

export const CurrentOrchestratorVersion: OrchestratorVersion = {
  orchestratorVersion: "1.0.0",
  workflowVersion: "1.0.0",
  validatorVersion: "1.0.0"
};

/**
 * Schema version for the orchestrator's own event payloads.
 * Bumped when any event payload shape changes — enables replay
 * with upcasting.
 */
export const ORCHESTRATOR_SCHEMA_VERSION = "1.0.0" as const;

export interface ProviderManifestVersion {
  readonly manifestVersion: string;
  readonly perProvider: Readonly<Record<string, string>>;
}

// ── Execution Key (idempotency, R1) ────────────────────────

export interface ExecutionKey {
  readonly value: ExecutionKeyValue;
  readonly planId: string;
  readonly planVersion: string;
  readonly workflowVersion: string;
  readonly providerManifestVersion: string;
}

// ── Execution Context ──────────────────────────────────────

export interface ExecutionContext {
  readonly planner: PlannerContext;
  readonly orchestratorVersion: OrchestratorVersion;
  readonly providerManifest: ProviderManifestVersion;
  readonly storeId: string;
  readonly featureFlags: ReadonlySet<string>;
  readonly now?: () => Date;
  readonly planTtlMs?: number;
  /** Cross-cutting traceability — propagated from PlannerContext.traceId. */
  readonly traceId?: import("../../shared").DiscoveryTraceId;
}

// ── Orchestrator results ───────────────────────────────────

export interface OrchestratorResult {
  readonly state: PlanLifecycleState;
  readonly plan: ImmutableDiscoveryPlan | null;
  readonly jobs: ReadonlyArray<DiscoveryJob>;
  readonly executionKey: ExecutionKey;
  /** Reservation token — Workers (A2.3) consume this to debit budget. */
  readonly reservationToken: ReservationToken | null;
  readonly idempotentNoOp: boolean;
  readonly failureReason?: string;
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

// ── Validation (R3) ────────────────────────────────────────

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

export type ValidationSeverity = "error" | "warning";

export interface ValidationResult {
  readonly ok: boolean;
  readonly code: ValidationCode;
  readonly severity: ValidationSeverity;
  /** If true, the caller may retry after fixing the issue (e.g. budget refill). */
  readonly retryable: boolean;
  readonly message?: string;
}

// ── Reservation (R4) ───────────────────────────────────────

export type ReservationCode =
  | "RESERVED"
  | "ALREADY_RESERVED"
  | "INSUFFICIENT_BUDGET"
  | "RESERVATION_CONFLICT"
  | "TOKEN_CONSUMED"
  | "TOKEN_EXPIRED"
  | "TOKEN_INVALID";

/**
 * One-time-use reservation credential. Flows:
 *   Orchestrator.reserve() → Job → Worker.consume(token)
 *
 * Once consumed, the token cannot be reused. The Worker must call
 * consume() exactly once, passing the actual API calls used.
 */
export interface ReservationToken {
  readonly value: ReservationTokenValue;
  readonly executionKey: ExecutionKey;
  readonly planId: string;
  readonly reservedCalls: number;
  readonly consumed: boolean;
  readonly consumedCalls: number;
  readonly createdAt: Date;
  readonly expiresAt?: Date;
}

export interface ReservationResult {
  readonly ok: boolean;
  readonly code: ReservationCode;
  readonly reservedCalls: number;
  readonly remainingCalls: number;
  /** Present when code is RESERVED or ALREADY_RESERVED. */
  readonly token?: ReservationToken;
  readonly message?: string;
}

export interface ConsumeResult {
  readonly ok: boolean;
  readonly code: ReservationCode;
  readonly callsDebited: number;
  readonly overage: number;
  readonly message?: string;
}

// ── Job Factory (R2, R6) ───────────────────────────────────

/**
 * Decoupled input for JobFactory — does NOT depend on DiscoveryPlan.
 * The Orchestrator builds this from the plan; A2.3 Workers can also
 * build it for re-scheduling scenarios without importing Planner.
 */
export interface JobFactoryInput {
  readonly executionKey: ExecutionKey;
  readonly parentPlanId: string;
  readonly sources: ReadonlyArray<{
    sourceId: string;
    sourceType: string;
    providerCode: string;
    capabilities: string[];
  }>;
  readonly regions: ReadonlyArray<string>;
  readonly languages: ReadonlyArray<string>;
  readonly categories: ReadonlyArray<string>;
  readonly niches: ReadonlyArray<string>;
  readonly signals: ReadonlyArray<DiscoverySignal>;
  readonly budget: {
    totalApiCalls: number;
    perSource: Readonly<Record<string, number>>;
    perRegion: Readonly<Record<string, number>>;
    perCategory: Readonly<Record<string, number>>;
  };
  readonly priority: { overall: number };
  /** Cross-cutting traceability — propagated to every DiscoveryJob. */
  readonly traceId?: import("../../shared").DiscoveryTraceId;
}

export interface JobFactoryResult {
  readonly jobs: ReadonlyArray<DiscoveryJob>;
  readonly deterministic: boolean;
  readonly sortKey: string;
}

// ── Re-exports for convenience ─────────────────────────────

export type { DiscoveryJob, DiscoveryPlan, DiscoveryJobId, DiscoverySignal };
export type { ImmutableDiscoveryPlan, PlannerContext, PlannerVersion };
