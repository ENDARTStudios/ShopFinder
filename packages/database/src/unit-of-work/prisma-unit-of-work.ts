/**
 * @workspace/database/unit-of-work — PrismaUnitOfWork
 *
 * Per Rec 3 of 04B.2 feedback: the transaction belongs to the UnitOfWork,
 * never to the repository. Repositories receive a TransactionClient via
 * the callback, not via their own .transaction() method.
 *
 * Per Rec 4: after the callback succeeds, the UoW persists collected events
 * to the outbox table in the same transaction, then clears the collector.
 *
 * Usage:
 *   const uow = new PrismaUnitOfWork(prisma);
 *   await uow.transaction(async (repos) => {
 *     const order = createOrder(...);
 *     await repos.orderRepository.save(order);
 *     // events collected automatically
 *   });
 *   // → outbox persisted + TX committed
 */

import type { PrismaClient } from "@prisma/client";
import type {
  UnitOfWork,
  RepositoryRegistry,
  AdvancedUnitOfWork,
  IsolationLevel
} from "@workspace/domain/shared";
import type { TransactionClient, OutboxEntry } from "../types";
import type { EventCollector } from "./event-collector";
import { createEventCollector } from "./event-collector";
import type { RepositoryFactory } from "./repository-factory";

const ISOLATION_MAP: Record<IsolationLevel, string> = {
  read_uncommitted: "ReadUncommitted",
  read_committed: "ReadCommitted",
  repeatable_read: "RepeatableRead",
  serializable: "Serializable"
};

export class PrismaUnitOfWork implements AdvancedUnitOfWork {
  private readonly collector: EventCollector = createEventCollector();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly factory: RepositoryFactory
  ) {}

  async transaction<T>(fn: (repositories: RepositoryRegistry) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const repos = this.factory.createRegistry(tx, this.collector);
      const result = await fn(repos);
      // Persist collected events to outbox in the SAME transaction
      await this.persistOutbox(tx);
      return result;
    });
  }

  async transactionWithIsolation<T>(
    isolation: IsolationLevel,
    fn: (repositories: RepositoryRegistry) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        const repos = this.factory.createRegistry(tx, this.collector);
        const result = await fn(repos);
        await this.persistOutbox(tx);
        return result;
      },
      { isolationLevel: ISOLATION_MAP[isolation] as never }
    );
  }

  get repositories(): RepositoryRegistry {
    // Autocommit mode — repositories use the prisma client directly (no TX)
    return this.factory.createRegistry(this.prisma, this.collector);
  }

  /**
   * Persist collected outbox entries to the outbox_events table.
   * Called at the end of each transaction, BEFORE commit.
   */
  private async persistOutbox(tx: TransactionClient): Promise<void> {
    const entries: ReadonlyArray<OutboxEntry> = this.collector.drain();
    if (entries.length === 0) return;

    await tx.outboxEvent.createMany({
      data: entries.map((e) => ({
        aggregateType: e.aggregateType,
        aggregateId: e.aggregateId,
        eventType: e.eventType,
        payload: e.payload as object,
        status: "pending",
        attempts: 0,
        maxAttempts: 5,
        availableAt: new Date()
      }))
    });

    this.collector.clear();
  }
}
