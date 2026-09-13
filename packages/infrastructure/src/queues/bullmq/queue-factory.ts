/**
 * @workspace/infrastructure/queues/bullmq/queue-factory
 *
 * Factory for creating BullMQ Queue and Worker instances.
 * Centralizes Redis connection management and queue configuration.
 */
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import type { BullMQQueueConfig } from "./types";
import { DefaultBullMQConfig } from "./types";

export interface QueueFactoryOptions {
  readonly redisUrl?: string;
  readonly config?: Partial<BullMQQueueConfig>;
}

export class QueueFactory {
  private readonly connection: IORedis;
  readonly config: BullMQQueueConfig;

  constructor(options: QueueFactoryOptions = {}) {
    const redisUrl = options.redisUrl ?? process.env.REDIS_URL ?? "redis://localhost:6379";
    this.connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // BullMQ requirement
      enableReadyCheck: false
    });
    this.config = { ...DefaultBullMQConfig, ...options.config };
  }

  /**
   * Create a BullMQ Queue for enqueuing jobs.
   */
  createQueue(): Queue {
    return new Queue(this.config.queueName, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: this.config.maxAttempts,
        backoff: {
          type: this.config.backoffType,
          delay: this.config.backoffDelayMs
        },
        removeOnComplete: this.config.removeOnComplete,
        removeOnFail: this.config.removeOnFail
      }
    });
  }

  /**
   * Create a BullMQ Worker for processing jobs.
   * The processor function is provided by the caller.
   */
  createWorker<T = any, R = any>(
    processor: (job: { id: string; data: T; attemptsMade: number }) => Promise<R>
  ): Worker<T, R> {
    return new Worker<T, R>(
      this.config.queueName,
      (job) =>
        processor({
          id: String(job.id),
          data: job.data as T,
          attemptsMade: job.attemptsMade
        }),
      {
        connection: this.connection.duplicate(),
        concurrency: this.config.concurrency
      }
    );
  }

  /**
   * Close all connections.
   */
  async close(): Promise<void> {
    await this.connection.quit();
  }

  /**
   * Get the raw Redis connection (for testing).
   */
  getConnection(): IORedis {
    return this.connection;
  }
}

export function createQueueFactory(options?: QueueFactoryOptions): QueueFactory {
  return new QueueFactory(options ?? {});
}
