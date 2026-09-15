# ADR-0013: Outbox Pattern & Webhook Inbox

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The in-process event bus (ADR-0008) works for the monolith phase but has a
critical limitation: if the process crashes between committing a transaction
and publishing the event, the event is lost. For critical events
(`OrderPlaced`, `PaymentCaptured`, `SupplierOrderPlaced`), losing an event
means:

- An order is placed but payment is never initiated.
- A payment is captured but the order status is never updated.
- A supplier order is placed but fulfillment never starts.

Similarly, incoming webhooks from suppliers and payment providers can be:

- Duplicated (provider retries because our response was slow).
- Delivered out of order.
- Received while a previous one is still processing.

The user explicitly requested both patterns before the Prisma schema is frozen.

## Decision

### 1. Outbox Pattern (for outgoing critical events)

Add `outbox_events` table. Critical domain events are written to the outbox
**in the same database transaction** as the aggregate change. A background
worker polls the outbox, publishes to the event bus, and marks rows as
`published`.

**Flow:**

```
Transaction {
  UPDATE aggregate (e.g. Order status → paid)
  INSERT INTO outbox_events (eventType: "order.paid", payload: {...})
} COMMIT

Worker (polls every N seconds):
  SELECT * FROM outbox_events WHERE status = 'pending' AND availableAt <= NOW()
  → publish to event bus
  → UPDATE outbox_events SET status = 'published', processedAt = NOW()
  → on failure: increment attempts, set availableAt = NOW() + backoff(attempts)
```

**Columns:** id, aggregateType, aggregateId, eventType, payload (Json),
status, attempts, maxAttempts, availableAt, processedAt, lastError, createdAt.

**Retry with exponential backoff:** `availableAt = NOW() + (2^attempts * base)`.
After `maxAttempts` (default 5), status → `failed` and alerts fire.

### 2. Webhook Inbox Pattern (for incoming webhooks)

Add `webhook_events` table. Incoming webhooks are stored **before processing**.
Processing is idempotent — duplicate webhooks (same provider + externalId) are
detected and skipped.

**Flow:**

```
POST /api/webhooks/stripe
  → INSERT INTO webhook_events (provider: "stripe", externalId: evt_xxx, payload: {...})
  → ON CONFLICT (provider, externalId) DO NOTHING → return 200 (already received)
  → process webhook (update payment, emit domain event)
  → UPDATE webhook_events SET status = 'processed', processedAt = NOW()
```

**Columns:** id, provider, externalId, eventType, payload (Json), headers (Json),
status, attempts, maxAttempts, receivedAt, processedAt, lastError.

**Unique constraint:** `(provider, externalId)` — prevents duplicate processing.

## Consequences

**Positive**

- **No lost events**: outbox persists events before publishing. If the process
  crashes, the worker picks up pending events on restart.
- **Retry-safe**: exponential backoff prevents thundering-herd retries.
- **Duplicate webhook protection**: `(provider, externalId)` unique constraint.
- **Observability**: outbox + webhook tables provide a full audit trail of
  event flow.
- **Ordered processing**: within an aggregate, events are processed in creation
  order (by createdAt).

**Negative**

- **Extra write per transaction**: every critical event adds one INSERT to the
  outbox. Acceptable — the cost of reliability.
- **Worker complexity**: a background process must poll the outbox. In
  serverless (Vercel), this is a cron-triggered API route or external worker.
- **Storage growth**: outbox rows accumulate. Mitigated by a cleanup job that
  archives `published` rows older than 30 days.

## Alternatives Considered

- **Change Data Capture (CDC)** — read the WAL/binlog and emit events. More
  complex to set up; outbox is simpler and database-agnostic.
- **Message queue (Kafka/RabbitMQ)** — durable, but adds infrastructure now.
  Outbox keeps events in the same DB until we need a broker.
- **Just retry the in-memory bus** — rejected: doesn't survive process crashes.

## References

- ADR-0008 (In-Process Event Bus — the outbox publishes TO this bus)
- ADR-0009 (Persistence Model — outbox_events + webhook_events tables)
- `packages/domain/src/shared/persistence-conventions.ts` (OutboxEvent, WebhookEvent interfaces)
- `prisma/schema.prisma` (OutboxEvent, WebhookEvent models)
