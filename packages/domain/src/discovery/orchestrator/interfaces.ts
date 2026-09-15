/**
 * @workspace/domain/discovery/orchestrator/interfaces
 *
 * Six interface contracts of the Orchestrator (A2.2 — refined).
 *
 * Refinements:
 *   R2. JobFactory accepts JobFactoryInput (no DiscoveryPlan dependency)
 *   R3. PlanValidator returns structured ValidationResult (severity, retryable)
 *   R4. BudgetReservationService returns ReservationToken; adds consume()
 *   R6. Jobs created by JobFactory carry parentPlanId + sequenceNumber
 *
 * All implementations MUST be deterministic and side-effect-free
 * with respect to the outside world (no HTTP, no DB writes, no provider calls).
 */
import type {
  ExecutionContext,
  ExecutionKey,
  JobFactoryInput,
  JobFactoryResult,
  ReservationResult,
  ReservationToken,
  ConsumeResult,
  ValidationResult,
  OrchestratorMetricsSnapshot,
  PlanLifecycleState
} from "./types";
import type { DiscoveryJob } from "../types";
import type { ImmutableDiscoveryPlan } from "../planner";

// ── 1. PlanValidator (R3) ──────────────────────────────────

export interface PlanValidator {
  /**
   * Validate that a plan is schedulable.
   * Returns OK or one of the ValidationCode enum values, with
   * severity (error/warning) and retryable flag for observability.
   * MUST NOT mutate the plan. MUST NOT touch the DB.
   */
  validate(plan: ImmutableDiscoveryPlan, ctx: ExecutionContext): ValidationResult;
}

// ── 2. JobFactory (R2, R6) ─────────────────────────────────

export interface JobFactory {
  /**
   * Derive DiscoveryJob[] from a JobFactoryInput.
   *
   * R2: Accepts JobFactoryInput, NOT DiscoveryPlan — A2.3 Workers
   *     can re-use the factory without a Planner dependency.
   *
   * R6: Each job carries parentPlanId + sequenceNumber for debugging.
   *
   * MUST be deterministic: same input + same executionKey ⇒ same job
   * IDs in same order. MUST NOT call providers. MUST NOT write to DB.
   */
  createJobs(input: JobFactoryInput, ctx: ExecutionContext): JobFactoryResult;
}

// ── 3. BudgetReservationService (R4) ───────────────────────

export interface BudgetReservationService {
  /**
   * Reserve API calls for a plan execution. Idempotent:
   *   same executionKey ⇒ returns ALREADY_RESERVED with the original
   *   token (re-issued with consumed flag reflecting current state).
   *
   * Returns a ReservationToken that the Worker MUST consume exactly once.
   * Does NOT debit final budget — that happens in consume().
   */
  reserve(
    plan: ImmutableDiscoveryPlan,
    ctx: ExecutionContext,
    key: ExecutionKey
  ): ReservationResult;

  /**
   * Consume a reservation token — debits actual API calls used.
   * One-time-use: a second consume() on the same token returns TOKEN_CONSUMED.
   * If actualCalls > reservedCalls, the overage is reported but still debited
   * (callers can alert on overage).
   */
  consume(token: ReservationToken, actualCallsUsed: number): ConsumeResult;

  /**
   * Release a prior reservation without consuming (e.g. cancellation,
   * scheduling failure after reserve). The token is invalidated.
   */
  release(executionKey: ExecutionKey): { released: boolean; releasedCalls: number };

  /**
   * Inspect a reservation without modifying it.
   */
  inspect(executionKey: ExecutionKey): {
    exists: boolean;
    reservedCalls: number;
    consumed: boolean;
    consumedCalls: number;
    reservedAt?: Date;
    planId?: string;
    token?: ReservationToken;
  };
}

// ── 4. ExecutionRegistry ───────────────────────────────────

export interface ExecutionRegistry {
  /**
   * Register an execution. Returns true if newly registered,
   * false if already present (idempotent).
   */
  register(key: ExecutionKey, jobs: ReadonlyArray<DiscoveryJob>): boolean;

  /** Look up a prior execution by key. */
  lookup(key: ExecutionKey): {
    exists: boolean;
    jobs: ReadonlyArray<DiscoveryJob>;
    registeredAt?: Date;
    state?: PlanLifecycleState;
  };

  /** Update state for a registered execution (workers use this in A2.3). */
  markState(key: ExecutionKey, state: PlanLifecycleState): boolean;

  /** Clear all entries (tests only). */
  clear(): void;
}

// ── 5. OrchestratorEventPublisher ──────────────────────────

export interface OrchestratorEventPublisher {
  /**
   * Publish one or more orchestrator events. Implementations may
   * delegate to the DomainEventBus or to an outbox.
   */
  publish(events: ReadonlyArray<OrchestratorEvent>): Promise<void>;
}

// ── 6. OrchestratorMetricsCollector ────────────────────────

export interface OrchestratorMetricsCollector {
  /** Begin a timer; returns a stop() that yields ms. */
  startTimer(name: string): () => number;

  /** Increment a counter. */
  increment(name: string, by?: number): void;

  /** Set a gauge. */
  setGauge(name: string, value: number): void;

  /** Snapshot for the current run. */
  snapshot(): OrchestratorMetricsSnapshot;

  /** Reset for a new run. */
  reset(): void;
}

// ── Event payloads (forward declaration for the publisher) ─

import type { OrchestratorEvent } from "./events";
