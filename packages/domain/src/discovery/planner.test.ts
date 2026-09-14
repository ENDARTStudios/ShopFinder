/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import {
  planDiscovery,
  deduplicateSignals,
  prioritizeSignals,
  DefaultPlannerConfig,
  CurrentPlannerVersion,
  type PlannerContext
} from "./planner";
import type { DiscoverySignal, DiscoveryBudget } from "./types";
import type { Money } from "../shared";

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
function makeCtx(o?: Partial<PlannerContext>): PlannerContext {
  return {
    signals: [makeSignal()],
    budget: makeBudget(),
    storeId: "s1",
    featureFlags: new Set(["ai_discovery"]),
    version: CurrentPlannerVersion,
    ...o
  };
}

describe("DiscoveryPlanner", () => {
  it("should deduplicate signals", () => {
    const s1 = makeSignal();
    const s2 = makeSignal();
    expect(deduplicateSignals([s1, s2]).length).toBe(1);
  });
  it("should keep different scope signals", () => {
    expect(
      deduplicateSignals([
        makeSignal({ scope: { providerCode: "a" } }),
        makeSignal({ scope: { providerCode: "b" } })
      ]).length
    ).toBe(2);
  });
  it("should filter low strength", () => {
    expect(
      prioritizeSignals(
        [makeSignal({ strength: "low" }), makeSignal({ strength: "high" })],
        DefaultPlannerConfig
      ).length
    ).toBe(1);
  });
  it("should sort by priority", () => {
    const r = prioritizeSignals(
      [
        makeSignal({ strength: "medium", value: 50 }),
        makeSignal({ strength: "critical", value: 90 })
      ],
      DefaultPlannerConfig
    );
    expect(r[0].rawPriority).toBeGreaterThan(r[1].rawPriority);
  });
  it("should be deterministic", () => {
    const ctx = makeCtx({
      signals: [makeSignal({ id: "s1" }), makeSignal({ id: "s2", scope: { providerCode: "temu" } })]
    });
    const r1 = planDiscovery(ctx);
    const r2 = planDiscovery(ctx);
    expect(r1.plans.length).toBe(r2.plans.length);
    expect(r1.plans[0]?.planHash).toBe(r2.plans[0]?.planHash);
  });
  it("should not create plans when budget exhausted", () => {
    const r = planDiscovery(
      makeCtx({
        budget: makeBudget({
          maxApiCalls: 100,
          currentUsage: {
            apiCallsUsed: 100,
            productsDiscovered: 10000,
            costIncurred: zeroMoney,
            perSourceUsage: {},
            perRegionUsage: {},
            perCategoryUsage: {}
          }
        })
      })
    );
    expect(r.plans.length).toBe(0);
    expect(r.skipped.length).toBe(1);
  });
  it("should produce plans with version and hash", () => {
    const r = planDiscovery(makeCtx());
    if (r.plans.length > 0) {
      expect(r.plans[0].version.plannerVersion).toBeTruthy();
      expect(r.plans[0].planHash).toMatch(/^ph_/);
    }
  });
  it("should collect metrics", () => {
    const r = planDiscovery(
      makeCtx({ signals: [makeSignal({ strength: "high" }), makeSignal({ strength: "low" })] })
    );
    expect(r.metrics.signalsProcessed).toBe(2);
    expect(r.metrics.signalsDiscarded).toBeGreaterThan(0);
  });
  it("should track budget usage", () => {
    const r = planDiscovery(
      makeCtx({
        signals: [
          makeSignal({ scope: { providerCode: "a" } }),
          makeSignal({ scope: { providerCode: "b" } })
        ],
        budget: makeBudget({ maxApiCalls: 200 })
      })
    );
    expect(r.budgetUsed.totalApiCalls).toBeLessThanOrEqual(200);
  });
});
