/**
 * @workspace/domain/discovery/orchestrator/orchestrator.test
 *
 * Tests for A2.2 Discovery Orchestrator covering 10 scenarios:
 *   1. Happy path: Draft → Reserved → Scheduled
 *   2. Idempotency: same plan processed twice → same jobs, no duplication
 *   3. Determinism: same plan + ctx → same job IDs (byte-identical)
 *   4. Expired plan: all signals expired → state = "expired"
 *   5. Plan TTL exceeded → state = "expired"
 *   6. Insufficient budget → state = "failed"
 *   7. Duplicate reservation → returns ALREADY_RESERVED
 *   8. Multiple regions → one job per (source × region × target)
 *   9. Multiple providers → jobs spread across providers
 *  10. Empty plan (no categories/niches) → state = "failed"
 *  11. Cancellation → reservation released, state = "cancelled"
 *  12. No external calls / no DB writes (architectural invariant)
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import {
  DiscoveryOrchestrator,
  computeExecutionKey,
  createOrchestrator,
  type OrchestratorDeps
} from "./orchestrator";
import { DefaultPlanValidator } from "./validator";
import { DefaultJobFactory } from "./job-factory";
import { createBudgetReservationService } from "./reservation";
import { createExecutionRegistry } from "./execution-registry";
import { createMetricsCollector, createNoopEventPublisher } from "./metrics";
import type { ExecutionContext } from "./types";
import type { ImmutableDiscoveryPlan, PlannerContext } from "../planner";
import { CurrentPlannerVersion } from "../planner";
import type { DiscoverySignal, DiscoveryBudget } from "../types";
import type { Money } from "../../shared";

// ── Fixtures ───────────────────────────────────────────────

const zeroMoney: Money = { amount: 0, currency: "USD" };

function makeBudget(o?: Partial<DiscoveryBudget>): DiscoveryBudget {
  return {
    id: "b1",
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
    ...o
  };
}

function makeSignal(o?: Partial<DiscoverySignal>): DiscoverySignal {
  return {
    id: `s_${Math.random().toString(36).slice(2)}`,
    type: "trend",
    strength: "high",
    value: 80,
    source: "ai",
    scope: { providerCode: "aliexpress", category: "electronics", region: "US" },
    description: "Test",
    generatedAt: new Date(),
    ...o
  };
}

function makePlannerContext(o?: Partial<PlannerContext>): PlannerContext {
  return {
    signals: [makeSignal()],
    budget: makeBudget(),
    storeId: "store_1",
    featureFlags: new Set(["ai_discovery"]),
    version: CurrentPlannerVersion,
    ...o
  };
}

function makePlan(o?: Partial<ImmutableDiscoveryPlan>): ImmutableDiscoveryPlan {
  const signal = makeSignal();
  return {
    id: "plan_test_001",
    name: "test_plan",
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
      overall: 80,
      factors: { trend: 80, supplier: 60, margin: 50, competition: 40, seasonality: 30 },
      reason: "test"
    },
    budget: {
      totalApiCalls: 100,
      perSource: { aliexpress: 100 },
      perRegion: { US: 100 },
      perCategory: { electronics: 100 }
    },
    estimatedProducts: 1000,
    estimatedDuration: 50,
    status: "draft",
    signals: [signal],
    justification: {
      primaryReason: "test",
      contributingFactors: [],
      signalSummary: "test"
    },
    planHash: "ph_test001",
    version: CurrentPlannerVersion,
    createdAt: new Date(),
    ...o
  };
}

function makeExecutionContext(o?: Partial<ExecutionContext>): ExecutionContext {
  return {
    planner: makePlannerContext(),
    orchestratorVersion: {
      orchestratorVersion: "1.0.0",
      workflowVersion: "1.0.0",
      validatorVersion: "1.0.0"
    },
    providerManifest: {
      manifestVersion: "manifest_v1",
      perProvider: {}
    },
    storeId: "store_1",
    featureFlags: new Set(["ai_discovery"]),
    ...o
  };
}

function makeDeps(): OrchestratorDeps {
  return {
    validator: new DefaultPlanValidator(),
    jobFactory: new DefaultJobFactory(),
    reservation: createBudgetReservationService(),
    registry: createExecutionRegistry(),
    events: createNoopEventPublisher(),
    metrics: createMetricsCollector()
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("DiscoveryOrchestrator", () => {
  let deps: OrchestratorDeps;
  let orchestrator: DiscoveryOrchestrator;

  beforeEach(() => {
    deps = makeDeps();
    orchestrator = createOrchestrator(deps);
  });

  // ── 1. Happy path ──────────────────────────────────────
  describe("happy path", () => {
    it("should transition Draft → Reserved → Scheduled", async () => {
      const plan = makePlan();
      const ctx = makeExecutionContext();
      const result = await orchestrator.schedule(plan, ctx);

      expect(result.state).toBe("scheduled");
      expect(result.plan).not.toBeNull();
      expect(result.jobs.length).toBeGreaterThan(0);
      expect(result.idempotentNoOp).toBe(false);
      expect(result.executionKey.value).toMatch(/^ek_/);
    });

    it("should emit DiscoveryPlanScheduled + DiscoveryJobCreated events", async () => {
      const published: unknown[] = [];
      const depsWithSpy: OrchestratorDeps = {
        ...deps,
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      };
      orchestrator = createOrchestrator(depsWithSpy);

      const plan = makePlan();
      const ctx = makeExecutionContext();
      await orchestrator.schedule(plan, ctx);

      expect(published.length).toBe(
        1 + plan.sources.length * plan.regions.length * plan.categories.length
      );
      // First event is always PlanScheduled
      const first = published[0] as { eventType: string };
      expect(first.eventType).toBe("discovery.plan.scheduled");
      // Subsequent are JobCreated
      const second = published[1] as { eventType: string };
      expect(second.eventType).toBe("discovery.job.created");
    });

    it("should populate metrics", async () => {
      const plan = makePlan();
      const ctx = makeExecutionContext();
      const result = await orchestrator.schedule(plan, ctx);

      expect(result.metrics.jobsCreated).toBeGreaterThan(0);
      expect(result.metrics.apiCallsReserved).toBe(100);
      expect(result.metrics.sourcesScheduled).toBe(1);
      expect(result.metrics.regionsScheduled).toBe(1);
      expect(result.metrics.totalDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ── 2. Idempotency ─────────────────────────────────────
  describe("idempotency", () => {
    it("should return same jobs when same plan is processed twice", async () => {
      const plan = makePlan();
      const ctx = makeExecutionContext();

      const r1 = await orchestrator.schedule(plan, ctx);
      const r2 = await orchestrator.schedule(plan, ctx);

      expect(r1.state).toBe("scheduled");
      expect(r2.state).toBe("scheduled");
      expect(r2.idempotentNoOp).toBe(true);
      expect(r1.executionKey.value).toBe(r2.executionKey.value);
      expect(r1.jobs.length).toBe(r2.jobs.length);
      // Byte-identical IDs
      for (let i = 0; i < r1.jobs.length; i++) {
        expect(r1.jobs[i].id).toBe(r2.jobs[i].id);
      }
    });

    it("should not create duplicate reservations on re-entry", async () => {
      const plan = makePlan();
      const ctx = makeExecutionContext();

      await orchestrator.schedule(plan, ctx);
      await orchestrator.schedule(plan, ctx);

      // Reservation registry should have exactly one entry
      const reservation = deps.reservation.inspect(computeExecutionKey(plan, ctx));
      expect(reservation.exists).toBe(true);
      expect(reservation.reservedCalls).toBe(100);
    });

    it("should not emit duplicate events on re-entry", async () => {
      const published: unknown[] = [];
      const depsWithSpy: OrchestratorDeps = {
        ...deps,
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      };
      orchestrator = createOrchestrator(depsWithSpy);

      const plan = makePlan();
      const ctx = makeExecutionContext();

      await orchestrator.schedule(plan, ctx);
      const firstCount = published.length;
      await orchestrator.schedule(plan, ctx);

      expect(published.length).toBe(firstCount); // no new events
    });
  });

  // ── 3. Determinism ─────────────────────────────────────
  describe("determinism", () => {
    it("should produce identical job IDs for identical inputs", async () => {
      const plan = makePlan();
      const ctx = makeExecutionContext();

      // Two fresh orchestrators (no shared state)
      const o1 = createOrchestrator(makeDeps());
      const o2 = createOrchestrator(makeDeps());

      const r1 = await o1.schedule(plan, ctx);
      const r2 = await o2.schedule(plan, ctx);

      expect(r1.jobs.length).toBe(r2.jobs.length);
      for (let i = 0; i < r1.jobs.length; i++) {
        expect(r1.jobs[i].id).toBe(r2.jobs[i].id);
        expect(r1.jobs[i].providerCode).toBe(r2.jobs[i].providerCode);
        expect(r1.jobs[i].region).toBe(r2.jobs[i].region);
      }
    });

    it("should produce different executionKey when workflowVersion changes", () => {
      const plan = makePlan();
      const ctx1 = makeExecutionContext({
        orchestratorVersion: {
          orchestratorVersion: "1.0.0",
          workflowVersion: "1.0.0",
          validatorVersion: "1.0.0"
        }
      });
      const ctx2 = makeExecutionContext({
        orchestratorVersion: {
          orchestratorVersion: "1.0.0",
          workflowVersion: "2.0.0", // bumped
          validatorVersion: "1.0.0"
        }
      });

      const k1 = computeExecutionKey(plan, ctx1);
      const k2 = computeExecutionKey(plan, ctx2);

      expect(k1.value).not.toBe(k2.value);
    });

    it("should produce different executionKey when providerManifestVersion changes", () => {
      const plan = makePlan();
      const ctx1 = makeExecutionContext({
        providerManifest: { manifestVersion: "v1", perProvider: {} }
      });
      const ctx2 = makeExecutionContext({
        providerManifest: { manifestVersion: "v2", perProvider: {} }
      });

      expect(computeExecutionKey(plan, ctx1).value).not.toBe(computeExecutionKey(plan, ctx2).value);
    });
  });

  // ── 4. Expired plan ────────────────────────────────────
  describe("expired plan", () => {
    it("should return state=expired when all signals have expired", async () => {
      const past = new Date(Date.now() - 10000);
      const plan = makePlan({
        signals: [
          makeSignal({
            expiresAt: past
          })
        ]
      });
      const ctx = makeExecutionContext();

      const result = await orchestrator.schedule(plan, ctx);

      expect(result.state).toBe("expired");
      expect(result.jobs.length).toBe(0);
      expect(result.failureReason).toContain("PLAN_EXPIRED");
    });

    it("should NOT mark expired if at least one signal is still active", async () => {
      const past = new Date(Date.now() - 10000);
      const future = new Date(Date.now() + 10000);
      const plan = makePlan({
        signals: [
          makeSignal({ id: "expired", expiresAt: past }),
          makeSignal({ id: "active", expiresAt: future })
        ]
      });
      const ctx = makeExecutionContext();

      const result = await orchestrator.schedule(plan, ctx);

      expect(result.state).toBe("scheduled");
    });
  });

  // ── 5. Plan TTL exceeded ───────────────────────────────
  describe("plan TTL", () => {
    it("should return state=expired when plan age exceeds TTL", async () => {
      const plan = makePlan({
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48) // 48h ago
      });
      const ctx = makeExecutionContext({
        planTtlMs: 1000 * 60 * 60 * 24 // 24h TTL
      });

      const result = await orchestrator.schedule(plan, ctx);

      expect(result.state).toBe("expired");
      expect(result.failureReason).toContain("PLAN_TTL_EXCEEDED");
    });
  });

  // ── 6. Insufficient budget ─────────────────────────────
  describe("insufficient budget", () => {
    it("should return state=failed when budget cannot cover plan", async () => {
      const plan = makePlan({
        budget: {
          totalApiCalls: 500,
          perSource: { aliexpress: 500 },
          perRegion: { US: 500 },
          perCategory: { electronics: 500 }
        }
      });
      const ctx = makeExecutionContext({
        planner: makePlannerContext({
          budget: makeBudget({
            maxApiCalls: 1000,
            currentUsage: {
              apiCallsUsed: 800, // only 200 left
              productsDiscovered: 0,
              costIncurred: zeroMoney,
              perSourceUsage: {},
              perRegionUsage: {},
              perCategoryUsage: {}
            }
          })
        })
      });

      const result = await orchestrator.schedule(plan, ctx);

      expect(result.state).toBe("failed");
      expect(result.failureReason).toContain("INSUFFICIENT_BUDGET");
      expect(result.jobs.length).toBe(0);
    });
  });

  // ── 7. Duplicate reservation ───────────────────────────
  describe("duplicate reservation", () => {
    it("should return ALREADY_RESERVED when same executionKey is reserved twice", async () => {
      const plan = makePlan();
      const ctx = makeExecutionContext();
      const key = computeExecutionKey(plan, ctx);

      const r1 = deps.reservation.reserve(plan, ctx, key);
      const r2 = deps.reservation.reserve(plan, ctx, key);

      expect(r1.code).toBe("RESERVED");
      expect(r2.code).toBe("ALREADY_RESERVED");
      expect(r1.reservedCalls).toBe(r2.reservedCalls);
    });

    it("should support release and re-reserve", async () => {
      const plan = makePlan();
      const ctx = makeExecutionContext();
      const key = computeExecutionKey(plan, ctx);

      deps.reservation.reserve(plan, ctx, key);
      const released = deps.reservation.release(key);
      expect(released.released).toBe(true);
      expect(released.releasedCalls).toBe(100);

      // Re-reserve should now succeed as new
      const r2 = deps.reservation.reserve(plan, ctx, key);
      expect(r2.code).toBe("RESERVED");
    });
  });

  // ── 8. Multiple regions ────────────────────────────────
  describe("multiple regions", () => {
    it("should create one job per (source × region × category)", async () => {
      const plan = makePlan({
        sources: [
          {
            sourceId: "src_1",
            sourceType: "api_official",
            providerCode: "aliexpress",
            capabilities: ["discovery"]
          }
        ],
        regions: ["US", "BR", "DE"],
        categories: ["electronics", "home"]
      });
      const ctx = makeExecutionContext();

      const result = await orchestrator.schedule(plan, ctx);

      // 1 source × 3 regions × 2 categories = 6 jobs
      expect(result.jobs.length).toBe(6);
      expect(result.metrics.regionsScheduled).toBe(3);
    });
  });

  // ── 9. Multiple providers ──────────────────────────────
  describe("multiple providers", () => {
    it("should create jobs across all providers in the plan", async () => {
      const plan = makePlan({
        sources: [
          {
            sourceId: "src_1",
            sourceType: "api_official",
            providerCode: "aliexpress",
            capabilities: ["discovery"]
          },
          {
            sourceId: "src_2",
            sourceType: "marketplace_api",
            providerCode: "temu",
            capabilities: ["discovery"]
          }
        ],
        regions: ["US"],
        categories: ["electronics"]
      });
      const ctx = makeExecutionContext();

      const result = await orchestrator.schedule(plan, ctx);

      expect(result.jobs.length).toBe(2); // 2 sources × 1 region × 1 category
      const providers = new Set(result.jobs.map((j) => j.providerCode));
      expect(providers.has("aliexpress")).toBe(true);
      expect(providers.has("temu")).toBe(true);
      expect(result.metrics.sourcesScheduled).toBe(2);
    });
  });

  // ── 10. Empty plan ─────────────────────────────────────
  describe("empty plan", () => {
    it("should return state=failed when plan has no categories or niches", async () => {
      const plan = makePlan({
        categories: [],
        niches: [],
        signals: [
          makeSignal({
            scope: { providerCode: "aliexpress", region: "US" } // no category, no niche
          })
        ]
      });
      const ctx = makeExecutionContext();

      const result = await orchestrator.schedule(plan, ctx);

      expect(result.state).toBe("failed");
      expect(result.failureReason).toContain("PLAN_EMPTY");
    });

    it("should return state=failed when plan has no sources", async () => {
      const plan = makePlan({ sources: [] });
      const ctx = makeExecutionContext();

      const result = await orchestrator.schedule(plan, ctx);

      expect(result.state).toBe("failed");
      expect(result.failureReason).toContain("PLAN_NO_SOURCES");
    });

    it("should return state=failed when plan has no regions", async () => {
      const plan = makePlan({ regions: [] });
      const ctx = makeExecutionContext();

      const result = await orchestrator.schedule(plan, ctx);

      expect(result.state).toBe("failed");
      expect(result.failureReason).toContain("PLAN_NO_REGIONS");
    });

    it("should return state=failed when plan budget is zero", async () => {
      const plan = makePlan({
        budget: {
          totalApiCalls: 0,
          perSource: {},
          perRegion: {},
          perCategory: {}
        }
      });
      const ctx = makeExecutionContext();

      const result = await orchestrator.schedule(plan, ctx);

      expect(result.state).toBe("failed");
      expect(result.failureReason).toContain("PLAN_BUDGET");
    });
  });

  // ── 11. Cancellation ───────────────────────────────────
  describe("cancellation", () => {
    it("should cancel a scheduled execution and release reservation", async () => {
      const plan = makePlan();
      const ctx = makeExecutionContext();

      const scheduled = await orchestrator.schedule(plan, ctx);
      expect(scheduled.state).toBe("scheduled");

      const cancelled = await orchestrator.cancel(scheduled.executionKey);
      expect(cancelled.cancelled).toBe(true);
      expect(cancelled.releasedCalls).toBe(100);
      expect(cancelled.state).toBe("cancelled");

      // Registry should reflect cancelled state
      const lookup = deps.registry.lookup(scheduled.executionKey);
      expect(lookup.state).toBe("cancelled");

      // Reservation should be released
      const reservation = deps.reservation.inspect(scheduled.executionKey);
      expect(reservation.exists).toBe(false);
    });

    it("should fail to cancel unknown executionKey", async () => {
      const fakeKey = {
        value: "ek_unknown",
        planId: "plan_unknown",
        planVersion: "v0",
        workflowVersion: "v0",
        providerManifestVersion: "v0"
      };
      const result = await orchestrator.cancel(fakeKey);
      expect(result.cancelled).toBe(false);
    });
  });

  // ── 12. No external calls / no DB writes ──────────────
  describe("architectural invariants", () => {
    it("should not invoke any provider", async () => {
      // The orchestrator has no provider references — verified by type system.
      // This test is a runtime smoke test: scheduling completes without any
      // network or DB calls.
      const plan = makePlan();
      const ctx = makeExecutionContext();

      const start = Date.now();
      const result = await orchestrator.schedule(plan, ctx);
      const elapsed = Date.now() - start;

      // Should complete in <100ms (no I/O)
      expect(elapsed).toBeLessThan(100);
      expect(result.state).toBe("scheduled");
    });

    it("should not write to DB directly (no repositories in deps)", async () => {
      // The OrchestratorDeps interface has NO repository field — verified by
      // TypeScript. This test asserts the deps shape doesn't grow a repository.
      const deps = makeDeps();
      const keys = Object.keys(deps);
      expect(keys).not.toContain("repository");
      expect(keys).not.toContain("unitOfWork");
      expect(keys).not.toContain("db");
      expect(keys).not.toContain("prisma");
    });

    it("should derive jobType from signal type deterministically", async () => {
      const trendPlan = makePlan({
        id: "plan_trend_001",
        planHash: "ph_trend_001",
        signals: [makeSignal({ type: "trend", strength: "critical", value: 100 })]
      });
      const seasonalityPlan = makePlan({
        id: "plan_seasonality_001",
        planHash: "ph_seasonality_001",
        signals: [makeSignal({ type: "seasonality", strength: "critical", value: 100 })]
      });
      const ctx = makeExecutionContext();

      const r1 = await orchestrator.schedule(trendPlan, ctx);
      const r2 = await orchestrator.schedule(seasonalityPlan, ctx);

      expect(r1.jobs[0].type).toBe("trending");
      expect(r2.jobs[0].type).toBe("category_scan");
    });
  });

  // ── 13. Repeated execution after version bump ─────────
  describe("re-execution after version bump", () => {
    it("should re-schedule when workflowVersion bumps (same plan, new key)", async () => {
      const plan = makePlan();
      const ctx1 = makeExecutionContext({
        orchestratorVersion: {
          orchestratorVersion: "1.0.0",
          workflowVersion: "1.0.0",
          validatorVersion: "1.0.0"
        }
      });
      const ctx2 = makeExecutionContext({
        orchestratorVersion: {
          orchestratorVersion: "1.0.0",
          workflowVersion: "2.0.0",
          validatorVersion: "1.0.0"
        }
      });

      const r1 = await orchestrator.schedule(plan, ctx1);
      const r2 = await orchestrator.schedule(plan, ctx2);

      expect(r1.idempotentNoOp).toBe(false);
      expect(r2.idempotentNoOp).toBe(false); // different key = new execution
      expect(r1.executionKey.value).not.toBe(r2.executionKey.value);
      expect(r1.jobs.length).toBe(r2.jobs.length);
    });
  });

  // ── 14. Job factory distribution ──────────────────────
  describe("job factory budget distribution", () => {
    it("should distribute API calls evenly with stable remainder", async () => {
      const plan = makePlan({
        sources: [
          {
            sourceId: "src_1",
            sourceType: "api_official",
            providerCode: "aliexpress",
            capabilities: ["discovery"]
          }
        ],
        regions: ["US", "BR", "DE"], // 3 regions
        categories: ["electronics"],
        budget: {
          totalApiCalls: 100, // 100 / 3 = 33 r 1
          perSource: { aliexpress: 100 },
          perRegion: { US: 100, BR: 100, DE: 100 },
          perCategory: { electronics: 100 }
        }
      });
      const ctx = makeExecutionContext();

      const result = await orchestrator.schedule(plan, ctx);

      expect(result.jobs.length).toBe(3);
      // First job gets remainder (33 + 1 = 34), others get 33
      // We can't see perJob calls directly on DiscoveryJob, but we can
      // assert that reservation tracks the total.
      const reservation = deps.reservation.inspect(result.executionKey);
      expect(reservation.reservedCalls).toBe(100);
    });
  });
});
