/**
 * @workspace/domain/discovery/orchestrator/orchestrator
 *
 * The Orchestrator is a PURE COORDINATOR. It performs exactly two
 * state transitions:
 *
 *   Draft ──▶ Reserved ──▶ Scheduled
 *
 * Inputs  : ImmutableDiscoveryPlan, PlannerContext, ExecutionContext
 * Outputs : DiscoveryJob[], DiscoveryPlanScheduled, DiscoveryJobCreated,
 *           ReservationToken (consumed by A2.3 Workers)
 *
 * R2: Builds JobFactoryInput from the plan — JobFactory stays decoupled.
 * R4: Returns ReservationToken; Workers consume it via consume().
 * R5: Events carry schemaVersion + workflowVersion + plannerVersion.
 * R6: Jobs carry parentPlanId + sequenceNumber.
 *
 * It does NOT call providers, does NOT write to DB, does NOT run AI.
 */
import type {
  PlanValidator,
  JobFactory,
  BudgetReservationService,
  ExecutionRegistry,
  OrchestratorEventPublisher,
  OrchestratorMetricsCollector
} from "./interfaces";
import type {
  ExecutionContext,
  ExecutionKey,
  JobFactoryInput,
  OrchestratorResult,
  PlanLifecycleState,
  ReservationToken
} from "./types";
import { asExecutionKeyValue } from "./types";
import type { ImmutableDiscoveryPlan } from "../planner";
import { makePlanScheduledEvent, makeJobCreatedEvent, type OrchestratorEvent } from "./events";

// ── ExecutionKey computation ───────────────────────────────

export function computeExecutionKey(
  plan: ImmutableDiscoveryPlan,
  ctx: ExecutionContext
): ExecutionKey {
  const planId = plan.id;
  const planVersion = plan.planHash;
  const workflowVersion = ctx.orchestratorVersion.workflowVersion;
  const providerManifestVersion = ctx.providerManifest.manifestVersion;

  const input = [planId, planVersion, workflowVersion, providerManifestVersion].join("|");
  const value = asExecutionKeyValue(`ek_${fnvHash(input)}`);

  return { value, planId, planVersion, workflowVersion, providerManifestVersion };
}

/**
 * FNV-1a 32-bit hash, two-pass for 64-bit-ish width. Stable across
 * runs and Node versions. Not crypto-secure — we need stable hashing
 * without BigInt (target is ES2017).
 */
function fnvHash(input: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193) >>> 0;
  }
  let h2 = 0x84222325;
  for (let i = input.length - 1; i >= 0; i--) {
    h2 ^= input.charCodeAt(i);
    h2 = Math.imul(h2, 0x01000193) >>> 0;
  }
  h1 = Math.imul(h1 ^ h2, 0x01000193) >>> 0;
  h2 = Math.imul(h2 ^ h1, 0x01000193) >>> 0;
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

// ── Orchestrator dependencies ──────────────────────────────

export interface OrchestratorDeps {
  readonly validator: PlanValidator;
  readonly jobFactory: JobFactory;
  readonly reservation: BudgetReservationService;
  readonly registry: ExecutionRegistry;
  readonly events: OrchestratorEventPublisher;
  readonly metrics: OrchestratorMetricsCollector;
}

// ── Orchestrator ───────────────────────────────────────────

export class DiscoveryOrchestrator {
  constructor(private readonly deps: OrchestratorDeps) {}

  /**
   * Schedule a plan: validate → reserve → create jobs → emit events.
   * Idempotent: same executionKey returns the previously-scheduled jobs.
   */
  async schedule(plan: ImmutableDiscoveryPlan, ctx: ExecutionContext): Promise<OrchestratorResult> {
    const totalTimer = this.deps.metrics.startTimer("total");
    this.deps.metrics.reset();

    // 1. Compute executionKey (always — used for idempotency lookup)
    const executionKey = computeExecutionKey(plan, ctx);

    // 2. Idempotency check — if already scheduled, return prior jobs
    const prior = this.deps.registry.lookup(executionKey);
    if (prior.exists && prior.state === "scheduled") {
      const reservation = this.deps.reservation.inspect(executionKey);
      this.deps.metrics.setGauge(
        "apiCallsReserved",
        reservation.exists ? reservation.reservedCalls : 0
      );
      this.deps.metrics.increment("jobsCreated", prior.jobs.length);
      totalTimer();
      return {
        state: "scheduled",
        plan,
        jobs: prior.jobs,
        executionKey,
        reservationToken: reservation.token ?? null,
        idempotentNoOp: true,
        metrics: this.deps.metrics.snapshot()
      };
    }

    // 3. Validate
    const vTimer = this.deps.metrics.startTimer("validation");
    const v = this.deps.validator.validate(plan, ctx);
    vTimer();
    if (!v.ok) {
      const state: PlanLifecycleState =
        v.code === "PLAN_TTL_EXCEEDED" || v.code === "PLAN_EXPIRED" ? "expired" : "failed";
      totalTimer();
      return {
        state,
        plan,
        jobs: [],
        executionKey,
        reservationToken: null,
        idempotentNoOp: false,
        failureReason: `${v.code} (${v.severity}, retryable=${v.retryable}): ${v.message ?? ""}`,
        metrics: this.deps.metrics.snapshot()
      };
    }

    // 4. Reserve budget (returns ReservationToken — R4)
    const rTimer = this.deps.metrics.startTimer("reservation");
    const r = this.deps.reservation.reserve(plan, ctx, executionKey);
    rTimer();
    if (!r.ok || !r.token) {
      totalTimer();
      return {
        state: "failed",
        plan,
        jobs: [],
        executionKey,
        reservationToken: null,
        idempotentNoOp: false,
        failureReason: `${r.code}: ${r.message ?? ""}`,
        metrics: this.deps.metrics.snapshot()
      };
    }
    const token: ReservationToken = r.token;

    // 5. Create jobs (R2: build JobFactoryInput from plan — decoupled factory)
    const factoryInput: JobFactoryInput = {
      executionKey,
      parentPlanId: plan.id,
      sources: plan.sources,
      regions: plan.regions,
      languages: plan.languages,
      categories: plan.categories,
      niches: plan.niches,
      signals: plan.signals,
      budget: plan.budget,
      priority: plan.priority,
      traceId: plan.traceId ?? ctx.traceId
    };
    const jTimer = this.deps.metrics.startTimer("jobFactory");
    const jf = this.deps.jobFactory.createJobs(factoryInput, ctx);
    jTimer();

    // 6. Register in execution registry (idempotent)
    const newlyRegistered = this.deps.registry.register(executionKey, jf.jobs);
    if (!newlyRegistered) {
      const raceResult = this.deps.registry.lookup(executionKey);
      totalTimer();
      return {
        state: "scheduled",
        plan,
        jobs: raceResult.jobs,
        executionKey,
        reservationToken: token,
        idempotentNoOp: true,
        failureReason: "Race: another orchestrator scheduled this plan concurrently",
        metrics: this.deps.metrics.snapshot()
      };
    }

    // 7. Mark state as scheduled
    this.deps.registry.markState(executionKey, "scheduled");

    // 8. Update metrics
    this.deps.metrics.setGauge("apiCallsReserved", r.reservedCalls);
    this.deps.metrics.increment("jobsCreated", jf.jobs.length);
    this.deps.metrics.increment(
      "sourcesScheduled",
      new Set(jf.jobs.map((j) => j.providerCode)).size
    );
    this.deps.metrics.increment("regionsScheduled", new Set(jf.jobs.map((j) => j.region)).size);

    // 9. Emit events (R5: carry schemaVersion + workflowVersion + plannerVersion)
    const versions = {
      workflowVersion: ctx.orchestratorVersion.workflowVersion,
      plannerVersion: ctx.planner.version.plannerVersion
    };
    const events: OrchestratorEvent[] = [
      makePlanScheduledEvent(versions, {
        planId: plan.id,
        planHash: plan.planHash,
        executionKey: executionKey.value,
        storeId: ctx.storeId,
        providerManifestVersion: ctx.providerManifest.manifestVersion,
        jobCount: jf.jobs.length,
        apiCallsReserved: r.reservedCalls,
        reservationToken: token.value
      }),
      ...jf.jobs.map((j) =>
        makeJobCreatedEvent(versions, {
          planId: plan.id,
          executionKey: executionKey.value,
          jobId: j.id,
          jobType: j.type,
          providerCode: j.providerCode,
          region: j.region,
          priority: j.priority,
          sequenceNumber: j.sequenceNumber
        })
      )
    ];
    await this.deps.events.publish(events);

    // 10. Finalize
    totalTimer();
    return {
      state: "scheduled",
      plan,
      jobs: jf.jobs,
      executionKey,
      reservationToken: token,
      idempotentNoOp: false,
      metrics: this.deps.metrics.snapshot()
    };
  }

  /**
   * Cancel a scheduled execution. Returns the released reservation (if any).
   * Does NOT cancel already-running jobs — workers must observe the
   * registry state and abort (cooperative cancellation in A2.3).
   */
  async cancel(executionKey: ExecutionKey): Promise<{
    cancelled: boolean;
    releasedCalls: number;
    state: PlanLifecycleState;
  }> {
    const lookup = this.deps.registry.lookup(executionKey);
    if (!lookup.exists) {
      return { cancelled: false, releasedCalls: 0, state: "failed" };
    }
    this.deps.registry.markState(executionKey, "cancelled");
    const released = this.deps.reservation.release(executionKey);
    return {
      cancelled: true,
      releasedCalls: released.releasedCalls,
      state: "cancelled"
    };
  }
}

// ── Factory ────────────────────────────────────────────────

export function createOrchestrator(deps: OrchestratorDeps): DiscoveryOrchestrator {
  return new DiscoveryOrchestrator(deps);
}
