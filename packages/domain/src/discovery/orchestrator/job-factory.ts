/**
 * @workspace/domain/discovery/orchestrator/job-factory
 *
 * JobFactory implementation. Derives DiscoveryJob[] from a plan.
 *
 * Determinism rules:
 *   1. Job ID = `job_${executionKey}_${index}` (no random, no Date.now)
 *   2. Jobs are sorted by (source, region, category, niche, jobType)
 *   3. Same plan + same executionKey ⇒ byte-identical job array
 *
 * Distribution:
 *   - For each (source × region × category|niche) triple, create one job.
 *   - Job type is derived from the strongest signal in the plan.
 *   - API calls are distributed evenly across resulting jobs, with
 *     remainder distributed to the first N jobs (stable).
 */
import type { JobFactory } from "./interfaces";
import type { ExecutionContext, ExecutionKey, JobFactoryResult } from "./types";
import type { DiscoveryJob, DiscoveryJobId, DiscoveryJobType } from "../types";
import type { ImmutableDiscoveryPlan } from "../planner";

const STRENGTH_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

const SIGNAL_TO_JOB_TYPE: Record<string, DiscoveryJobType> = {
  trend: "trending",
  seasonality: "category_scan",
  competitor_activity: "keyword_search",
  stock_velocity: "inventory_sync",
  price_volatility: "price_sync",
  search_volume: "keyword_search",
  margin_opportunity: "category_scan",
  niche_growth: "category_scan"
};

export class DefaultJobFactory implements JobFactory {
  createJobs(
    plan: ImmutableDiscoveryPlan,
    _ctx: ExecutionContext,
    key: ExecutionKey
  ): JobFactoryResult {
    // 1. Determine primary job type from strongest signal
    const jobType = deriveJobType(plan);

    // 2. Build sort key
    const sortKey = [
      plan.sources
        .map((s) => s.providerCode)
        .sort()
        .join(","),
      plan.regions.slice().sort().join(","),
      plan.categories.slice().sort().join(","),
      plan.niches.slice().sort().join(",")
    ].join("|");

    // 3. Generate (source × region × target) triples
    const targets: Array<{ category?: string; niche?: string }> = [];
    for (const cat of plan.categories) targets.push({ category: cat });
    for (const niche of plan.niches) targets.push({ niche });
    if (targets.length === 0) targets.push({}); // fallback: scan all

    const triples: Array<{
      source: ImmutableDiscoveryPlan["sources"][number];
      region: string;
      category?: string;
      niche?: string;
    }> = [];
    for (const source of plan.sources) {
      for (const region of plan.regions) {
        for (const target of targets) {
          triples.push({ source, region, ...target });
        }
      }
    }

    // 4. Stable sort
    triples.sort((a, b) => {
      const sa = [a.source.providerCode, a.region, a.category ?? "", a.niche ?? ""].join("|");
      const sb = [b.source.providerCode, b.region, b.category ?? "", b.niche ?? ""].join("|");
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    });

    // 5. Distribute API calls evenly with stable remainder
    const totalCalls = plan.budget.totalApiCalls;
    const baseCalls = Math.floor(totalCalls / triples.length);
    const remainder = totalCalls - baseCalls * triples.length;

    // 6. Pick language (first language in plan)
    const language = plan.languages[0] ?? "en";

    // 7. Materialize jobs
    const jobs: DiscoveryJob[] = triples.map((t, i) => {
      const calls = baseCalls + (i < remainder ? 1 : 0);
      const jobId = `job_${key.value}_${i.toString().padStart(4, "0")}` as DiscoveryJobId;
      return {
        id: jobId,
        type: jobType,
        providerCode: t.source.providerCode,
        category: t.category,
        keyword: t.niche,
        region: t.region,
        language,
        cursor: undefined,
        priority: plan.priority.overall,
        status: "pending",
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(0), // epoch — determinism
        startedAt: undefined,
        completedAt: undefined,
        lastError: undefined,
        result: undefined
      };
    });

    return { jobs, deterministic: true, sortKey };
  }
}

function deriveJobType(plan: ImmutableDiscoveryPlan): DiscoveryJobType {
  if (plan.signals.length === 0) return "trending";
  const sorted = [...plan.signals].sort((a, b) => {
    const rankA = STRENGTH_RANK[a.strength] ?? 0;
    const rankB = STRENGTH_RANK[b.strength] ?? 0;
    if (rankB !== rankA) return rankB - rankA;
    return b.value - a.value;
  });
  const top = sorted[0];
  return SIGNAL_TO_JOB_TYPE[top.type] ?? "trending";
}

export function createJobFactory(): JobFactory {
  return new DefaultJobFactory();
}
