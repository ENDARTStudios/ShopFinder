/**
 * @workspace/domain/discovery/orchestrator/job-factory
 *
 * JobFactory implementation (A2.2 — refined).
 *
 * R2: Accepts JobFactoryInput (NOT DiscoveryPlan). A2.3 Workers can
 *     re-use this factory for re-scheduling scenarios without a
 *     Planner dependency.
 *
 * R6: Each job carries parentPlanId + sequenceNumber for debugging
 *     and traceability.
 *
 * Determinism rules:
 *   1. Job ID = `job_${planId}_${seq padded 4}_${executionKeyShort}`
 *      — readable AND deterministic.
 *   2. Jobs are sorted by (source, region, category, niche, jobType).
 *   3. Same input + same executionKey ⇒ byte-identical job array.
 *
 * Distribution:
 *   - For each (source × region × category|niche) triple, create one job.
 *   - Job type is derived from the strongest signal.
 *   - API calls are distributed evenly, with remainder distributed
 *     to the first N jobs (stable).
 */
import type { JobFactory } from "./interfaces";
import type { ExecutionContext, JobFactoryInput, JobFactoryResult } from "./types";
import type { DiscoveryJob, DiscoveryJobId, DiscoveryJobType } from "../types";

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
  createJobs(input: JobFactoryInput, _ctx: ExecutionContext): JobFactoryResult {
    // 1. Determine primary job type from strongest signal
    const jobType = deriveJobType(input.signals);

    // 2. Build sort key
    const sortKey = [
      input.sources
        .map((s) => s.providerCode)
        .sort()
        .join(","),
      input.regions.slice().sort().join(","),
      input.categories.slice().sort().join(","),
      input.niches.slice().sort().join(",")
    ].join("|");

    // 3. Generate (source × region × target) triples
    const targets: Array<{ category?: string; niche?: string }> = [];
    for (const cat of input.categories) targets.push({ category: cat });
    for (const niche of input.niches) targets.push({ niche });
    if (targets.length === 0) targets.push({}); // fallback: scan all

    const triples: Array<{
      source: JobFactoryInput["sources"][number];
      region: string;
      category?: string;
      niche?: string;
    }> = [];
    for (const source of input.sources) {
      for (const region of input.regions) {
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
    const totalCalls = input.budget.totalApiCalls;
    const baseCalls = Math.floor(totalCalls / triples.length);
    const remainder = totalCalls - baseCalls * triples.length;

    // 6. Pick language (first language in input)
    const language = input.languages[0] ?? "en";

    // 7. Materialize jobs (R6: parentPlanId + sequenceNumber)
    const execKeyShort = input.executionKey.value.slice(0, 12);
    const jobs: DiscoveryJob[] = triples.map((t, i) => {
      const calls = baseCalls + (i < remainder ? 1 : 0);
      const seqStr = i.toString().padStart(4, "0");
      const jobId = `job_${input.parentPlanId}_${seqStr}_${execKeyShort}` as DiscoveryJobId;
      return {
        id: jobId,
        type: jobType,
        providerCode: t.source.providerCode,
        category: t.category,
        keyword: t.niche,
        region: t.region,
        language,
        cursor: undefined,
        priority: input.priority.overall,
        status: "pending",
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(0), // epoch — determinism
        startedAt: undefined,
        completedAt: undefined,
        lastError: undefined,
        result: undefined,
        // R6: parentage for debugging
        parentPlanId: input.parentPlanId,
        sequenceNumber: i,
        // Cross-cutting traceability
        traceId: input.traceId
      };
    });

    return { jobs, deterministic: true, sortKey };
  }
}

function deriveJobType(signals: JobFactoryInput["signals"]): DiscoveryJobType {
  if (signals.length === 0) return "trending";
  const sorted = [...signals].sort((a, b) => {
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
