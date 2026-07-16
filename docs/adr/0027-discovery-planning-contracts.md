# ADR-0027: Discovery Planning Contracts

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** project lead
- **Supersedes:** —

## Context

ADR-0026 defined the discovery execution contracts (DiscoveryJob, Checkpoint, etc.).
However, discovery is not just execution — it's PLANNING then EXECUTION. Without
formal planning contracts, the scheduler would need to decide priorities, allocate
budgets, and handle compliance — making it a monolith that's hard to scale to
hundreds of sources and millions of products.

The user identified that the flow should be:

```
Signals → Priority Engine → Budget Allocator → Discovery Plan
→ Scheduler → Discovery Jobs → Executions
```

Additionally, the narrow "Provider" concept should be replaced by "DiscoverySource"
to support APIs, feeds, partner programs, manufacturer direct, and distributor APIs.

## Decision

Add 9 planning contracts to `@workspace/domain/discovery`:

### 11. DiscoverySignal

Information that influences priority. AI generates signals; signals NEVER execute
actions. 12 signal types: trend, search_volume, margin_opportunity, provider_quality,
api_cost, error_rate, seasonality, competitor_activity, stock_velocity, customer_demand,
niche_growth, price_volatility. Each has strength (low/medium/high/critical), value
(0-100), source (ai/analytics/manual/external), scope (provider/category/region/niche/product).

### 12. DiscoveryPlan

A plan of discovery. The Scheduler executes plans — it does NOT decide priorities.
Fields: sources, categories, regions, languages, niches, priority (DiscoveryPriority),
budget (DiscoveryBudgetAllocation), estimatedProducts, estimatedDuration, estimatedCost,
status (draft/approved/executing/completed/cancelled/failed), signals, timestamps.

### 13. DiscoveryBudget

Controls global limits. Fields: period (hourly/daily/weekly/monthly), maxApiCalls,
maxProductsDiscovered, maxCost, perSourceLimits, perRegionLimits, perCategoryLimits,
currentUsage (BudgetUsage), resetAt. Prevents runaway costs and API abuse.

### 14. DiscoveryExecution

A concrete execution. Audit trail + metrics. Fields: planId, jobId, sourceId,
providerCode, status (queued/running/completed/failed/timeout/rate_limited/cancelled),
startedAt, completedAt, durationMs, apiCallsUsed, productsDiscovered/Normalized,
duplicatesFound, productsApproved, costIncurred, errors (with retryable flag), retries,
checkpoint, metadata.

### 15. BudgetAllocator

Service that transforms plans into possible executions. allocate() → BudgetAllocationResult
(approved, allocatedCalls, perSource/Region/Category). checkAvailability() → BudgetAvailability.
recordUsage(). getRemainingBudget(). The Scheduler stays simple — executes what the allocator approves.

### 16. DiscoverySource

Replaces the narrow "Provider" concept. 7 source types: api_official, feed_xml, feed_csv,
partner_program, marketplace_api, manufacturer_direct, distributor_api. All return
NormalizedDiscoveredProduct. Pipeline is completely decoupled from source type.

### 17. SourceCompliance

Compliance metadata per source: supportsDropshipping, supportsAPI, supportsBranding,
requiresPartnerProgram, partnerProgramStatus, allowedRegions, prohibitedRegions,
termsOfServiceUrl, rateLimitPolicy, dataRetentionPolicy, lastReviewedAt, complianceNotes.
The orchestrator prioritizes sources compatible with the platform's strategy.

### 18. Expanded Lifecycle States

16 states: discovered → normalized → duplicate_pending → deduplicated → ai_pending →
ai_approved/ai_rejected → policy_pending → approved/rejected → catalog_pending →
published → boosted → declining → archived → blocked. Enables reprocessing, audit,
monitoring, metrics, rollback.

### 19. Independent Priorities

4 priority types, each optimizing different criteria:

- DiscoveryPriority: urgency, potentialValue, competitionLevel, providerReliability, costEfficiency
- EvaluationPriority: aiScoreEstimate, confidenceEstimate, marginPotential, trendAlignment
- CatalogPriority: customerDemand, seoPotential, conversionRateEstimate, inventoryAvailability
- PromotionPriority: trending, seasonality, crossSellPotential, marginForDiscount

## Consequences

**Positive**

- Planning is separated from execution — scheduler stays simple.
- Budget control prevents runaway costs across hundreds of sources.
- Compliance metadata ensures the platform respects each source's ToS.
- DiscoverySource abstraction supports any data source type (API, feed, partner).
- Expanded lifecycle states enable fine-grained monitoring and reprocessing.
- Independent priorities allow each pipeline stage to optimize independently.

**Negative**

- More types (9 new contracts + supporting types).
- BudgetAllocator adds a layer between planning and execution.

## References

- ADR-0026 (Discovery Pipeline Contracts — execution contracts)
- ADR-0025 (Marketplace Connector Refinements — source framework)
- ADR-0024 (AI Commerce Platform — A2 is the second epic)
- `packages/domain/src/discovery/index.ts` (all 19 contracts)
