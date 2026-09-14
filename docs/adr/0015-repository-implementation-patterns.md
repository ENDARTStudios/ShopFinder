# ADR-0015: Repository Implementation Patterns

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

04B.1 delivered the Prisma schema. 04B.2 implements the repository layer that
satisfies the domain repository interfaces (ADR-0010, ADR-0011). The user
provided 10 specific recommendations for quality of implementation:

1. Mapper Layer — decouple Prisma from domain
2. BaseRepository — centralize soft delete, optimistic lock, version, outbox
3. Transaction Context — UoW owns transactions, not repositories
4. Domain Event Collector — aggregate raises → repository collects → UoW persists outbox
5. Query Layer returns DTOs, never aggregates
6. N+1 prevention — explicit include/select always
7. Cursor pagination (after/before/limit) not page/pageSize
8. Specifications — repositories accept Specification<T>, not dozens of methods
9. Cache interface — placeholder for Redis
10. Repository test suite — standardized tests per repository

## Decision

Implement all 10 patterns in `@workspace/database`:

### 1. Mapper Layer (8 mappers)

`packages/database/src/mappers/` — one mapper per aggregate root. Each has
`toAggregate(prismaModel)` and `toPrismaInput(aggregate)` / `toPrismaUpdateInput(aggregate)`.
Mappers are the ONLY place that knows Prisma's column shapes.

### 2. BaseRepository + BaseEntityRepository

`packages/database/src/base/base-repository.ts`:

- `BaseRepository<TAggregate extends AggregateRoot>` — for aggregates with
  domain events. Centralizes: `collectEvents()`, `getOptimisticLockFilter()`,
  `softDeleteFilter`, abstract `getInclude()`, `getModelName()`.
- `BaseEntityRepository<T extends { id, version }>` — for non-aggregate
  entities (Variant, Inventory). Has `getOptimisticLockFilter()` + `softDeleteFilter`
  but no event collection.

### 3. PrismaUnitOfWork

`packages/database/src/unit-of-work/prisma-unit-of-work.ts`:

- `transaction(fn)` — opens Prisma `$transaction`, provides `RepositoryRegistry`,
  persists outbox after callback, commits.
- `transactionWithIsolation(level, fn)` — for cases needing stronger isolation.
- `repositories` — autocommit mode (no TX).
- Transaction belongs to UoW, NEVER to repository.

### 4. Domain Event Collector

`packages/database/src/unit-of-work/event-collector.ts`:

- `InMemoryEventCollector` — collects events from aggregates during a transaction.
- UoW calls `persistOutbox(tx)` after callback succeeds → writes to `outbox_events`
  table in the SAME transaction → clears collector.
- Flow: aggregate.raise(event) → repository.save() collects → UoW.transaction()
  persists outbox + commits.

### 5. Query Layer (04B.3 — next iteration)

QueryService interfaces already defined in `@workspace/domain/queries`.
Returns DTOs from `@workspace/contracts/dto`. Implementation in 04B.3.

### 6. N+1 Prevention

Every repository uses explicit `getInclude()` returning a Prisma include object.
No lazy loading. Example: ProductRepository includes variants, media, attributes.

### 7. Cursor Pagination

`packages/database/src/types/index.ts` defines `CursorPaginationInput` (after,
before, limit) and `CursorPage<T>` (items, hasNextPage, hasPreviousPage,
startCursor, endCursor). QueryServices will use this in 04B.3.

### 8. Specifications

`packages/database/src/types/index.ts` defines `SpecificationInput<T>`.
Repositories can accept specifications for `find()` operations. Full
implementation when needed by a specific use case.

### 9. Cache Interface

`packages/database/src/cache/index.ts`:

- `CacheRepository` interface — get, set, delete, deletePattern, increment.
- `NoopCacheRepository` — dev default, returns null for all reads.
- `CacheKeys` — consistent key builder (product, category, customer, cart, order).

### 10. Repository Test Suite (04B.2 — final step)

Standardized tests: Create, Update, SoftDelete, Restore, OptimisticLock,
NotFound, Transaction, Outbox. To be implemented with Vitest.

## Consequences

**Positive**

- Prisma is fully decoupled from domain — swap ORMs by replacing mappers + repositories.
- Soft delete, optimistic lock, and outbox are centralized — no per-repository duplication.
- Event collection is automatic — repositories just call `collectEvents(aggregate)`.
- N+1 prevention is structural — `getInclude()` is abstract, must be implemented.
- Cache interface is ready for Redis — wrap repositories with cached versions.

**Negative**

- More files (8 mappers + 12 repositories + base + UoW + types + cache = ~30 files).
- Mapper boilerplate is repetitive — but necessary for decoupling.
- `version` field added to all domain interfaces — small domain change, big safety gain.

## References

- ADR-0009 (Persistence Model — defines what's persisted)
- ADR-0010 (Unit of Work — transaction abstraction)
- ADR-0011 (Query/Command Separation)
- ADR-0013 (Outbox Pattern — event collector persists here)
- `packages/database/src/` (implementation)
