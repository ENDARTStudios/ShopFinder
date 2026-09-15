/**
 * @workspace/infrastructure/queues/bullmq/discovery-dispatcher
 *
 * BullMqDiscoveryDispatcher — enqueues DiscoveryJobs into BullMQ.
 *
 * This is the async bridge between the Orchestrator (which creates jobs)
 * and the Worker process (which executes them via BullMQ).
 *
 * Flow:
 *   Orchestrator → DiscoveryJob[] → dispatcher.dispatch() → BullMQ Queue → Redis
 *   ... (async) ...
 *   Redis → BullMQ Worker → Worker.execute() → RawStore → ack
 *
 * The domain is UNCHANGED. The dispatcher is pure infrastructure.
 */
import type { Queue } from "bullmq";
import type {
  DiscoveryDispatcher,
  DiscoveryJobData,
  QueueStats
} from "./types";

export class BullMqDiscoveryDispatcher implements DiscoveryDispatcher {
  constructor(private readonly queue: Queue) {}

  async dispatch(jobData: DiscoveryJobData): Promise<string> {
    const job = await this.queue.add("discovery", jobData, {
      jobId: jobData.job.id, // use domain job ID as BullMQ job ID for idempotency
    });
    return job.id!;
  }

  async dispatchBatch(jobs: ReadonlyArray<DiscoveryJobData>): Promise<ReadonlyArray<string>> {
    const jobIds: string[] = [];
    for (const jobData of jobs) {
      const id = await this.dispatch(jobData);
      jobIds.push(id);
    }
    return jobIds;
  }

  async getStats(): Promise<QueueStats> {
    const counts = await this.queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );
    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      total: (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0),
    };
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

export function createDiscoveryDispatcher(queue: Queue): DiscoveryDispatcher {
  return new BullMqDiscoveryDispatcher(queue);
}
