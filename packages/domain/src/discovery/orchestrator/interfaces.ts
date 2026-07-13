/**
 * @workspace/domain/discovery/orchestrator/interfaces
 *
 * The six interface contracts of the Orchestrator. Defining these NOW
 * (even with simple implementations) prevents refactor pain when A2.3
 * Workers land and need to consume the same contracts.
 *
 * All implementations MUST be deterministic and side-effect-free
 * with respect to the outside world (no HTTP, no DB writes, no provider calls).
 */
import type {
  ExecutionContext,
  ExecutionKey,
  JobFactoryResult,
  ReservationResult,
  ValidationResult,
  OrchestratorMetricsSnapshot,
  PlanLifecycleState
} from "./types";
import type { DiscoveryJob } from "../types";
import type { ImmutableDiscoveryPlan } from "../planner";

// ── 1. PlanValidator ───────────────────────────────────────

export interface PlanValidator {
  /**
   * Validate that a plan is schedulable.
   * Returns OK or one of the ValidationCode enum values.
   * MUST NOT mutate the plan. MUST NOT touch the DB.
   */
  validate(plan: ImmutableDiscoveryPlan, ctx: ExecutionContext): ValidationResult;
}

// ── 2. JobFactory ──────────────────────────────────────────

export interface JobFactory {
  /**
   * Derive DiscoveryJob[] from a plan. MUST be deterministic:
   *   same plan + same executionKey ⇒ same job IDs in same order.
   * MUST NOT call providers. MUST NOT write to DB.
   */
  createJobs(
    plan: ImmutableDiscoveryPlan,
    ctx: ExecutionContext,
    key: ExecutionKey
  ): JobFactoryResult;
}

// ── 3. BudgetReservationService ────────────────────────────

export interface BudgetReservationService {
  /**
   * Reserve API calls for a plan execution. Idempotent:
   *   same executionKey ⇒ returns ALREADY_RESERVED with original allocation.
   * MUST NOT debit final budget (that happens when jobs complete).
   */
  reserve(
    plan: ImmutableDiscoveryPlan,
    ctx: ExecutionContext,
    key: ExecutionKey
  ): ReservationResult;

  /**
   * Release a prior reservation (e.g. when scheduling fails after reserve).
   */
  release(key: ExecutionKey): { released: boolean; releasedCalls: number };

  /**
   * Inspect a reservation without modifying it.
   */
  inspect(key: ExecutionKey): {
    exists: boolean;
    reservedCalls: number;
    reservedAt?: Date;
    planId?: string;
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
