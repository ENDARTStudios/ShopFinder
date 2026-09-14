# ADR-0016: Query Layer & Read Models

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

04B.2 delivered the repository layer (writes). 04B.3 delivers the query layer
(reads). The user provided 10 recommendations for query layer quality:

1. Specification Translator — translate domain Specs to Prisma WhereInput
2. Repository Contract Tests — abstract suite per repository
3. Mapper Snapshot Tests — round-trip aggregate→prisma→aggregate equality
4. Query DTOs — never return aggregates, always DTOs
5. Search Projection — separate projection for Meilisearch/Typesense/OpenSearch
6. Read Models — projections for Catalog, Checkout, OrderTimeline, Dashboards
7. Repository Metrics — OpenTelemetry instrumentation (NoopMetrics initially)
8. Query Cache — separate EntityCache from QueryCache
9. Bulk Operations — contracts for bulkInsert/bulkUpdate/bulkSoftDelete
10. Batch Loader — for GraphQL/BFF future

## Decision

Implement all 10 in `@workspace/database`:

### 1. Specification Translator (`specifications/`)

`ProductSpecTranslator` and `OrderSpecTranslator` translate domain
`Specification<T>` to `Prisma.WhereInput`. Repositories accept Specs without
knowing Prisma. Specs that can't be translated to SQL are evaluated in-memory.

### 2-3. Contract & Snapshot Tests (`tests/`)

`runRepositoryContractTests()` — abstract suite testing Create, Update,
SoftDelete, Restore, OptimisticLock, NotFound. `runMapperSnapshotTest()` —
round-trip aggregate→prisma→aggregate equality check.

### 4. Query DTOs (`queries/`)

6 query services returning DTOs from `@workspace/contracts/dto`:
ProductQueryService, CategoryQueryService, CustomerQueryService,
CartQueryService, OrderQueryService, SupplierQueryService. Never return
aggregates.

### 5. Search Projection (`read-models/`)

`SearchProductProjection` — denormalized, flattened projection for search
engines. Built by `ProductQueryService.buildSearchProjection()`. Indexes in
Meilisearch/Typesense/OpenSearch without touching ProductRepository.

### 6. Read Models (`read-models/`)

5 read models: `CatalogReadModel`, `CheckoutReadModel`, `OrderTimelineReadModel`,
`CustomerDashboardReadModel`, `AdminDashboardReadModel`. Avoid repetitive joins
by pre-computing projections.

### 7. Repository Metrics (`metrics/`)

`RepositoryMetrics` interface + `NoopRepositoryMetrics` (dev) +
`ConsoleRepositoryMetrics` (debug). `withMetrics()` decorator wraps every
operation with duration/rows/cacheHit/error tracking. Ready for OpenTelemetry.

### 8. Query Cache (`cache/query-cache.ts`)

Separate `EntityCache` (single entity by ID) from `QueryCache` (query results
by signature with tag-based invalidation). Both have Noop + InMemory
implementations. `buildQuerySignature()` for consistent cache keys.

### 9. Bulk Operations (`bulk/`)

`BulkOperations<TAggregate>` interface with `bulkInsert`, `bulkUpdate`,
`bulkSoftDelete`, `bulkRestore`, `bulkUpsert`. `NoopBulkOperations` throws
`NotImplementedError` — interfaces are stable for future implementation.

### 10. Batch Loader (`batch/`)

`createBatchLoader<K,V>()` — collects individual `load()` calls within a
request and batches them into a single DB query. Solves N+1 at the
data-fetching layer. `BatchLoaderFactory` interface for pre-built loaders
(Product, Customer, Order, Supplier, Variant).

## Consequences

**Positive**

- Query layer fully decoupled from domain — front-end never depends on aggregates.
- Search engine integration is a projection, not a repository concern.
- Metrics, cache, and batch loading are structurally ready — no retrofitting.
- Contract tests ensure all repositories behave consistently.
- Read models avoid repetitive joins in common UI scenarios.

**Negative**

- More files (specifications, metrics, cache, bulk, batch, read-models, queries, tests = ~20 new files).
- Some interfaces are NotImplemented initially (bulk operations) — acceptable,
  they'll be implemented when needed without interface changes.
- Query cache invalidation strategy needs care (tag-based helps).

## References

- ADR-0011 (Query/Command Separation — this implements the query side)
- ADR-0015 (Repository Implementation Patterns — query layer builds on this)
- `packages/database/src/queries/` (6 query services)
- `packages/database/src/read-models/` (5 read models + search projection)
- `packages/database/src/{specifications,metrics,cache,bulk,batch,tests}/`
