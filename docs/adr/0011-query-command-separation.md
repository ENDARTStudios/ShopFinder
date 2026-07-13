# ADR-0011: Query / Command Separation

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The Repository pattern (ADR-0005) reconstitutes full aggregates. This is
correct for writes (we need the full aggregate to enforce invariants), but
inefficient for reads:

- A product list page needs 24 items with title, price, primary image, rating.
  Reconstituting 24 full Product aggregates (with variants, attributes, media)
  to project them into list items is wasteful.
- An admin dashboard needs `COUNT(*) GROUP BY status` — reconstituting
  aggregates to count them is absurd.
- Search and faceted navigation need denormalized read models, not aggregates.

The user explicitly recommended separating Repository (writes) from
QueryService (reads) from the start, even without full CQRS.

## Decision

Define **QueryService** interfaces in `@workspace/domain/queries`, separate
from Repository interfaces in `@workspace/domain/repositories`.

### Responsibility split

| Aspect       | Repository                              | QueryService                                                               |
| ------------ | --------------------------------------- | -------------------------------------------------------------------------- |
| Purpose      | Write + aggregate reconstitution        | Read + projections                                                         |
| Returns      | Domain aggregates (`Product`, `Order`)  | DTOs (`ProductListItemDTO`, `OrderDetailDTO`)                              |
| Methods      | `save`, `delete`, `findById`, `restore` | `list`, `detail`, `related`, `trending`, `countByStatus`, `revenueSummary` |
| Transaction  | Inside `UnitOfWork.transaction()`       | Outside transactions (read-only)                                           |
| Source       | Primary database (always)               | Primary, replica, search index, or materialized view                       |
| Optimization | Faithful aggregate reconstitution       | Denormalized, indexed, cached                                              |

### Interfaces (5 query services)

1. **ProductQueryService** — list, detail, related, trending, count
2. **CategoryQueryService** — list, tree, findBySlug
3. **CustomerQueryService** — profile, list, orderHistory
4. **CartQueryService** — active, itemCount
5. **OrderQueryService** — detail, detailByNumber, list, countByStatus, revenueSummary
6. **SupplierQueryService** — list, detail, forProduct

### Why not full CQRS?

Full CQRS uses separate write and read models (often separate databases),
with event handlers projecting writes into read stores. This is powerful but
adds:

- An event store.
- Projection handlers.
- Read model consistency management (eventual consistency).
- Operational complexity.

For the monolith phase, we keep a single database but separate the interfaces.
The read side can be optimized independently (add a materialized view, point
`OrderQueryService.list` at a replica, cache `ProductQueryService.trending`
in Redis) without touching write-side code.

When the platform needs full CQRS (e.g. search via Meilisearch as a read
model), the upgrade is mechanical: implement a new `ProductQueryService`
that reads from Meilisearch instead of Postgres. The interface is unchanged.

## Consequences

**Positive**

- Read queries are fast — no aggregate reconstitution overhead.
- Read models can be denormalized or cached without affecting writes.
- Clear separation of concerns: writes enforce invariants; reads optimize UX.
- Future CQRS upgrade is mechanical (swap implementation, not interface).
- Query Services return DTOs from `@workspace/contracts` — type-safe contracts.

**Negative**

- Two interfaces per context (Repository + QueryService) — more code.
- Potential for drift: if a Repository method and a QueryService method
  return slightly different shapes, the UI sees inconsistency. Mitigated by
  both returning DTOs (QueryService) or aggregates that project to the same
  DTOs (Repository).
- Read models can become stale if projected from events. Not an issue now
  (same database), but will need attention when CQRS is introduced.

## Alternatives Considered

- **Repository only (writes + reads)** — rejected: aggregate reconstitution
  is too expensive for list views; no room for read-side optimization.
- **Full CQRS from day 1** — rejected: YAGNI. Adds event store + projections
  before the platform needs them. The interface separation keeps the path open.
- **Read directly from Prisma in Route Handlers** — rejected: bypasses the
  domain layer, loses type safety (no DTO contracts), blocks future
  optimization.

## References

- ADR-0005 (Domain Architecture — aggregates vs projections)
- ADR-0009 (Persistence Model — Repository ↔ Table mapping)
- ADR-0010 (Unit of Work — transactions are for writes only)
- `packages/domain/src/queries/` (interfaces)
- `packages/contracts/src/dto/` (return types)
