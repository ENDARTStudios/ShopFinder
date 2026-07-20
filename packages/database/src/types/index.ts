/**
 * @workspace/database/types — shared types for the database layer.
 */

import type { PrismaClient } from "@prisma/client";
import type { DomainEvent } from "@workspace/domain/shared";

/**
 * TransactionContext — either the full PrismaClient or a transaction client.
 * Both support the same query API, so repositories accept this union.
 */
export type TransactionClient =
  PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Cursor pagination input (per Rec 7 of 04B.2 feedback).
 * Preferred over page/pageSize for performance and consistency.
 */
export interface CursorPaginationInput {
  readonly after?: string; // cursor (typically the last ID from the previous page)
  readonly before?: string; // cursor (for backward pagination)
  readonly limit?: number; // default 20, max 100
}

/**
 * Cursor pagination output.
 */
export interface CursorPage<T> {
  readonly items: T[];
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly startCursor?: string;
  readonly endCursor?: string;
}

/**
 * Specification input for repository.find() (per Rec 8 of 04B.2 feedback).
 * Repositories accept a Specification<T> and translate it to Prisma where clauses.
 */
export interface SpecificationInput<T> {
  readonly where: Partial<T>;
  readonly order?: { readonly field: keyof T; readonly direction: "asc" | "desc" };
}

/**
 * Outbox entry to persist (per Rec 4 of 04B.2 feedback — Domain Event Collector).
 * The BaseRepository collects events from aggregates and the UnitOfWork persists
 * them to the outbox table in the same transaction.
 */
export interface OutboxEntry {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: unknown;
}

/**
 * Collected events from aggregates (per Rec 4).
 */
export interface EventCollector {
  collect(aggregateType: string, aggregateId: string, events: ReadonlyArray<DomainEvent>): void;
  drain(): ReadonlyArray<OutboxEntry>;
  clear(): void;
}
