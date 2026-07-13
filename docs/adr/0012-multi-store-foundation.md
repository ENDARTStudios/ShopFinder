# ADR-0012: Multi-Store Foundation & Persistence Refinements

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The persistence model (ADR-0009) was approved, but 6 refinements were requested
before freezing the Prisma schema. These are cheap to add now (documentation +
interfaces) but expensive to retrofit later (migrations + data backfills):

1. **Store Context** — multi-tenant foundation for white-label/multi-brand.
2. **User/Customer split** — separate auth identity from commerce profile.
3. **Price History** — append-only log for supplier price changes.
4. **Inventory Reservation** — prevent overselling during checkout.
5. **Integration Layer** — model sync jobs, credentials (secret references), execution logs.
6. **Idempotency Keys** — protect webhooks and payments from duplicate processing.

## Decision

Apply all 6 refinements to the persistence model and domain layer.

### 1. Store Context (multi-tenant foundation)

- New aggregate root: `Store` (id, name, slug, defaultCurrency, defaultLocale, domain, status, settings).
- New branded ID: `StoreId`.
- Tenant-scoped tables (carry `store_id` FK): products, categories, customers, carts, orders, payments, checkout_sessions, coupons (future), blog_posts (future).
- Global tables (no store_id): users, suppliers, integrations, sync_jobs.
- Default store is created at seed time; single-store deployment uses `store_id = 1` everywhere.

### 2. User/Customer split

- New aggregate root: `User` (id, email, passwordHash, roles[], storeId?, customerId?, supplierId?, status, lastLoginAt, emailVerifiedAt).
- New branded ID: `UserId`.
- `Customer` (existing) now has optional `user_id` FK back to `users`.
- A Customer can exist without a User (guest checkout).
- A User can exist without a Customer (admin, supplier staff).
- Roles: `customer`, `admin`, `supplier`, `support`.
- Auth.js authenticates against `users`; the Customer profile is loaded via `user.customerId`.

### 3. Price History (append-only)

- New entity: `ProductOfferPriceHistory` (id, offerId, price, compareAtPrice, inventory, changedAt, changeSource, previousPrice).
- Table `product_offer_price_history` is append-only — rows are never UPDATEd or DELETEd.
- Enables: margin analysis, price increase alerts, supplier reliability scoring, AI pricing recommendations.
- Populated by sync jobs (Ajuste 5) whenever a price change is detected.

### 4. Inventory Reservation

- New aggregate root: `InventoryReservation` (id, inventoryId, variantId, cartId?, customerId?, sessionId?, quantity, status, reservedAt, expiresAt, committedAt?, expiredAt?, cancelledAt?).
- Lifecycle: `active` → `committed` (checkout) | `expired` (TTL) | `cancelled` (abandon).
- Background sweeper job marks expired reservations and returns stock to `inventory.available`.
- Prevents overselling when two customers race for the last item during checkout.

### 5. Integration Layer

- New context: `Integration` with 2 aggregate roots + 2 entities.
- `Integration` (id, type, name, supplierId?, providerCode, status, credentials[], config, lastSyncAt, lastError).
- `SyncJob` (id, integrationId, name, schedule, trigger, enabled, lastExecutionId, nextRunAt).
- `SupplierCredential` (id, integrationId, keyName, **secretReference**, lastRotatedAt) — stores ONLY a reference (env var name or vault path), never the secret value.
- `SyncExecutionLog` (id, syncJobId, trigger, status, startedAt, finishedAt, durationMs, itemsProcessed/Succeeded/Failed, errorMessage).
- Enables: scheduled catalog syncs, webhook-driven order fulfillment, retry logic, observability of integration health.

### 6. Idempotency Keys

- New table: `idempotency_keys` (key PK, scope, requestHash, responseHash?, responseBody?, statusCode?, expiresAt).
- Client sends `Idempotency-Key` header on POST /api/payments/intent, POST /api/orders, webhooks.
- Server: key not found → execute + cache; key found + same request hash → return cached; key found + different request hash → 409 Conflict.
- Protects against: duplicate webhooks, client retries, double-submits.

## Consequences

**Positive**

- Multi-store ready: white-label/multi-brand is a config change, not a migration.
- User/Customer split: admin/supplier staff don't need Customer profiles; guests can checkout without Users.
- Price history: data foundation for AI pricing and margin alerts.
- Inventory reservations: no overselling during checkout races.
- Integration layer: sync jobs are observable, retryable, and schedulable.
- Idempotency: webhooks and payments are safe to retry.

**Negative**

- 9 new tables (stores, users, user_roles, product_offer_price_history, integrations, supplier_credentials, sync_jobs, sync_execution_logs, inventory_reservations, idempotency_keys) — total 37 tables.
- `store_id` FK on 7 existing tables — requires adding the column + backfilling to default store in migration 0001.
- More complexity in queries (tenant scoping). Mitigated by Prisma middleware that auto-filters by store_id from session context.
- Secret reference indirection adds a runtime resolution step. Acceptable for security.

## Alternatives Considered

- **Defer all 6 to when needed** — rejected: each would require a migration + potential data backfill. Adding now is documentation + interfaces only.
- **Store as a column on Product (not a separate table)** — rejected: loses Store settings (currency, locale, timezone, branding).
- **User and Customer as one table** — rejected: admin/supplier staff don't have addresses/wishlist; guests don't have passwords. Splitting is cleaner.
- **Store secrets in DB encrypted** — rejected: encryption key management is harder than env/vault references. Secret references + env/vault is the industry standard.

## References

- ADR-0009 (Persistence Model — the base being refined)
- ADR-0005 (Domain Architecture — new contexts: store, identity, integration)
- `docs/persistence-model.md` §3.8–§3.11 (new table definitions)
- `packages/domain/src/{store,identity,integration}/` (domain implementations)
