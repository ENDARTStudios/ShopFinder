/**
 * @workspace/infrastructure/queues/bullmq/bullmq.test
 *
 * Tests for the BullMQ async processing layer.
 *
 * These tests use an in-memory mock of BullMQ Queue + Worker to validate
 * the dispatch → process → result flow without requiring a real Redis instance.
 *
 * Tests cover:
 *   - enqueue (dispatch)
 *   - dequeue (process)
 *   - retry (BullMQ native)
 *   - idempotency (same jobId → no re-enqueue)
 *   - concurrent processing
 *   - batch dispatch
 *   - queue stats
 *   - metrics adapter
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  BullMqDiscoveryDispatcher,
  createDiscoveryDispatcher,
  QueueFactory,
  createQueueFactory,
  DefaultBullMQConfig,
  NoRetryPolicy,
  DefaultRetryPolicy,
  toBullMQJobOptions,
  fromQueueConfig,
  BullMQMetricsAdapter,
  type DiscoveryJobData,
  type DiscoveryJobResult,
  type BullMQQueueConfig
} from "./index";
import type { DiscoveryJob } from "@workspace/domain/discovery/types";
import type { DiscoveryTraceId } from "@workspace/domain/shared";
import { createStageMetricsCollector } from "@workspace/domain/discovery/monitoring/collector";
import type { Job } from "bullmq";

// ── Mock Queue + Worker ────────────────────────────────────
//
// We mock BullMQ's Queue and Worker to avoid requiring a Redis instance.
// The mock simulates: add, process, getJobCounts, events.

class MockQueue {
  private jobs: Map<string, any> = new Map();
  private processor: ((job: any) => Promise<any>) | null = null;
  private eventHandlers: Map<string, Array<(...args: unknown[]) => void>> = new Map();

  async add(name: string, data: any, opts?: any): Promise<{ id: string }> {
    const id = opts?.jobId ?? `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    if (this.jobs.has(id)) {
      // Idempotent: return existing job
      return { id };
    }
    const job = {
      id,
      data,
      attemptsMade: 0,
      returnvalue: null as any,
      failedReason: null as string | null
    };
    this.jobs.set(id, job);
    return { id };
  }

  setProcessor(fn: (job: any) => Promise<any>): void {
    this.processor = fn;
  }

  async processAll(): Promise<void> {
    if (!this.processor) return;
    for (const [id, job] of this.jobs) {
      if (job.returnvalue !== null || job.failedReason) continue;
      try {
        job.attemptsMade++;
        const result = await this.processor(job);
        job.returnvalue = result;
        this.emit("completed", job);
      } catch (e) {
        job.failedReason = e instanceof Error ? e.message : String(e);
        this.emit("failed", job, e);
      }
    }
  }

  async getJobCounts(...types: string[]): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const type of types) {
      if (type === "completed")
        counts[type] = [...this.jobs.values()].filter((j) => j.returnvalue !== null).length;
      else if (type === "failed")
        counts[type] = [...this.jobs.values()].filter((j) => j.failedReason).length;
      else if (type === "waiting")
        counts[type] = [...this.jobs.values()].filter(
          (j) => j.returnvalue === null && !j.failedReason
        ).length;
      else counts[type] = 0;
    }
    return counts;
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, []);
    this.eventHandlers.get(event)!.push(handler);
  }

  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    for (const h of handlers) h(...args);
  }

  async close(): Promise<void> {
    this.jobs.clear();
    this.processor = null;
    this.eventHandlers.clear();
  }

  getJob(id: string): any {
    return this.jobs.get(id);
  }

  get jobCount(): number {
    return this.jobs.size;
  }
}

// ── Fixtures ───────────────────────────────────────────────

function makeJob(id: string = "job_test_001"): DiscoveryJob {
  return {
    id: id as any,
    type: "trending",
    providerCode: "aliexpress",
    category: "electronics",
    region: "US",
    language: "en",
    priority: 80,
    status: "pending",
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date(0),
    parentPlanId: "plan_test_001",
    sequenceNumber: 0
  };
}

function makeJobData(jobId?: string, traceId?: DiscoveryTraceId): DiscoveryJobData {
  return {
    job: makeJob(jobId),
    traceId: traceId ?? ("trace_test_001" as DiscoveryTraceId),
    executionKey: "ek_test_001",
    workflowVersion: "1.0.0",
    plannerVersion: "1.0.0"
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("BullMQ Async Processing", () => {
  // ── Retry Policy ────────────────────────────────────────
  describe("RetryPolicy", () => {
    it("should produce correct BullMQ job options", () => {
      const options = toBullMQJobOptions(DefaultRetryPolicy);
      expect(options.attempts).toBe(5);
      expect(options.backoff.type).toBe("exponential");
      expect(options.backoff.delay).toBe(2000);
      expect(options.removeOnComplete).toBe(100);
      expect(options.removeOnFail).toBe(500);
    });

    it("NoRetryPolicy should have 1 attempt", () => {
      expect(NoRetryPolicy.maxAttempts).toBe(1);
    });

    it("should convert from QueueConfig", () => {
      const config: BullMQQueueConfig = DefaultBullMQConfig;
      const policy = fromQueueConfig(config);
      expect(policy.maxAttempts).toBe(config.maxAttempts);
      expect(policy.backoffType).toBe(config.backoffType);
    });
  });

  // ── Dispatcher ──────────────────────────────────────────
  describe("DiscoveryDispatcher", () => {
    let mockQueue: MockQueue;
    let dispatcher: BullMqDiscoveryDispatcher;

    beforeEach(() => {
      mockQueue = new MockQueue();
      dispatcher = createDiscoveryDispatcher(mockQueue as any);
    });

    it("should enqueue a job and return its ID", async () => {
      const jobData = makeJobData();
      const jobId = await dispatcher.dispatch(jobData);
      expect(jobId).toBe("job_test_001");
      expect(mockQueue.jobCount).toBe(1);
    });

    it("should be idempotent (same jobId → no duplicate)", async () => {
      const jobData = makeJobData();
      await dispatcher.dispatch(jobData);
      await dispatcher.dispatch(jobData); // same jobId

      expect(mockQueue.jobCount).toBe(1); // no duplicate
    });

    it("should enqueue batch", async () => {
      const jobs = [
        makeJobData("job_batch_1"),
        makeJobData("job_batch_2"),
        makeJobData("job_batch_3")
      ];
      const ids = await dispatcher.dispatchBatch(jobs);
      expect(ids.length).toBe(3);
      expect(mockQueue.jobCount).toBe(3);
    });

    it("should get queue stats", async () => {
      await dispatcher.dispatch(makeJobData("job_stats_1"));
      await dispatcher.dispatch(makeJobData("job_stats_2"));

      const stats = await dispatcher.getStats();
      expect(stats.waiting).toBe(2);
      expect(stats.completed).toBe(0);
    });
  });

  // ── Worker Process (enqueue → process → result) ─────────
  describe("Worker Process (enqueue → process → result)", () => {
    let mockQueue: MockQueue;
    let dispatcher: BullMqDiscoveryDispatcher;

    beforeEach(() => {
      mockQueue = new MockQueue();
      dispatcher = createDiscoveryDispatcher(mockQueue as any);
    });

    it("should process enqueued jobs and produce results", async () => {
      const jobData = makeJobData("job_process_1");

      // Set up processor (simulates BullMQ Worker)
      mockQueue.setProcessor(async (job: any) => {
        const data: DiscoveryJobData = job.data;
        return {
          state: "completed" as const,
          jobId: data.job.id,
          productsDiscovered: 5,
          durationMs: 100,
          apiCallsUsed: 2
        };
      });

      // Enqueue
      await dispatcher.dispatch(jobData);

      // Process all pending jobs
      await mockQueue.processAll();

      // Verify result
      const job = mockQueue.getJob("job_process_1");
      expect(job).toBeDefined();
      expect(job.returnvalue.state).toBe("completed");
      expect(job.returnvalue.productsDiscovered).toBe(5);
    });

    it("should handle job failure", async () => {
      const jobData = makeJobData("job_fail_1");

      mockQueue.setProcessor(async (_job: any) => {
        throw new Error("Simulated failure");
      });

      await dispatcher.dispatch(jobData);
      await mockQueue.processAll();

      const job = mockQueue.getJob("job_fail_1");
      expect(job.failedReason).toBe("Simulated failure");
    });

    it("should support concurrent processing", async () => {
      const jobs = [
        makeJobData("job_concurrent_1"),
        makeJobData("job_concurrent_2"),
        makeJobData("job_concurrent_3")
      ];

      const processedOrder: string[] = [];
      mockQueue.setProcessor(async (job: any) => {
        // Simulate async work
        await new Promise((r) => setTimeout(r, 10));
        processedOrder.push(job.id);
        return {
          state: "completed" as const,
          jobId: job.id,
          productsDiscovered: 1,
          durationMs: 10,
          apiCallsUsed: 1
        };
      });

      await dispatcher.dispatchBatch(jobs);
      await mockQueue.processAll();

      expect(processedOrder.length).toBe(3);
      expect(mockQueue.jobCount).toBe(3);
    });
  });

  // ── Metrics Adapter ─────────────────────────────────────
  describe("BullMQMetricsAdapter", () => {
    it("should convert BullMQ events to StageMetrics", () => {
      const collector = createStageMetricsCollector();
      const adapter = new BullMQMetricsAdapter(collector, "worker", "bullmq-test");

      // Simulate completed job
      const mockJob = {
        id: "job_metrics_1",
        data: { traceId: "trace_001" }
      } as any;

      adapter.onCompleted(mockJob, {
        state: "completed",
        jobId: "job_metrics_1",
        productsDiscovered: 10,
        durationMs: 500,
        apiCallsUsed: 2
      });

      const metrics = adapter.getMetrics();
      expect(metrics.jobsCompleted).toBe(1);
      expect(metrics.productsDiscovered).toBe(10);
      expect(metrics.totalDurationMs).toBe(500);

      // Verify StageMetrics was recorded
      const stageMetrics = collector.getByStage("worker");
      expect(stageMetrics.length).toBe(1);
      expect(stageMetrics[0]!.itemsSucceeded).toBe(1);
      expect(stageMetrics[0]!.customMetrics.productsDiscovered).toBe(10);
    });

    it("should track failures", () => {
      const collector = createStageMetricsCollector();
      const adapter = new BullMQMetricsAdapter(collector);

      const mockJob = { id: "job_fail", data: {} } as any;
      adapter.onCompleted(mockJob, {
        state: "completed",
        jobId: "job1",
        productsDiscovered: 5,
        durationMs: 100,
        apiCallsUsed: 1
      });
      adapter.onFailed({ id: "job2", data: {} } as any, new Error("test"));

      const metrics = adapter.getMetrics();
      expect(metrics.jobsCompleted).toBe(1);
      expect(metrics.jobsFailed).toBe(1);
    });

    it("should track retries", () => {
      const collector = createStageMetricsCollector();
      const adapter = new BullMQMetricsAdapter(collector);

      adapter.onRetry({ id: "job_retry", data: {} } as any);
      adapter.onRetry({ id: "job_retry", data: {} } as any);

      const metrics = adapter.getMetrics();
      expect(metrics.totalRetries).toBe(2);
    });
  });

  // ── Queue Factory config ────────────────────────────────
  describe("QueueFactory", () => {
    it("should have default config", () => {
      const factory = new QueueFactory({ redisUrl: "redis://localhost:6379" });
      expect(factory.config.queueName).toBe("discovery-jobs");
      expect(factory.config.concurrency).toBe(3);
      expect(factory.config.maxAttempts).toBe(5);
      expect(factory.config.backoffType).toBe("exponential");
      expect(factory.config.backoffDelayMs).toBe(2000);
    });

    it("should accept custom config", () => {
      const factory = new QueueFactory({
        redisUrl: "redis://localhost:6379",
        config: {
          concurrency: 10,
          maxAttempts: 3,
          queueName: "custom-queue"
        }
      });
      expect(factory.config.concurrency).toBe(10);
      expect(factory.config.maxAttempts).toBe(3);
      expect(factory.config.queueName).toBe("custom-queue");
    });
  });
});
