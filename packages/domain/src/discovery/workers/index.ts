/**
 * @workspace/domain/discovery/workers
 *
 * Barrel exports for the Discovery Workers module (A2.3).
 *
 * Layout (10 modules mapped to 4 logical slices):
 *
 *   ── Slice A2.3.1: Worker Engine ─────────────────────────
 *   worker.ts              — DiscoveryWorker (paging coordinator)
 *   executor.ts            — JobExecutor (single-fetch retry/timeout/rate-limit)
 *   provider-selection.ts  — DefaultProviderSelector (delegates to ProviderSelectionPolicy)
 *
 *   ── Slice A2.3.2: Connector Executor ────────────────────
 *   types.ts               — DiscoveryConnector contract (provider interface)
 *   rate-limit.ts          — TokenBucketRateLimiter (per-provider)
 *
 *   ── Slice A2.3.3: Checkpoint ────────────────────────────
 *   checkpoint.ts          — In-memory CheckpointStore + buildCheckpoint()
 *
 *   ── Slice A2.3.4: Events ────────────────────────────────
 *   events.ts              — Factories for Started/Completed/Failed
 *   metrics.ts             — In-memory WorkerMetricsCollector + NoopEventPublisher
 *   result.ts              — WorkerResult builders + WorkerErrors + toDiscoveryExecutionResult
 *
 *   ── Cross-cutting contracts ─────────────────────────────
 *   contracts.ts           — C1 RetryPolicyConfig, C2 ProviderSelectionPolicy,
 *                            C3 ErrorTaxonomy, C4 ProviderSnapshot,
 *                            C5 DiscoveryExecutionResult
 *   retry.ts               — ConfigurableRetryPolicy (interprets RetryPolicyConfig)
 *
 *   ── Test ────────────────────────────────────────────────
 *   worker.test.ts         — 24 tests covering 11 acceptance criteria
 *   contracts.test.ts      — Tests for the 5 cross-cutting contracts
 */

// Types
export * from "./types";

// Cross-cutting contracts (C1-C5)
export * from "./contracts";

// Implementations
export * from "./events";
export * from "./metrics";
export * from "./retry";
export * from "./rate-limit";
export * from "./checkpoint";
export * from "./provider-selection";
export * from "./result";
export * from "./executor";
export * from "./worker";
