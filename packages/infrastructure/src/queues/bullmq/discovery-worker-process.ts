/**
 * @workspace/infrastructure/queues/bullmq/discovery-worker-process
 *
 * BullMQ Worker process — dequeues jobs from Redis and executes them
 * via the domain's DiscoveryWorker.
 *
 * Flow:
 *   BullMQ Job → DiscoveryWorker.execute(job, ctx) → WorkerResult →
 *   RawStoreCoordinator.persist(result) → BullMQ ack
 *
 * The worker process is THIN: it wires domain components together.
 * All business logic stays in the domain.
 */
import type { Worker, Job } from "bullmq";
import type { DiscoveryJobData, DiscoveryJobResult } from "./types";
import type { DiscoveryWorker } from "@workspace/domain/discovery/workers/worker";
import type { WorkerContext } from "@workspace/domain/discovery/workers/types";
import type { RawStoreCoordinator } from "@workspace/domain/discovery/raw-store/coordinator";
import type { RawStoreCoordinatorInput } from "@workspace/domain/discovery/raw-store/types";
import type { ProviderSnapshot } from "@workspace/domain/discovery/workers/contracts";
import type { WorkerMetricsSnapshot } from "@workspace/domain/discovery/workers/types";
import type { RawStoreVersions } from "@workspace/domain/discovery/raw-store/types";

export interface DiscoveryWorkerProcessDeps {
  readonly worker: DiscoveryWorker;
  readonly rawStoreCoordinator: RawStoreCoordinator;
  readonly buildWorkerContext: (jobData: DiscoveryJobData) => WorkerContext;
  readonly buildRawStoreInput: (
    jobData: DiscoveryJobData,
    workerResult: import("@workspace/domain/discovery/workers/types").WorkerResult
  ) => RawStoreCoordinatorInput;
}

export class DiscoveryWorkerProcess {
  private readonly bullmqWorker: Worker<DiscoveryJobData, DiscoveryJobResult>;

  constructor(
    bullmqWorker: Worker<DiscoveryJobData, DiscoveryJobResult>,
    deps: DiscoveryWorkerProcessDeps
  ) {
    this.bullmqWorker = bullmqWorker;

    // Wire BullMQ events to domain execution
    bullmqWorker.on("completed", (job: Job<DiscoveryJobData, DiscoveryJobResult>) => {
      const result = job.returnvalue;
      console.log(`[worker] Job ${job.id} completed: ${result.productsDiscovered} products in ${result.durationMs}ms`);
    });

    bullmqWorker.on("failed", (job: Job<DiscoveryJobData, DiscoveryJobResult> | undefined, err: Error) => {
      console.error(`[worker] Job ${job?.id ?? "unknown"} failed:`, err.message);
    });
  }

  /**
   * Process a single BullMQ job.
   * This is the function passed to BullMQ's Worker constructor.
   */
  static createProcessor(deps: DiscoveryWorkerProcessDeps) {
    return async (job: Job<DiscoveryJobData, DiscoveryJobResult>): Promise<DiscoveryJobResult> => {
      const jobData = job.data;
      const traceId = jobData.traceId;

      console.log(`[worker] Processing job ${jobData.job.id} (attempt ${job.attemptsMade + 1}, trace: ${traceId ?? "none"})`);

      // 1. Build worker context
      const ctx = deps.buildWorkerContext(jobData);

      // 2. Execute domain worker
      const workerResult = await deps.worker.execute(jobData.job, ctx);

      // 3. Persist to Raw Store (if products were discovered)
      if (workerResult.state === "completed" && workerResult.products && workerResult.products.length > 0) {
        const rawStoreInput = deps.buildRawStoreInput(jobData, workerResult);
        await deps.rawStoreCoordinator.persist(rawStoreInput);
      }

      // 4. Return result to BullMQ
      return {
        state: workerResult.state,
        jobId: workerResult.jobId,
        productsDiscovered: workerResult.productsDiscovered,
        durationMs: workerResult.durationMs,
        apiCallsUsed: workerResult.apiCallsUsed,
        error: workerResult.error?.message,
      };
    };
  }

  /**
   * Close the worker.
   */
  async close(): Promise<void> {
    await this.bullmqWorker.close();
  }
}
