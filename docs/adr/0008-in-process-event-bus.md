# ADR-0008: In-Process Domain Event Bus

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The domain architecture (ADR-0005) defines cross-context communication via
domain events. Examples:

- `order.placed` (Orders) → consumed by Payments + Suppliers.
- `payment.captured` (Payments) → consumed by Orders (→ emits `order.paid`).
- `supplier.order.shipped` (Suppliers) → consumed by Orders (→ emits `order.shipped`).

The question is **how** events travel from emitter to consumer.

Options:

1. **Direct method calls** — emitter imports consumer's service. Creates
   tight coupling; consumer cannot be swapped without changing emitter.
2. **In-process event bus** — emitter publishes to a bus; consumers subscribe.
   Decoupled, but events are lost if the process crashes.
3. **External message broker (Redis Streams, Kafka, NATS)** — durable,
   horizontally scalable, but adds infra and operational complexity now.

## Decision

Adopt an **in-process event bus** as the default, with an interface that
allows swapping to an external broker later without touching the domain.

### Interface (in `@workspace/domain/shared`)

```ts
interface DomainEventBus {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
  subscribe(eventType: string, handler: DomainEventHandler): Unsubscribe;
  clear(): void;
  readonly subscriberCount: number;
}
```

### Implementation

- `InMemoryEventBus` — singleton, in-process, sequential handler execution,
  prefix matching (subscribe to `"order."` matches `"order.placed"`).
- Failures in one handler do not stop others (at-least-once semantics within
  the process; logged to observability layer).
- `getEventBus()` / `setEventBus()` / `resetEventBus()` for singleton + tests.

### Upgrade path

When the platform needs durable events or horizontal scaling:

1. Implement a `RedisStreamsEventBus` (or `KafkaEventBus`) that satisfies the
   same `DomainEventBus` interface.
2. Call `setEventBus(new RedisStreamsEventBus(...))` at app startup.
3. Domain code is unchanged — it still calls `getEventBus().publish(event)`.

The Zod event schemas in `@workspace/contracts/events` ensure that events
serialized across a network are validated at trust boundaries.

## Consequences

**Positive**

- Domain stays decoupled — emitters don't know who consumes.
- Swap to external broker is a one-line change at startup.
- Tests are easy: `resetEventBus()` gives a fresh bus per test.
- No infra cost now; the path to durability is open.

**Negative**

- Events are lost on process crash (acceptable for the monolith phase;
  critical events like `order.placed` are also persisted via the repository
  before the event is published).
- Sequential execution within a handler set can slow down high-volume
  emitters. Mitigation: handlers must be fast; offload heavy work to
  background jobs.
- No retries built in (at-least-once within the process; failed handlers
  log the error but don't retry). Acceptable now; add a retry queue when
  a real broker is introduced.

## Alternatives Considered

- **External broker from day 1** — rejected: YAGNI. Adds Redis/Kafka
  operational burden before the platform needs it.
- **Direct method calls** — rejected: creates the coupling the domain
  architecture explicitly avoids.
- **Event sourcing** — deferred: requires an event store, projections,
  snapshots. The bus interface is compatible with upgrading to ES later.

## References

- ADR-0005 (Domain Architecture — events catalog)
- `packages/domain/src/shared/event-bus.ts` (implementation)
- `packages/contracts/src/events/` (Zod schemas for serialization)
