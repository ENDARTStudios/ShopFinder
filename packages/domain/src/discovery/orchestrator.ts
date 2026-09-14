/**
 * @workspace/domain/discovery/orchestrator — Discovery Orchestrator
 *
 * Per A2.2: transforms approved DiscoveryPlans into executable DiscoveryJobs.
 *
 * Flow:
 *   DiscoveryPlanCreated → Load Plan → Validate (TTL, Flags, Budget)
 *   → Reserve Budget → Expand Plan → DiscoveryJobs → Persist → Publish JobCreated
 *
 * Does NOT:
 *   - Call marketplaces (that's Workers A2.3)
 *   - Normalize products (that's A2.4)
 *   - Deduplicate (that's A2.5)
 *   - Run AI (that's A2.7)
 *   - Touch catalog (that's A2.9)
 *
 * The Orchestrator is extremely small — it only transforms intent into work.
 */

import type {
  DiscoveryJob,
  DiscoveryJobId,
  DiscoveryJobType,
  DiscoveryJobStatus,
  DiscoveryJobResult,
  DiscoveryCheckpoint,
  DiscoveryPlan,
  DiscoveryBudget,
  DiscoveryBudgetAllocation
} from "./index";
import type { ImmutableDiscoveryPlan } from "./planner";
import type { Money } from "../shared";

// ── Repository Interfaces ───────────────────────────────────
//
// Per A2.2 contracts: Orchestrator is completely decoupled from infrastructure.
// Repositories are injected — Orchestrator never knows Prisma.

export interface DiscoveryPlanRepository {
  findById(planId: string): Promise<ImmutableDiscoveryPlan | null>;
  findByHash(planHash: string): Promise<ImmutableDiscoveryPlan | null>;
  save(plan: ImmutableDiscoveryPlan): Promise<void>;
  updateStatus(planId: string, status: PlanExecutionStatus): Promise<void>;
}

export interface DiscoveryJobRepository {
  save(job: DiscoveryJob): Promise<void>;
  saveBatch(jobs: ReadonlyArray<DiscoveryJob>): Promise<void>;
  findById(jobId: DiscoveryJobId): Promise<DiscoveryJob | null>;
  findByPlanId(planId: string): Promise<DiscoveryJob[]>;
  updateStatus(
    jobId: DiscoveryJobId,
    status: DiscoveryJobStatus,
    result?: DiscoveryJobResult
  ): Promise<void>;
}

export interface CheckpointRepository {
  save(checkpoint: DiscoveryCheckpoint): Promise<void>;
  findByJobId(jobId: DiscoveryJobId): Promise<DiscoveryCheckpoint | null>;
}

export interface ExecutionRegistry {
  /** Check if a plan has already been executed (idempotency) */
  isExecuted(planHash: string): Promise<boolean>;
  /** Mark a plan as executed */
  markExecuted(planHash: string, executionId: string): Promise<void>;
  /** Get execution ID for a plan */
  getExecutionId(planHash: string): Promise<string | null>;
}

// ── Budget Reservation ──────────────────────────────────────

export interface BudgetReservationService {
  reserve(planId: string, allocation: DiscoveryBudgetAllocation): Promise<BudgetReservationResult>;
  release(planId: string): Promise<void>;
  getReserved(planId: string): Promise<DiscoveryBudgetAllocation | null>;
}

export interface BudgetReservationResult {
  reserved: boolean;
  allocation: DiscoveryBudgetAllocation;
  reason?: string;
}

// ── Event Publisher ─────────────────────────────────────────

export interface OrchestratorEventPublisher {
  publishPlanScheduled(planId: string, jobIds: string[]): Promise<void>;
  publishJobCreated(job: DiscoveryJob): Promise<void>;
  publishPlanExpired(planId: string, reason: string): Promise<void>;
  publishBudgetRejected(planId: string, reason: string): Promise<void>;
}

// ── Plan Execution Status ───────────────────────────────────
//
// Per A2.2: Plan and Execution have separate state machines.
// Plan = intent. Execution = processing.

export type PlanExecutionStatus = "draft" | "scheduled" | "cancelled" | "expired";

// ── Orchestrator Configuration ──────────────────────────────

export interface OrchestratorConfig {
  planTtlMs: number; // plans older than this are expired
  maxJobsPerPlan: number;
  maxRetries: number;
  defaultJobPriority: number;
}

export const DefaultOrchestratorConfig: OrchestratorConfig = {
  planTtlMs: 60 * 60 * 1000, // 1 hour
  maxJobsPerPlan: 20,
  maxRetries: 3,
  defaultJobPriority: 50
};

// ── Orchestrator Input ──────────────────────────────────────

export interface OrchestratorInput {
  plan: ImmutableDiscoveryPlan;
  budget: DiscoveryBudget;
  featureFlags: ReadonlySet<string>;
}

// ── Orchestrator Result ─────────────────────────────────────

export interface OrchestratorResult {
  jobs: ReadonlyArray<DiscoveryJob>;
  planStatus: PlanExecutionStatus;
  budgetReserved: boolean;
  metrics: OrchestratorMetrics;
  durationMs: number;
}

export interface OrchestratorMetrics {
  plansReceived: number;
  plansExpired: number;
  plansScheduled: number;
  plansCancelled: number;
  jobsCreated: number;
  jobsPerPlan: number;
  budgetReserved: number;
  budgetRejected: number;
  orchestrationDurationMs: number;
  reasons: Record<string, number>;
}

// ── Validation ──────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validatePlan(
  plan: ImmutableDiscoveryPlan,
  budget: DiscoveryBudget,
  featureFlags: ReadonlySet<string>,
  config: OrchestratorConfig,
  now: Date = new Date()
): ValidationResult {
  // Check TTL
  const planAge = now.getTime() - plan.createdAt.getTime();
  if (planAge > config.planTtlMs) {
    return {
      valid: false,
      reason: `Plan expired (age: ${Math.round(planAge / 1000)}s, ttl: ${config.planTtlMs / 1000}s)`
    };
  }

  // Check feature flag
  if (!featureFlags.has("ai_discovery")) {
    return { valid: false, reason: "Feature flag 'ai_discovery' is disabled" };
  }

  // Check budget availability
  const remainingCalls = budget.maxApiCalls - budget.currentUsage.apiCallsUsed;
  if (remainingCalls < plan.budget.totalApiCalls) {
    return {
      valid: false,
      reason: `Insufficient budget: need ${plan.budget.totalApiCalls}, available ${remainingCalls}`
    };
  }

  // Check plan has sources
  if (plan.sources.length === 0) {
    return { valid: false, reason: "Plan has no sources" };
  }

  return { valid: true };
}

// ── Job Factory ─────────────────────────────────────────────
//
// Per A2.2: expand a plan into concrete jobs.
// One job per source (provider). Multiple jobs if plan spans multiple regions.

export interface DiscoveryJobFactory {
  createJobs(plan: ImmutableDiscoveryPlan, config: OrchestratorConfig): DiscoveryJob[];
}

export function createJobsFromPlan(
  plan: ImmutableDiscoveryPlan,
  config: OrchestratorConfig
): DiscoveryJob[] {
  const jobs: DiscoveryJob[] = [];
  const now = new Date();

  // Create one job per source × region combination
  for (const source of plan.sources) {
    for (const region of plan.regions) {
      if (jobs.length >= config.maxJobsPerPlan) break;

      // Calculate calls for this job (proportional to source allocation)
      const sourceCalls = plan.budget.perSource[source.providerCode] ?? 0;
      const regionCalls = plan.budget.perRegion[region] ?? sourceCalls;
      const jobCalls = Math.min(sourceCalls, regionCalls);

      if (jobCalls <= 0) continue;

      // Determine job type from plan name prefix
      const jobType: DiscoveryJobType = plan.name.startsWith("trending")
        ? "trending"
        : plan.name.startsWith("category_scan")
          ? "category_scan"
          : plan.name.startsWith("keyword_search")
            ? "keyword_search"
            : "trending";

      const job: DiscoveryJob = {
        id: `job_${plan.id}_${source.providerCode}_${region}` as DiscoveryJobId,
        type: jobType,
        providerCode: source.providerCode,
        category: plan.categories[0],
        region,
        language: plan.languages[0] ?? "en",
        cursor: undefined,
        parentPlanId: plan.id,
        sequenceNumber: jobs.length + 1,
        priority: plan.priority.overall,
        status: "pending",
        attempts: 0,
        maxAttempts: config.maxRetries,
        createdAt: now,
        startedAt: undefined,
        completedAt: undefined,
        lastError: undefined,
        result: undefined
      };

      jobs.push(job);
    }
  }

  return jobs;
}

// ── Orchestrator ────────────────────────────────────────────

export interface OrchestratorDependencies {
  planRepository: DiscoveryPlanRepository;
  jobRepository: DiscoveryJobRepository;
  checkpointRepository: CheckpointRepository;
  executionRegistry: ExecutionRegistry;
  budgetReservation: BudgetReservationService;
  eventPublisher: OrchestratorEventPublisher;
  config: OrchestratorConfig;
}

export async function orchestratePlan(
  input: OrchestratorInput,
  deps: OrchestratorDependencies
): Promise<OrchestratorResult> {
  const start = Date.now();
  const { plan, budget, featureFlags } = input;
  const config = deps.config;
  const reasons: Record<string, number> = {};

  const metrics: OrchestratorMetrics = {
    plansReceived: 1,
    plansExpired: 0,
    plansScheduled: 0,
    plansCancelled: 0,
    jobsCreated: 0,
    jobsPerPlan: 0,
    budgetReserved: 0,
    budgetRejected: 0,
    orchestrationDurationMs: 0,
    reasons
  };

  // 1. Idempotency check — has this plan already been executed?
  const alreadyExecuted = await deps.executionRegistry.isExecuted(plan.planHash);
  if (alreadyExecuted) {
    reasons["already_executed"] = (reasons["already_executed"] ?? 0) + 1;
    metrics.plansCancelled = 1;
    return {
      jobs: [],
      planStatus: "cancelled",
      budgetReserved: false,
      metrics,
      durationMs: Date.now() - start
    };
  }

  // 2. Validate plan
  const validation = validatePlan(plan, budget, featureFlags, config);
  if (!validation.valid) {
    if (validation.reason?.includes("expired")) {
      metrics.plansExpired = 1;
      reasons["expired"] = 1;
      await deps.eventPublisher.publishPlanExpired(plan.id, validation.reason);
      await deps.planRepository.updateStatus(plan.id, "expired");
      return {
        jobs: [],
        planStatus: "expired",
        budgetReserved: false,
        metrics,
        durationMs: Date.now() - start
      };
    }
    reasons[validation.reason ?? "validation_failed"] = 1;
    metrics.plansCancelled = 1;
    return {
      jobs: [],
      planStatus: "cancelled",
      budgetReserved: false,
      metrics,
      durationMs: Date.now() - start
    };
  }

  // 3. Reserve budget
  const reservation = await deps.budgetReservation.reserve(plan.id, plan.budget);
  if (!reservation.reserved) {
    metrics.budgetRejected = 1;
    reasons["budget_rejected"] = 1;
    await deps.eventPublisher.publishBudgetRejected(
      plan.id,
      reservation.reason ?? "Budget reservation failed"
    );
    return {
      jobs: [],
      planStatus: "cancelled",
      budgetReserved: false,
      metrics,
      durationMs: Date.now() - start
    };
  }
  metrics.budgetReserved = 1;

  // 4. Expand plan into jobs
  const jobs = createJobsFromPlan(plan, config);
  metrics.jobsCreated = jobs.length;
  metrics.jobsPerPlan = jobs.length;

  // 5. Persist jobs
  if (jobs.length > 0) {
    await deps.jobRepository.saveBatch(jobs);
  }

  // 6. Create initial checkpoints
  for (const job of jobs) {
    const checkpoint: DiscoveryCheckpoint = {
      id: `chk_${job.id}` as never,
      jobId: job.id,
      providerCode: job.providerCode,
      category: job.category,
      cursor: "",
      page: 0,
      itemsProcessed: 0,
      lastUpdatedAt: new Date()
    };
    await deps.checkpointRepository.save(checkpoint);
  }

  // 7. Mark plan as scheduled
  await deps.planRepository.updateStatus(plan.id, "scheduled");
  metrics.plansScheduled = 1;

  // 8. Mark as executed (idempotency)
  const executionId = `exec_${plan.id}_${Date.now()}`;
  await deps.executionRegistry.markExecuted(plan.planHash, executionId);

  // 9. Publish events
  await deps.eventPublisher.publishPlanScheduled(
    plan.id,
    jobs.map((j) => j.id)
  );
  for (const job of jobs) {
    await deps.eventPublisher.publishJobCreated(job);
  }

  metrics.orchestrationDurationMs = Date.now() - start;

  return {
    jobs,
    planStatus: "scheduled",
    budgetReserved: true,
    metrics,
    durationMs: Date.now() - start
  };
}
