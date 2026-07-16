/**
 * @workspace/infrastructure/queues/bullmq/types
 *
 * Type contracts for the BullMQ-based async processing layer.
 *
 * The domain stays unchanged. These types define the bridge between
 * the domain's DiscoveryJob and BullMQ's job data.
 */
import type { DiscoveryJob } from "@workspace/domain/discovery/types";
import type { DiscoveryTraceId } from "@workspace/domain/shared";

// ── Job data (what gets serialized into Redis) ─────────────

/**
 * The data payload stored in a BullMQ job.
 * Contains everything the worker process needs to execute the job
 * without additional DB lookups (for the initial slice).
 */
export interface DiscoveryJobData {
  readonly job: DiscoveryJob;
  readonly traceId?: DiscoveryTraceId;
  readonly executionKey: string;
  readonly reservationTokenValue?: string;
  readonly workflowVersion: string;
  readonly plannerVersion: string;
}

// ── Job result (what the worker returns) ───────────────────

export interface DiscoveryJobResult {
  readonly state: "completed" | "failed" | "cancelled";
  readonly jobId: string;
  readonly productsDiscovered: number;
  readonly durationMs: number;
  readonly apiCallsUsed: number;
  readonly error?: string;
}

// ── Queue configuration ────────────────────────────────────

export interface BullMQQueueConfig {
  readonly queueName: string;
  readonly concurrency: number;
  readonly maxAttempts: number;
  readonly backoffType: "exponential" | "fixed";
  readonly backoffDelayMs: number;
  readonly removeOnComplete: number; // keep last N completed jobs
  readonly removeOnFail: number; // keep last N failed jobs
}

export const DefaultBullMQConfig: BullMQQueueConfig = {
  queueName: "discovery-jobs",
  concurrency: 3,
  maxAttempts: 5,
  backoffType: "exponential",
  backoffDelayMs: 2000,
  removeOnComplete: 100,
  removeOnFail: 500
};

// ── Dispatcher interface ───────────────────────────────────

/**
 * BullMqDiscoveryDispatcher — enqueues DiscoveryJobs into BullMQ.
 * This is the async replacement for the synchronous Orchestrator→Worker call.
 * The domain's Orchestrator still creates jobs; the dispatcher sends them to Redis.
 */
export interface DiscoveryDispatcher {
  /**
   * Enqueue a single discovery job.
   * Returns the BullMQ job ID.
   */
  dispatch(jobData: DiscoveryJobData): Promise<string>;

  /**
   * Enqueue multiple jobs in batch.
   */
  dispatchBatch(jobs: ReadonlyArray<DiscoveryJobData>): Promise<ReadonlyArray<string>>;

  /**
   * Get queue stats (waiting, active, completed, failed, delayed).
   */
  getStats(): Promise<QueueStats>;

  /**
   * Close the queue connection.
   */
  close(): Promise<void>;
}

export interface QueueStats {
  readonly waiting: number;
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
  readonly delayed: number;
  readonly total: number;
}
