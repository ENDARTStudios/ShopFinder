/**
 * Discovery Planner — transforms Signals into prioritized Plans.
 * Deterministic, idempotent, budget-aware. Does NOT execute anything.
 */
import type {
  DiscoverySignal,
  DiscoveryBudget,
  DiscoveryBudgetAllocation,
  DiscoveryJobType,
  SignalStrength,
  DiscoveryPlan
} from "./types";

export interface PlannerVersion {
  readonly plannerVersion: string;
  readonly policyVersion: string;
  readonly budgetVersion: string;
}
export const CurrentPlannerVersion: PlannerVersion = {
  plannerVersion: "1.0.0",
  policyVersion: "1.0.0",
  budgetVersion: "1.0.0"
};

export interface PlannerConfig {
  readonly maxPlansPerRun: number;
  readonly minSignalStrength: SignalStrength;
  readonly defaultJobType: DiscoveryJobType;
  readonly defaultRegion: string;
  readonly defaultLanguage: string;
  readonly maxProductsPerPlan: number;
  readonly signalTtlMs: number;
}
export const DefaultPlannerConfig: PlannerConfig = {
  maxPlansPerRun: 50,
  minSignalStrength: "medium",
  defaultJobType: "trending",
  defaultRegion: "US",
  defaultLanguage: "en",
  maxProductsPerPlan: 500,
  signalTtlMs: 86400000
};

export interface PlannerContext {
  readonly signals: ReadonlyArray<DiscoverySignal>;
  readonly budget: DiscoveryBudget;
  readonly storeId: string;
  readonly featureFlags: ReadonlySet<string>;
  readonly version: PlannerVersion;
}
export interface ExplainablePriority {
  readonly overall: number;
  readonly factors: {
    trend: number;
    supplier: number;
    margin: number;
    competition: number;
    seasonality: number;
  };
  readonly reason: string;
}
export interface PlanJustification {
  readonly primaryReason: string;
  readonly contributingFactors: string[];
  readonly signalSummary: string;
}
export interface ImmutableDiscoveryPlan {
  readonly id: string;
  readonly name: string;
  readonly sources: ReadonlyArray<{
    sourceId: string;
    sourceType: string;
    providerCode: string;
    capabilities: string[];
  }>;
  readonly categories: string[];
  readonly regions: string[];
  readonly languages: string[];
  readonly niches: string[];
  readonly priority: ExplainablePriority;
  readonly budget: DiscoveryBudgetAllocation;
  readonly estimatedProducts: number;
  readonly estimatedDuration: number;
  readonly status: "draft";
  readonly signals: DiscoverySignal[];
  readonly justification: PlanJustification;
  readonly planHash: string;
  readonly version: PlannerVersion;
  readonly createdAt: Date;
}
export interface PlannerSkipped {
  readonly signal: DiscoverySignal;
  readonly reason: string;
}
export interface PlannerMetrics {
  readonly signalsProcessed: number;
  readonly signalsDiscarded: number;
  readonly plansCreated: number;
  readonly plansRejected: number;
  readonly budgetConsumed: number;
  readonly averagePriority: number;
  readonly planningDurationMs: number;
  readonly discardedReasons: Record<string, number>;
}
export interface PlannerResult {
  readonly plans: ImmutableDiscoveryPlan[];
  readonly skipped: PlannerSkipped[];
  readonly budgetUsed: DiscoveryBudgetAllocation;
  readonly metrics: PlannerMetrics;
  readonly durationMs: number;
  readonly version: PlannerVersion;
}

const STRENGTH_WEIGHT: Record<SignalStrength, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export function filterExpiredSignals(
  signals: ReadonlyArray<DiscoverySignal>,
  ttlMs: number,
  now = new Date()
): { active: DiscoverySignal[]; expired: DiscoverySignal[] } {
  const active: DiscoverySignal[] = [];
  const expired: DiscoverySignal[] = [];
  const cutoff = now.getTime() - ttlMs;
  for (const s of signals) {
    const exp = s.expiresAt?.getTime() ?? s.generatedAt.getTime() + ttlMs;
    if (exp < now.getTime() || s.generatedAt.getTime() < cutoff) expired.push(s);
    else active.push(s);
  }
  return { active, expired };
}

export function deduplicateSignals(signals: ReadonlyArray<DiscoverySignal>): DiscoverySignal[] {
  const seen = new Set<string>();
  const result: DiscoverySignal[] = [];
  for (const s of signals) {
    const key = `${s.type}:${s.scope.providerCode ?? ""}:${s.scope.category ?? ""}:${s.scope.region ?? ""}:${s.scope.niche ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(s);
    }
  }
  return result;
}

export function prioritizeSignals(
  signals: ReadonlyArray<DiscoverySignal>,
  config: PlannerConfig
): Array<{ signal: DiscoverySignal; rawPriority: number }> {
  const minW = STRENGTH_WEIGHT[config.minSignalStrength] ?? 2;
  return signals
    .filter((s) => STRENGTH_WEIGHT[s.strength] >= minW)
    .map((s) => ({
      signal: s,
      rawPriority: Math.round(STRENGTH_WEIGHT[s.strength] * 25 + (s.value / 100) * 75)
    }))
    .sort((a, b) => b.rawPriority - a.rawPriority);
}

export function explainPriority(signal: DiscoverySignal, rawPriority: number): ExplainablePriority {
  const factors = {
    trend: signal.type === "trend" ? signal.value : Math.round(signal.value * 0.6),
    supplier: signal.type === "provider_quality" ? signal.value : Math.round(signal.value * 0.7),
    margin: signal.type === "margin_opportunity" ? signal.value : Math.round(signal.value * 0.5),
    competition:
      signal.type === "competitor_activity"
        ? Math.round(100 - signal.value)
        : Math.round(signal.value * 0.4),
    seasonality: signal.type === "seasonality" ? signal.value : Math.round(signal.value * 0.3)
  };
  const topFactors = Object.entries(factors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([n, v]) => `${n}=${v}`);
  return {
    overall: rawPriority,
    factors,
    reason: `Priority ${factors.trend > 70 ? "high" : "medium"} — ${signal.description || signal.type} (top: ${topFactors.join(", ")})`
  };
}

export function computePlanHash(
  signal: DiscoverySignal,
  allocatedCalls: number,
  version: PlannerVersion
): string {
  const input = [
    signal.type,
    signal.scope.providerCode ?? "",
    signal.scope.category ?? "",
    signal.scope.region ?? "",
    signal.value,
    signal.strength,
    allocatedCalls,
    version.plannerVersion,
    version.policyVersion
  ].join("|");
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash &= hash;
  }
  return `ph_${Math.abs(hash).toString(36)}`;
}

export function buildJustification(
  signal: DiscoverySignal,
  priority: ExplainablePriority
): PlanJustification {
  const cf: string[] = [];
  if (priority.factors.trend > 70) cf.push("High trend score");
  if (priority.factors.seasonality > 70) cf.push("Seasonal demand");
  if (priority.factors.margin > 70) cf.push("Strong margin opportunity");
  if (signal.strength === "critical") cf.push("Critical signal strength");
  return {
    primaryReason: cf[0] ?? `Signal ${signal.type} value=${signal.value}`,
    contributingFactors: cf,
    signalSummary: `${signal.type} (${signal.strength}, value=${signal.value}) from ${signal.source}`
  };
}

export function allocateBudget(
  prioritized: Array<{ signal: DiscoverySignal; rawPriority: number }>,
  budget: DiscoveryBudget,
  config: PlannerConfig
): {
  allocated: Array<{ signal: DiscoverySignal; rawPriority: number; allocatedCalls: number }>;
  skipped: PlannerSkipped[];
} {
  const allocated: Array<{ signal: DiscoverySignal; rawPriority: number; allocatedCalls: number }> =
    [];
  const skipped: PlannerSkipped[] = [];
  let remCalls = budget.maxApiCalls - budget.currentUsage.apiCallsUsed;
  let remProducts = budget.maxProductsDiscovered - budget.currentUsage.productsDiscovered;
  const totalP = prioritized.reduce((s, p) => s + p.rawPriority, 0) || 1;
  for (const item of prioritized) {
    if (allocated.length >= config.maxPlansPerRun) {
      skipped.push({ signal: item.signal, reason: "Max plans reached" });
      continue;
    }
    if (remCalls <= 0) {
      skipped.push({ signal: item.signal, reason: "API budget exhausted" });
      continue;
    }
    if (remProducts <= 0) {
      skipped.push({ signal: item.signal, reason: "Product budget exhausted" });
      continue;
    }
    const calls = Math.min(
      Math.ceil((item.rawPriority / totalP) * remCalls),
      remCalls,
      config.maxProductsPerPlan
    );
    if (calls <= 0) {
      skipped.push({ signal: item.signal, reason: "No calls remaining" });
      continue;
    }
    allocated.push({ ...item, allocatedCalls: calls });
    remCalls -= calls;
    remProducts -= config.maxProductsPerPlan;
  }
  return { allocated, skipped };
}

function deriveJobType(type: string, def: DiscoveryJobType): DiscoveryJobType {
  if (type === "trend") return "trending";
  if (type === "seasonality") return "category_scan";
  if (type === "competitor_activity") return "keyword_search";
  if (type === "stock_velocity") return "inventory_sync";
  if (type === "price_volatility") return "price_sync";
  return def;
}

export function generatePlans(
  allocated: ReadonlyArray<{
    signal: DiscoverySignal;
    rawPriority: number;
    allocatedCalls: number;
  }>,
  budget: DiscoveryBudget,
  config: PlannerConfig,
  version: PlannerVersion
): ImmutableDiscoveryPlan[] {
  const plans: ImmutableDiscoveryPlan[] = [];
  for (const { signal, rawPriority, allocatedCalls } of allocated) {
    const priority = explainPriority(signal, rawPriority);
    const justification = buildJustification(signal, priority);
    const planHash = computePlanHash(signal, allocatedCalls, version);
    const providerCode = signal.scope.providerCode ?? "auto";
    const category = signal.scope.category;
    const region = signal.scope.region ?? config.defaultRegion;
    const niche = signal.scope.niche;
    plans.push({
      id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: `${deriveJobType(signal.type, config.defaultJobType)}_${providerCode}_${category ?? niche ?? "all"}_${region}`,
      sources: [
        {
          sourceId: `src_${providerCode}`,
          sourceType: "api_official",
          providerCode,
          capabilities: ["discovery"]
        }
      ],
      categories: category ? [category] : [],
      regions: [region],
      languages: [config.defaultLanguage],
      niches: niche ? [niche] : [],
      priority,
      budget: {
        totalApiCalls: allocatedCalls,
        perSource: { [providerCode]: allocatedCalls },
        perRegion: { [region]: allocatedCalls },
        perCategory: category ? { [category]: allocatedCalls } : {},
        maxCost: budget.maxCost
      },
      estimatedProducts: Math.min(allocatedCalls * 10, config.maxProductsPerPlan),
      estimatedDuration: Math.ceil(allocatedCalls * 0.5),
      status: "draft",
      signals: [signal],
      justification,
      planHash,
      version,
      createdAt: new Date()
    });
  }
  return plans;
}

export function planDiscovery(
  ctx: PlannerContext,
  config: PlannerConfig = DefaultPlannerConfig
): PlannerResult {
  const start = Date.now();
  const version = ctx.version;
  const { active, expired } = filterExpiredSignals(ctx.signals, config.signalTtlMs);
  const dedup = deduplicateSignals(active);
  const dedupRemoved = active.length - dedup.length;
  const prioritized = prioritizeSignals(dedup, config);
  const filtered = dedup.length - prioritized.length;
  const { allocated, skipped } = allocateBudget(prioritized, ctx.budget, config);
  const plans = generatePlans(allocated, ctx.budget, config, version);
  const totalAllocated = plans.reduce((s, p) => s + p.budget.totalApiCalls, 0);
  const budgetUsed: DiscoveryBudgetAllocation = {
    totalApiCalls: totalAllocated,
    perSource: {},
    perRegion: {},
    perCategory: {},
    maxCost: ctx.budget.maxCost
  };
  for (const p of plans) {
    for (const [k, v] of Object.entries(p.budget.perSource))
      budgetUsed.perSource[k] = (budgetUsed.perSource[k] ?? 0) + v;
    for (const [k, v] of Object.entries(p.budget.perRegion))
      budgetUsed.perRegion[k] = (budgetUsed.perRegion[k] ?? 0) + v;
  }
  const avgPriority =
    plans.length > 0
      ? Math.round(plans.reduce((s, p) => s + p.priority.overall, 0) / plans.length)
      : 0;
  const reasons: Record<string, number> = {};
  for (const s of skipped) reasons[s.reason] = (reasons[s.reason] ?? 0) + 1;
  const metrics: PlannerMetrics = {
    signalsProcessed: ctx.signals.length,
    signalsDiscarded: expired.length + dedupRemoved + filtered + skipped.length,
    plansCreated: plans.length,
    plansRejected: skipped.length,
    budgetConsumed: totalAllocated,
    averagePriority: avgPriority,
    planningDurationMs: Date.now() - start,
    discardedReasons: reasons
  };
  return { plans, skipped, budgetUsed, metrics, durationMs: Date.now() - start, version };
}
