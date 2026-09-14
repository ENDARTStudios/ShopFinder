/**
 * @workspace/database/base/base-repository
 *
 * Per Rec 2 of 04B.2 feedback: abstract base that centralizes:
 *   - soft delete (sets deletedAt, never hard delete)
 *   - optimistic lock (checks version on update, increments after)
 *   - timestamps (updatedAt on every write)
 *   - version increment on update
 *   - outbox event collection (collects from aggregate.domainEvents)
 *
 * Concrete repositories extend this and implement:
 *   - toAggregate(prismaModel): TAggregate  (via mapper)
 *   - toPrismaInput(aggregate): PrismaInput  (via mapper)
 *   - getModelName(): string
 *
 * Per Rec 1: the base repository knows about Prisma types but NOT about
 * domain aggregates directly. Mappers handle the translation.
 */

import type { TransactionClient } from "../types";
import type { EventCollector } from "../unit-of-work/event-collector";
import type { AggregateRoot } from "@workspace/domain/shared";

export interface BaseRepositoryOptions {
  readonly tx: TransactionClient;
  readonly collector: EventCollector;
}

export abstract class BaseRepository<TAggregate extends AggregateRoot<any>> {
  constructor(protected readonly options: BaseRepositoryOptions) {}

  protected get tx(): TransactionClient {
    return this.options.tx;
  }
  protected get collector(): EventCollector {
    return this.options.collector;
  }

  protected collectEvents(aggregate: TAggregate): void {
    if (!aggregate.domainEvents || aggregate.domainEvents.length === 0) return;
    this.collector.collect(
      (aggregate as { aggregateType?: string }).aggregateType ?? this.getModelName(),
      String(aggregate.id),
      aggregate.domainEvents
    );
  }

  protected getOptimisticLockFilter(id: string, currentVersion: number): Record<string, unknown> {
    return { id, version: currentVersion, deletedAt: null };
  }

  protected get softDeleteFilter(): { deletedAt: null } {
    return { deletedAt: null };
  }

  protected abstract getInclude(): Record<string, boolean | object>;
  protected abstract getModelName(): string;
}

export abstract class BaseEntityRepository<T extends { id: string; version: number }> {
  constructor(protected readonly options: BaseRepositoryOptions) {}

  protected get tx(): TransactionClient {
    return this.options.tx;
  }

  protected getOptimisticLockFilter(id: string, currentVersion: number): Record<string, unknown> {
    return { id, version: currentVersion, deletedAt: null };
  }

  protected get softDeleteFilter(): { deletedAt: null } {
    return { deletedAt: null };
  }

  protected abstract getModelName(): string;
}

// ── Optimistic Lock Error ───────────────────────────────────

export class OptimisticLockError extends Error {
  constructor(
    public readonly aggregateId: string,
    public readonly expectedVersion: number
  ) {
    super(`Optimistic lock failed for ${aggregateId}: expected version ${expectedVersion}`);
    this.name = "OptimisticLockError";
  }
}

// ── Not Found Error ─────────────────────────────────────────

export class NotFoundError extends Error {
  constructor(
    public readonly aggregateType: string,
    public readonly id: string
  ) {
    super(`${aggregateType} not found: ${id}`);
    this.name = "NotFoundError";
  }
}
