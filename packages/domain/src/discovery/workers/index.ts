/**
 * @workspace/domain/discovery/workers
 *
 * Barrel exports for the Discovery Workers module (A2.3).
 *
 * Layout:
 *   types.ts               — Worker contracts, Connector, CancellationSignal, Checkpoint
 *   events.ts              — Event factories for Started/Completed/Failed
 *   metrics.ts             — In-memory WorkerMetricsCollector + NoopEventPublisher
 *   retry.ts               — ExponentialBackoffRetryPolicy + NoRetryPolicy
 *   rate-limit.ts          — TokenBucketRateLimiter (per-provider)
 *   checkpoint.ts          — In-memory CheckpointStore + buildCheckpoint()
 *   provider-selection.ts  — DefaultProviderSelector
 *   result.ts              — completed/failed/cancelled builders + WorkerErrors
 *   executor.ts            — JobExecutor (single-fetch with retry+timeout+rate-limit)
 *   worker.ts              — DiscoveryWorker (paging coordinator)
 */

// Types
export * from "./types";

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
