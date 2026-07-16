# ADR-0021: Event Processing

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The outbox table stores domain events that need to be processed by side-effect consumers (search indexing, cache invalidation, email, supplier order placement). Without a consumer layer, these side effects are scattered or missing.

## Decision

Create `@workspace/events` package with:

- `EventConsumer` interface — eventType (supports prefix matching like "catalog."), handle(event).
- `ConsumerRegistry` — register/get consumers with prefix matching.
- 5 built-in consumers: `SearchIndexConsumer` (catalog.product. → re-index Meilisearch), `CacheInvalidationConsumer` (catalog.product. → invalidate entity cache), `OrderConfirmationEmailConsumer` (order.placed → send email), `SupplierOrderConsumer` (order.paid → place supplier orders), `InventoryUpdateConsumer` (supplier.order.shipped → update fulfillment).
- `registerAllConsumers(bus, registry)` — wires consumers to the domain event bus.

Flow: OutboxDispatcherJob polls outbox → publishes to EventBus → consumers handle side effects.

## Consequences

**Positive**: Side effects are centralized and observable. Prefix matching allows one consumer to handle all catalog events. Consumers are independently deployable.
**Negative**: Consumer errors don't block the outbox (at-least-once semantics). Need idempotent consumers. Acceptable — events carry enough context for idempotency.

## References

- ADR-0008 (In-Process Event Bus — consumers subscribe to this)
- ADR-0013 (Outbox Pattern — OutboxDispatcherJob feeds events here)
- ADR-0019 (Job Processing — OutboxDispatcherJob is a job)
- `packages/events/src/` (implementation)
