/**
 * @workspace/database/unit-of-work/event-collector
 *
 * Per Rec 4 of 04B.2 feedback: aggregates raise events via `raise(event)`.
 * The repository collects them via `collectEvents()`. The UnitOfWork
 * persists them to the outbox table in the same transaction, then clears them.
 *
 * This decouples event emission from event persistence:
 *   Aggregate: raise(event)  →  stores in aggregate.domainEvents
 *   Repository.save(agg):    →  collects events into the collector
 *   UoW.transaction(fn):     →  after fn() succeeds, persists outbox + clears
 *
 * Flow:
 *   UoW.transaction(async (repos) => {
 *     const order = createOrder(...);  // raises OrderPlaced event
 *     await repos.orderRepository.save(order);  // collects events
 *     // ... more work ...
 *   });
 *   // → UoW persists outbox entries in the SAME TX
 *   // → clears collected events
 *   // → commits TX
 */

import type { DomainEvent } from "@workspace/domain/shared";
import type { OutboxEntry } from "../types";

export interface EventCollector {
  collect(aggregateType: string, aggregateId: string, events: ReadonlyArray<DomainEvent>): void;
  drain(): ReadonlyArray<OutboxEntry>;
  clear(): void;
}

class InMemoryEventCollector implements EventCollector {
  private readonly entries: OutboxEntry[] = [];

  collect(aggregateType: string, aggregateId: string, events: ReadonlyArray<DomainEvent>): void {
    for (const event of events) {
      this.entries.push({
        aggregateType,
        aggregateId,
        eventType: event.eventType,
        payload: event
      });
    }
  }

  drain(): ReadonlyArray<OutboxEntry> {
    const result = [...this.entries];
    return result;
  }

  clear(): void {
    this.entries.length = 0;
  }

  get count(): number {
    return this.entries.length;
  }
}

export function createEventCollector(): EventCollector {
  return new InMemoryEventCollector();
}
