/**
 * @workspace/domain/discovery/orchestrator/orchestrator
 *
 * The Orchestrator is a PURE COORDINATOR. It performs exactly two
 * state transitions:
 *
 *   Draft ──▶ Reserved ──▶ Scheduled
 *
 * Inputs  : ImmutableDiscoveryPlan, PlannerContext, ExecutionContext
 * Outputs : DiscoveryJob[], DiscoveryPlanScheduled, DiscoveryJobCreated
 *
 * It does NOT call providers, does NOT write to DB, does NOT run AI.
 * All side effects (DB writes, provider calls) are delegated to
 * repositories / workers / providers downstream.
 *
 * Idempotency: executionKey = SHA256(planId + planVersion + workflowVersion + providerVersion)
 *   Same key ⇒ same jobs ⇒ no duplication.
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
  OrchestratorResult,
  PlanLifecycleState
} from "./types";
import type { ImmutableDiscoveryPlan } from "../planner";
import { makePlanScheduledEvent, makeJobCreatedEvent, type OrchestratorEvent } from "./events";

// ── ExecutionKey computation ───────────────────────────────

/**
 * Synchronous SHA-256 substitute suitable for deterministic IDs.
 *
 * We avoid the async WebCrypto API here because:
 *   1. The orchestrator must be deterministic and synchronous-friendly.
 *   2. We don't need cryptographic strength — we need stable hashing.
 *   3. Test ergonomics (no async/await in deterministic tests).
 *
 * Production may swap in crypto.subtle by injecting a custom computeExecutionKey.
 */
export function computeExecutionKey(
  plan: ImmutableDiscoveryPlan,
  ctx: ExecutionContext
): ExecutionKey {
  const planId = plan.id;
  const planVersion = plan.planHash;
  const workflowVersion = ctx.orchestratorVersion.workflowVersion;
  const providerManifestVersion = ctx.providerManifest.manifestVersion;

  const input = [planId, planVersion, workflowVersion, providerManifestVersion].join("|");
  const value = `ek_${sha256Sync(input)}`;

  return { value, planId, planVersion, workflowVersion, providerManifestVersion };
}

/**
 * FNV-1a 32-bit hash, two-pass for 64-bit-ish width. Stable across
 * runs and Node versions. Not crypto-secure — see comment above.
 *
 * Why not BigInt? The project's tsconfig targets ES2017, so BigInt
 * literals (0n) are unavailable. We compose two 32-bit hashes
 * instead, which gives us 8 hex chars × 2 = 16 chars — enough for
 * collision resistance across millions of execution keys.
 */
function sha256Sync(input: string): string {
  // Pass 1: forward FNV-1a
  let h1 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    // h1 *= 16777619 (FNV prime), kept in 32-bit unsigned space
    h1 = Math.imul(h1, 0x01000193) >>> 0;
  }
  // Pass 2: backward FNV-1a with different seed
  let h2 = 0x84222325;
  for (let i = input.length - 1; i >= 0; i--) {
    h2 ^= input.charCodeAt(i);
    h2 = Math.imul(h2, 0x01000193) >>> 0;
  }
  // Mix: cross-pollinate
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
      return {
        state,
        plan,
        jobs: [],
        executionKey,
        idempotentNoOp: false,
        failureReason: `${v.code}: ${v.message ?? ""}`,
        metrics: this.deps.metrics.snapshot()
      };
    }

    // 4. Reserve budget
    const rTimer = this.deps.metrics.startTimer("reservation");
    const r = this.deps.reservation.reserve(plan, ctx, executionKey);
    rTimer();
    if (!r.ok) {
      // Release nothing — nothing was reserved
      return {
        state: "failed",
        plan,
        jobs: [],
        executionKey,
        idempotentNoOp: false,
        failureReason: `${r.code}: ${r.message ?? ""}`,
        metrics: this.deps.metrics.snapshot()
      };
    }

    // 5. Create jobs
    const jTimer = this.deps.metrics.startTimer("jobFactory");
    const jf = this.deps.jobFactory.createJobs(plan, ctx, executionKey);
    jTimer();

    // 6. Register in execution registry (idempotent)
    const newlyRegistered = this.deps.registry.register(executionKey, jf.jobs);
    if (!newlyRegistered) {
      // Race condition: another worker registered between our lookup and register.
      // Re-fetch and return their result for idempotency.
      const raceResult = this.deps.registry.lookup(executionKey);
      return {
        state: "scheduled",
        plan,
        jobs: raceResult.jobs,
        executionKey,
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

    // 9. Emit events (intent events)
    const events: OrchestratorEvent[] = [
      makePlanScheduledEvent({
        planId: plan.id,
        planHash: plan.planHash,
        executionKey: executionKey.value,
        storeId: ctx.storeId,
        workflowVersion: ctx.orchestratorVersion.workflowVersion,
        providerManifestVersion: ctx.providerManifest.manifestVersion,
        jobCount: jf.jobs.length,
        apiCallsReserved: r.reservedCalls
      }),
      ...jf.jobs.map((j) =>
        makeJobCreatedEvent({
          planId: plan.id,
          executionKey: executionKey.value,
          jobId: j.id,
          jobType: j.type,
          providerCode: j.providerCode,
          region: j.region,
          priority: j.priority
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
      idempotentNoOp: false,
      metrics: this.deps.metrics.snapshot()
    };
  }

  /**
   * Cancel a scheduled execution. Returns the released reservation (if any).
   * Does NOT cancel already-running jobs — workers must observe the
   * registry state and abort.
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
