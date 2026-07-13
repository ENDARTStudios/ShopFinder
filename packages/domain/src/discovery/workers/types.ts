/**
 * @workspace/domain/discovery/workers/types
 *
 * Type contracts for the Discovery Worker (A2.3).
 *
 * Worker scope:
 *   - Consume a DiscoveryJob produced by the Orchestrator (A2.2)
 *   - Call exactly one DiscoveryConnector to fetch raw products
 *   - Persist incremental Checkpoints
 *   - Emit ExecutionStarted/Completed/Failed events
 *   - Consume the ReservationToken (debit actual API calls)
 *
 * Worker does NOT:
 *   - normalize attributes (A2.5 Normalizer)
 *   - deduplicate (A2.6 Similarity)
 *   - evaluate AI (A2.7 AI Evaluation)
 *   - publish catalog (A2.9 Catalog Publisher)
 *   - call the Planner (A2.1)
 *   - access the catalog repository
 */
import type { BrandedId } from "../../shared";
import type { NormalizedDiscoveredProduct } from "../../marketplace";
import type { DiscoveryJob } from "../types";
import type { ExecutionKey, ReservationToken } from "../orchestrator/types";

/**
 * ProviderHealth shape — re-declared locally to keep the domain
 * decoupled from @workspace/providers. The two interfaces are
 * structurally identical; consumers in @workspace/providers satisfy
 * this contract without the domain depending on the package.
 */
export interface ProviderHealth {
  readonly providerCode: string;
  readonly status: "healthy" | "degraded" | "offline";
  readonly lastSuccess: Date;
  readonly lastFailure?: Date;
  readonly consecutiveFailures: number;
  readonly requestsRemaining?: number;
  readonly resetAt?: Date;
  readonly averageLatencyMs: number;
  readonly errorRate: number;
  readonly totalRequests: number;
  readonly totalErrors: number;
}

// ── Branded IDs ────────────────────────────────────────────

export type WorkerId = BrandedId<"WorkerId">;
export type CheckpointId = BrandedId<"CheckpointId">;
export type ProviderCallId = BrandedId<"ProviderCallId">;

// ── Worker states ──────────────────────────────────────────

export type WorkerState =
  | "idle"
  | "acquiring"
  | "executing"
  | "checkpointing"
  | "completed"
  | "failed"
  | "cancelled"
  | "rate_limited"
  | "retrying";

// ── DiscoveryConnector contract ────────────────────────────

/**
 * The Worker's view of a provider. This is the ONLY interface the
 * Worker uses to call the outside world. Implementations live in
 * @workspace/providers and @workspace/integrations.
 *
 * The contract is intentionally narrow: the Worker doesn't need
 * order/tracking/webhook capabilities — only discovery.
 */
export interface DiscoveryConnector {
  readonly providerCode: string;
  readonly providerVersion: string;

  /**
   * Discover products. MUST be idempotent for the same (cursor, jobId)
   * pair — Workers may retry on transient failures.
   *
   * Implementations MUST honor cancellationSignal and abort early
   * (cooperative cancellation).
   */
  discover(input: ConnectorDiscoverInput): Promise<ConnectorDiscoverResult>;
}

export interface ConnectorDiscoverInput {
  readonly jobId: string;
  readonly jobType: DiscoveryJob["type"];
  readonly category?: string;
  readonly keyword?: string;
  readonly region: string;
  readonly language: string;
  readonly cursor?: string;
  readonly cancellationSignal: CancellationSignal;
  /** Soft limit on items per call. Connector may return fewer. */
  readonly limit: number;
}

export interface ConnectorDiscoverResult {
  readonly products: ReadonlyArray<NormalizedDiscoveredProduct>;
  readonly nextCursor?: string;
  readonly hasMore: boolean;
  readonly apiCallsUsed: number;
}

// ── Cancellation ───────────────────────────────────────────

/**
 * Cooperative cancellation signal. Workers check `cancelled` between
 * steps and abort cleanly. Connectors SHOULD check during long-running
 * fetches.
 */
export interface CancellationSignal {
  readonly cancelled: boolean;
  readonly reason?: string;
  onCancel(handler: () => void): void;
  /** Trigger cancellation (caller-side). */
  cancel(reason?: string): void;
}

// ── Checkpoint ─────────────────────────────────────────────

export interface Checkpoint {
  readonly id: CheckpointId;
  readonly jobId: string;
  readonly providerCode: string;
  readonly cursor: string;
  readonly page: number;
  readonly itemsProcessed: number;
  readonly lastUpdatedAt: Date;
}

export interface CheckpointStore {
  /** Load the latest checkpoint for a job (or null if first run). */
  load(jobId: string): Promise<Checkpoint | null>;
  /** Persist a checkpoint. Idempotent for same (jobId, page). */
  save(checkpoint: Checkpoint): Promise<void>;
  /** Clear all checkpoints for a job (after completion). */
  clear(jobId: string): Promise<void>;
}

// ── Retry policy ───────────────────────────────────────────

export interface RetryPolicy {
  /**
   * Decide whether to retry after a failure. Returns the delay in ms
   * if retrying, or null if no more retries.
   */
  nextDelay(attempt: number, error: WorkerError): number | null;
  /** Cap on attempts (1 = no retries). */
  readonly maxAttempts: number;
}

export interface WorkerError {
  readonly code: string;
  readonly message: string;
  readonly retriable: boolean;
  readonly cause?: unknown;
}

// ── Rate limiter ───────────────────────────────────────────

export interface RateLimiter {
  /**
   * Acquire a slot for the given provider. Resolves when a slot is
   * available; rejects if the queue is full or cancelled.
   */
  acquire(providerCode: string, signal: CancellationSignal): Promise<ProviderCallId>;
  /** Release a slot. */
  release(callId: ProviderCallId): void;
  /** Current wait estimate in ms for a provider. */
  estimateWait(providerCode: string): number;
}

// ── Provider selection ─────────────────────────────────────

export interface ProviderSelector {
  /**
   * Pick the best connector for a job. Falls back through:
   *   1. exact providerCode match (job.providerCode)
   *   2. healthiest provider with discovery capability
   *   3. throw if none available
   */
  select(
    job: DiscoveryJob,
    connectors: ReadonlyMap<string, DiscoveryConnector>
  ): {
    connector: DiscoveryConnector;
    health: ProviderHealth | null;
  };
}

// ── Worker configuration ───────────────────────────────────

export interface WorkerConfig {
  /** Per-call timeout in ms. */
  readonly timeoutMs: number;
  /** Max retry attempts (1 = no retries). */
  readonly maxRetries: number;
  /** Base delay for exponential backoff (ms). */
  readonly baseRetryDelayMs: number;
  /** Cap for exponential backoff (ms). */
  readonly maxRetryDelayMs: number;
  /** Rate limit per provider per minute. */
  readonly rateLimitPerMinute: number;
  /** Save a checkpoint every N items processed. */
  readonly checkpointInterval: number;
  /** Max items to fetch per job (safety cap). */
  readonly maxItemsPerJob: number;
}

export const DefaultWorkerConfig: WorkerConfig = {
  timeoutMs: 30_000,
  maxRetries: 3,
  baseRetryDelayMs: 500,
  maxRetryDelayMs: 30_000,
  rateLimitPerMinute: 60,
  checkpointInterval: 50,
  maxItemsPerJob: 5_000
};

// ── Worker context ─────────────────────────────────────────

export interface WorkerContext {
  readonly workerId: WorkerId;
  readonly executionKey: ExecutionKey;
  readonly reservationToken: ReservationToken;
  readonly config: WorkerConfig;
  readonly connectors: ReadonlyMap<string, DiscoveryConnector>;
  readonly checkpointStore: CheckpointStore;
  readonly rateLimiter: RateLimiter;
  readonly providerSelector: ProviderSelector;
  readonly retryPolicy: RetryPolicy;
  readonly metrics: WorkerMetricsCollector;
  readonly events: WorkerEventPublisher;
  readonly cancellationSignal: CancellationSignal;
  readonly plannerVersion: string;
  readonly workflowVersion: string;
  readonly now?: () => Date;
  /**
   * ExecutionRegistry from the Orchestrator (A2.2). Workers update
   * plan state: scheduled → executing → completed | failed | cancelled.
   */
  readonly executionRegistry: import("../orchestrator/interfaces").ExecutionRegistry;
  /**
   * ReservationService from the Orchestrator (A2.2). Workers consume
   * the reservation token with actual apiCallsUsed.
   */
  readonly reservationService: import("../orchestrator/interfaces").BudgetReservationService;
  /**
   * JobExecutor — handles single-fetch with retry/timeout/rate-limit.
   * Injected per-worker for testability.
   */
  readonly executor: import("./executor").JobExecutor;
}

// ── Worker result ──────────────────────────────────────────

export interface WorkerResult {
  readonly state: "completed" | "failed" | "cancelled";
  readonly jobId: string;
  readonly providerCode: string;
  readonly productsDiscovered: number;
  readonly nextCursor?: string;
  readonly hasMore: boolean;
  readonly attempts: number;
  readonly durationMs: number;
  readonly apiCallsUsed: number;
  readonly reservationConsumed: boolean;
  readonly error?: WorkerError;
  readonly metrics: WorkerMetricsSnapshot;
}

export interface WorkerMetricsSnapshot {
  readonly discoveryDurationMs: number;
  readonly checkpointDurationMs: number;
  readonly rateLimitWaitMs: number;
  readonly retryDelayMs: number;
  readonly totalDurationMs: number;
  readonly itemsProcessed: number;
  readonly apiCallsUsed: number;
  readonly retries: number;
  readonly checkpointsSaved: number;
}

// ── Metrics + Events contracts ─────────────────────────────

export interface WorkerMetricsCollector {
  startTimer(name: string): () => number;
  increment(name: string, by?: number): void;
  setGauge(name: string, value: number): void;
  snapshot(): WorkerMetricsSnapshot;
  reset(): void;
}

export interface WorkerEventPublisher {
  publish(events: ReadonlyArray<WorkerEvent>): Promise<void>;
}

// Re-export the orchestrator event types so workers can emit them
import type {
  DiscoveryExecutionStartedEvent,
  DiscoveryExecutionCompletedEvent,
  DiscoveryExecutionFailedEvent
} from "../orchestrator/events";

export type WorkerEvent =
  DiscoveryExecutionStartedEvent | DiscoveryExecutionCompletedEvent | DiscoveryExecutionFailedEvent;

// Re-export commonly used types
export type { DiscoveryJob, ExecutionKey, ReservationToken };
export type { NormalizedDiscoveredProduct };
