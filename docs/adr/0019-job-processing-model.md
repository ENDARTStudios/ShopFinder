# ADR-0019: Job Processing Model

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

Background processing is needed for: outbox dispatch, webhook processing, inventory reservation cleanup, supplier sync, email sending. Without a job model, these are ad-hoc scripts with no scheduling, retry, or observability.

## Decision

Create `@workspace/jobs` package with:

- `Job` interface — name, schedule (cron), timezone, execute(ctx).
- `JobRegistry` — register/get/list jobs.
- `JobRunner` — execute jobs by name.
- 3 built-in jobs: `OutboxDispatcherJob` (polls outbox_events, publishes to event bus, exponential backoff retry), `WebhookProcessorJob` (processes webhook_events), `InventoryReservationCleanupJob` (expires active reservations past TTL, returns stock to available).

Jobs are triggered by: cron (SyncJob table), events (via consumers in @workspace/events), or manual (admin API).

## Consequences

**Positive**: Centralized background processing. Retry with exponential backoff. Observability (itemsProcessed/Succeeded/Failed). Cron-driven.
**Negative**: Job runner needs a host (cron service, Vercel Cron, or external worker). In serverless, jobs run as API routes triggered by cron.

## References

- ADR-0013 (Outbox Pattern — OutboxDispatcherJob polls this)
- `packages/jobs/src/` (implementation)
