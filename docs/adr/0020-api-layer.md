# ADR-0020: API Layer

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

Route Handlers in Next.js App Router can become bloated if they contain auth parsing, request context building, error mapping, and bus dispatch inline. Keeping them in `apps/web/src/app/api/` mixes infrastructure with HTTP transport.

## Decision

Create `@workspace/api` package with:

- `admin/` — admin-only endpoints (CRUD, dashboard, bulk ops)
- `store/` — storefront endpoints (catalog, cart, checkout, customer)
- `webhooks/` — incoming webhooks (Stripe, suppliers)
- `internal/` — health, jobs, metrics
- Helpers: `jsonOk`, `jsonError`, `mapResult`, `buildRequestContext`, `buildAuthContext`, `createCommandHandler`, `createQueryHandler`, `createWebhookHandler`.

Each handler: builds RequestContext → dispatches to CommandBus/QueryBus → maps result to HTTP response. App Router's `api/` re-exports these handlers (one-liner per route).

## Consequences

**Positive**: App Router stays lean (one-liner re-exports). Handlers are testable in isolation. Consistent error mapping. Request context building is centralized.
**Negative**: Extra indirection (App Router → @workspace/api → @workspace/application). Justified: each layer has a single responsibility.

## References

- ADR-0017 (Application Layer — handlers dispatch to CommandBus/QueryBus)
- `packages/api/src/` (implementation)
