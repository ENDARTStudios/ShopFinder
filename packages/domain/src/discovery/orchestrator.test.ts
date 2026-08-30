/// <reference types="bun-types" />

/**
 * Discovery Orchestrator — Unit Tests
 *
 * Per A2.2 acceptance criteria: job creation, budget reservation,
 * idempotency, expired plan rejection, insufficient budget rejection,
 * event publishing, deterministic execution.
 */

import { describe, it, expect, mock } from "bun:test";
import {
  orchestratePlan,
  validatePlan,
  createJobsFromPlan,
  DefaultOrchestratorConfig,
  type OrchestratorDependencies,
  type OrchestratorInput,
  type DiscoveryPlanRepository,
  type DiscoveryJobRepository,
  type CheckpointRepository,
  type ExecutionRegistry,
  type BudgetReservationService,
  type OrchestratorEventPublisher
} from "./orchestrator";
import { type ImmutableDiscoveryPlan, type PlannerVersion, CurrentPlannerVersion } from "./planner";
import type { DiscoverySignal, DiscoveryBudget, DiscoveryJob } from "./index";
import type { Money } from "../shared";

const zeroMoney: Money = { amount: 0, currency: "USD" };

function makeBudget(overrides?: Partial<DiscoveryBudget>): DiscoveryBudget {
  return {
    id: "budget_1",
    period: "daily",
    maxApiCalls: 1000,
    maxProductsDiscovered: 10000,
    maxCost: { amount: 10000, currency: "USD" },
    currentUsage: {
      apiCallsUsed: 0,
      productsDiscovered: 0,
      costIncurred: zeroMoney,
      perSourceUsage: {},
      perRegionUsage: {},
      perCategoryUsage: {}
    },
    resetAt: new Date(Date.now() + 86400000),
    ...overrides
  };
}

function makePlan(overrides?: Partial<ImmutableDiscoveryPlan>): ImmutableDiscoveryPlan {
  return {
    id: "plan_test_001",
    name: "trending_aliexpress_electronics_US",
    sources: [
      {
        sourceId: "src_aliexpress",
        sourceType: "api_official",
        providerCode: "aliexpress",
        capabilities: ["discovery"]
      }
    ],
    categories: ["electronics"],
    regions: ["US"],
    languages: ["en"],
    niches: [],
    priority: {
      overall: 85,
      factors: { trend: 90, supplier: 75, margin: 80, competition: 60, seasonality: 70 },
      reason: "High trend — Gaming peripherals trending (top: trend=90, supplier=75)"
    },
    budget: {
      totalApiCalls: 100,
      perSource: { aliexpress: 100 },
      perRegion: { US: 100 },
      perCategory: { electronics: 100 },
      maxCost: { amount: 1000, currency: "USD" }
    },
    estimatedProducts: 500,
    estimatedDuration: 50,
    status: "draft",
    signals: [
      {
        id: "sig_1",
        type: "trend",
        strength: "high",
        value: 85,
        source: "ai",
        scope: { providerCode: "aliexpress", category: "electronics", region: "US" },
        description: "Test signal",
        generatedAt: new Date()
      } as DiscoverySignal
    ],
    justification: {
      primaryReason: "High trend score",
      contributingFactors: ["High trend score"],
      signalSummary: "trend (high, value=85) from ai"
    },
    planHash: "ph_abc123",
    version: CurrentPlannerVersion,
    createdAt: new Date(),
    ...overrides
  };
}

function makeDeps(overrides?: Partial<OrchestratorDependencies>): OrchestratorDependencies {
  const savedJobs: DiscoveryJob[] = [];
  const publishedEvents: string[] = [];
  const executedHashes = new Set<string>();

  return {
    planRepository: {
      findById: async () => null,
      findByHash: async () => null,
      save: async () => {},
      updateStatus: async () => {}
    } as DiscoveryPlanRepository,
    jobRepository: {
      save: async (job) => {
        savedJobs.push(job);
      },
      saveBatch: async (jobs) => {
        savedJobs.push(...jobs);
      },
      findById: async () => null,
      findByPlanId: async () => [],
      updateStatus: async () => {}
    } as DiscoveryJobRepository,
    checkpointRepository: {
      save: async () => {},
      findByJobId: async () => null
    } as CheckpointRepository,
    executionRegistry: {
      isExecuted: async (hash) => executedHashes.has(hash),
      markExecuted: async (hash) => {
        executedHashes.add(hash);
      },
      getExecutionId: async () => null
    } as ExecutionRegistry,
    budgetReservation: {
      reserve: async () => ({ reserved: true, allocation: {} as never }),
      release: async () => {},
      getReserved: async () => null
    } as BudgetReservationService,
    eventPublisher: {
      publishPlanScheduled: async (_id, _jobs) => {
        publishedEvents.push("plan_scheduled");
      },
      publishJobCreated: async () => {
        publishedEvents.push("job_created");
      },
      publishPlanExpired: async () => {
        publishedEvents.push("plan_expired");
      },
      publishBudgetRejected: async () => {
        publishedEvents.push("budget_rejected");
      }
    } as OrchestratorEventPublisher,
    config: DefaultOrchestratorConfig,
    ...overrides
  };
}

function makeInput(overrides?: Partial<OrchestratorInput>): OrchestratorInput {
  return {
    plan: makePlan(),
    budget: makeBudget(),
    featureFlags: new Set(["ai_discovery"]),
    ...overrides
  };
}

describe("DiscoveryOrchestrator", () => {
  describe("validatePlan", () => {
    it("should accept a valid plan", () => {
      const plan = makePlan();
      const budget = makeBudget();
      const result = validatePlan(
        plan,
        budget,
        new Set(["ai_discovery"]),
        DefaultOrchestratorConfig
      );
      expect(result.valid).toBe(true);
    });

    it("should reject expired plan", () => {
      const plan = makePlan({ createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) }); // 2h ago
      const result = validatePlan(
        plan,
        makeBudget(),
        new Set(["ai_discovery"]),
        DefaultOrchestratorConfig
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("expired");
    });

    it("should reject when feature flag disabled", () => {
      const plan = makePlan();
      const result = validatePlan(plan, makeBudget(), new Set(), DefaultOrchestratorConfig);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("ai_discovery");
    });

    it("should reject when budget insufficient", () => {
      const plan = makePlan({
        budget: {
          totalApiCalls: 500,
          perSource: {},
          perRegion: {},
          perCategory: {},
          maxCost: undefined
        }
      });
      const budget = makeBudget({
        maxApiCalls: 100,
        currentUsage: {
          apiCallsUsed: 50,
          productsDiscovered: 0,
          costIncurred: zeroMoney,
          perSourceUsage: {},
          perRegionUsage: {},
          perCategoryUsage: {}
        }
      });
      const result = validatePlan(
        plan,
        budget,
        new Set(["ai_discovery"]),
        DefaultOrchestratorConfig
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Insufficient budget");
    });

    it("should reject plan with no sources", () => {
      const plan = makePlan({ sources: [] });
      const result = validatePlan(
        plan,
        makeBudget(),
        new Set(["ai_discovery"]),
        DefaultOrchestratorConfig
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("no sources");
    });
  });

  describe("createJobsFromPlan", () => {
    it("should create one job per source × region", () => {
      const plan = makePlan({
        sources: [
          {
            sourceId: "src_a",
            sourceType: "api",
            providerCode: "aliexpress",
            capabilities: ["discovery"]
          },
          {
            sourceId: "src_b",
            sourceType: "api",
            providerCode: "temu",
            capabilities: ["discovery"]
          }
        ],
        regions: ["US", "BR"],
        budget: {
          totalApiCalls: 200,
          perSource: { aliexpress: 100, temu: 100 },
          perRegion: { US: 100, BR: 100 },
          perCategory: {},
          maxCost: undefined
        }
      });
      const jobs = createJobsFromPlan(plan, DefaultOrchestratorConfig);
      expect(jobs.length).toBe(4); // 2 sources × 2 regions
    });

    it("should respect maxJobsPerPlan", () => {
      const plan = makePlan({
        sources: Array.from({ length: 20 }, (_, i) => ({
          sourceId: `src_${i}`,
          sourceType: "api",
          providerCode: `provider_${i}`,
          capabilities: ["discovery"]
        })),
        regions: ["US"],
        budget: {
          totalApiCalls: 2000,
          perSource: Object.fromEntries(
            Array.from({ length: 20 }, (_, i) => [`provider_${i}`, 100])
          ),
          perRegion: { US: 2000 },
          perCategory: {},
          maxCost: undefined
        }
      });
      const jobs = createJobsFromPlan(plan, { ...DefaultOrchestratorConfig, maxJobsPerPlan: 5 });
      expect(jobs.length).toBe(5);
    });

    it("should set correct job type from plan name", () => {
      const plan = makePlan({ name: "category_scan_aliexpress_electronics_US" });
      const jobs = createJobsFromPlan(plan, DefaultOrchestratorConfig);
      expect(jobs[0].type).toBe("category_scan");
    });

    it("should set pending status on all jobs", () => {
      const plan = makePlan();
      const jobs = createJobsFromPlan(plan, DefaultOrchestratorConfig);
      for (const job of jobs) {
        expect(job.status).toBe("pending");
      }
    });
  });

  describe("orchestratePlan (integration)", () => {
    it("should create jobs and schedule plan", async () => {
      const deps = makeDeps();
      const input = makeInput();
      const result = await orchestratePlan(input, deps);

      expect(result.planStatus).toBe("scheduled");
      expect(result.jobs.length).toBeGreaterThan(0);
      expect(result.budgetReserved).toBe(true);
      expect(result.metrics.plansScheduled).toBe(1);
      expect(result.metrics.jobsCreated).toBe(result.jobs.length);
    });

    it("should be idempotent (reject already executed plan)", async () => {
      const executedHashes = new Set<string>(["ph_abc123"]);
      const deps = makeDeps({
        executionRegistry: {
          isExecuted: async (hash) => executedHashes.has(hash),
          markExecuted: async (hash) => {
            executedHashes.add(hash);
          },
          getExecutionId: async () => "exec_1"
        } as ExecutionRegistry
      });

      const result = await orchestratePlan(makeInput(), deps);
      expect(result.planStatus).toBe("cancelled");
      expect(result.jobs.length).toBe(0);
      expect(result.metrics.plansCancelled).toBe(1);
    });

    it("should reject expired plan", async () => {
      const input = makeInput({
        plan: makePlan({ createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) })
      });
      const deps = makeDeps();
      const result = await orchestratePlan(input, deps);

      expect(result.planStatus).toBe("expired");
      expect(result.jobs.length).toBe(0);
      expect(result.metrics.plansExpired).toBe(1);
    });

    it("should reject when budget reservation fails", async () => {
      const deps = makeDeps({
        budgetReservation: {
          reserve: async () => ({
            reserved: false,
            allocation: {} as never,
            reason: "Daily limit reached"
          }),
          release: async () => {},
          getReserved: async () => null
        } as BudgetReservationService
      });
      const result = await orchestratePlan(makeInput(), deps);

      expect(result.planStatus).toBe("cancelled");
      expect(result.jobs.length).toBe(0);
      expect(result.budgetReserved).toBe(false);
      expect(result.metrics.budgetRejected).toBe(1);
    });

    it("should reject when feature flag disabled", async () => {
      const input = makeInput({ featureFlags: new Set() });
      const deps = makeDeps();
      const result = await orchestratePlan(input, deps);

      expect(result.planStatus).toBe("cancelled");
      expect(result.jobs.length).toBe(0);
    });

    it("should track metrics", async () => {
      const deps = makeDeps();
      const result = await orchestratePlan(makeInput(), deps);

      expect(result.metrics.plansReceived).toBe(1);
      expect(result.metrics.plansScheduled).toBe(1);
      expect(result.metrics.budgetReserved).toBe(1);
      expect(result.metrics.orchestrationDurationMs).toBeGreaterThanOrEqual(0);
    });

    it("should produce deterministic jobs for same plan", async () => {
      const deps1 = makeDeps();
      const deps2 = makeDeps();
      const input = makeInput();

      const r1 = await orchestratePlan(input, deps1);
      const r2 = await orchestratePlan(input, deps2);

      // Note: idempotency would block the second run in production,
      // but here deps are independent so both run.
      expect(r1.jobs.length).toBe(r2.jobs.length);
      expect(r1.jobs[0].providerCode).toBe(r2.jobs[0].providerCode);
      expect(r1.jobs[0].region).toBe(r2.jobs[0].region);
    });
  });
});
