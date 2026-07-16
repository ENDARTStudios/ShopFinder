/**
 * @workspace/database/bulk — Bulk Operations Interface
 *
 * Per Rec 9 of 04B.3 feedback: define bulk operation contracts now.
 * Even if initially NotImplemented, the interfaces are stable for future use.
 *
 * Bulk operations are critical for:
 *   - Supplier catalog sync (1000s of products at once)
 *   - Admin bulk actions (bulk publish, bulk archive)
 *   - Migration scripts
 *   - Seed data import
 */

import type { AggregateRoot } from "@workspace/domain/shared";

export interface BulkOperations<TAggregate extends AggregateRoot<any>> {
  bulkInsert(aggregates: ReadonlyArray<TAggregate>): Promise<number>;
  bulkUpdate(aggregates: ReadonlyArray<TAggregate>): Promise<number>;
  bulkSoftDelete(ids: ReadonlyArray<string>): Promise<number>;
  bulkRestore(ids: ReadonlyArray<string>): Promise<number>;
  bulkUpsert(aggregates: ReadonlyArray<TAggregate>): Promise<number>;
}

export class NotImplementedError extends Error {
  constructor(public readonly method: string) {
    super(`Method not implemented: ${method}`);
    this.name = "NotImplementedError";
  }
}

export abstract class NoopBulkOperations<
  TAggregate extends AggregateRoot<any>
> implements BulkOperations<TAggregate> {
  async bulkInsert(_aggregates: ReadonlyArray<TAggregate>): Promise<number> {
    throw new NotImplementedError("bulkInsert");
  }
  async bulkUpdate(_aggregates: ReadonlyArray<TAggregate>): Promise<number> {
    throw new NotImplementedError("bulkUpdate");
  }
  async bulkSoftDelete(_ids: ReadonlyArray<string>): Promise<number> {
    throw new NotImplementedError("bulkSoftDelete");
  }
  async bulkRestore(_ids: ReadonlyArray<string>): Promise<number> {
    throw new NotImplementedError("bulkRestore");
  }
  async bulkUpsert(_aggregates: ReadonlyArray<TAggregate>): Promise<number> {
    throw new NotImplementedError("bulkUpsert");
  }
}
