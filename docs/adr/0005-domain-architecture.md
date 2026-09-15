# ADR-0005: Domain Architecture — Bounded Contexts & Aggregates

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The platform spans many concerns: catalog, cart, checkout, orders, payments,
suppliers, customers, marketing, CMS, search, AI. Without explicit bounded
contexts, the domain model degenerates into a "Big Ball of Mud" where every
module knows about every other module's internals. This makes the system
impossible to reason about and blocks future extraction to microservices.

The user feedback on iteration 01 explicitly requested:

- A domain layer (`packages/domain`) with one subdirectory per bounded context.
- Contracts separated into their own package (`packages/contracts`).
- Bounded contexts, aggregates, and domain events defined **before** the
  Design System, so that the UI is shaped by the domain — not the other way
  around.

## Decision

Adopt a **DDD-inspired domain architecture** with the following structure:

### 1. Bounded Contexts (8)

| Context   | Responsibility                                  | Aggregates              |
| --------- | ----------------------------------------------- | ----------------------- |
| Shared    | Base primitives (EntityId, Money, Address, ...) | (none)                  |
| Catalog   | Product definition, variants, categories        | Product, Category       |
| Customer  | Customer identity, addresses, wishlist          | Customer                |
| Cart      | Shopping cart lifecycle                         | Cart                    |
| Checkout  | Order-placement flow                            | CheckoutSession         |
| Orders    | Placed orders, fulfillment, tracking            | Order                   |
| Payments  | Payment intents, transactions, refunds          | Payment                 |
| Suppliers | Supplier identity, fulfillment orders           | Supplier, SupplierOrder |

Each context lives in `packages/domain/src/<context>/` and is importable as
`@workspace/domain/<context>`.

### 2. Aggregate Rules

- Each aggregate has **one** aggregate root — the only entry point to its state.
- Cross-aggregate references are by **EntityId only**, never by object reference.
- Aggregates enforce their own **invariants** in factory functions and (future)
- command methods.
- Aggregates emit **domain events** on state transitions.
- Aggregates are **immutable** from the outside — state changes go through
  methods that return a new aggregate instance (or a Result<T, E>).

### 3. Domain Events

- Every state transition emits a domain event.
- Events are **immutable** and carry the aggregate ID + timestamp + version.
- Events are **in-process** initially (pub/sub within the monolith).
- At trust boundaries (webhooks, API responses), events are validated against
  **Zod schemas** in `@workspace/contracts/events`.
- The event catalog is documented in `docs/domain.md` § 4.

### 4. Contracts Separation

`@workspace/contracts` holds:

- **DTOs** — output shapes for API responses.
- **Event schemas** — Zod schemas for integration contracts.
- **API contracts** — request/response types per endpoint.
- **Input schemas** — Zod validation schemas for API requests.

Contracts depend only on `zod`. They do **not** depend on the domain package.
This prevents circular dependencies: domain → (nothing), contracts → (zod),
services → domain + contracts.

### 5. Layering

```
Route Handler → Application Service → Domain Aggregate → Repository → Prisma
                       │
                       └→ Contracts (DTOs, schemas)
```

Domain imports only from `@workspace/domain/shared`. No Prisma, no Next.js,
no external SDKs. This keeps the domain pure and testable.

## Consequences

**Positive**

- Clear ownership: every concept belongs to exactly one context.
- Future extraction: a context can be pulled into a microservice by
  implementing its event handlers as HTTP consumers and its repository as
  an API client.
- Testability: domain aggregates are pure TypeScript — no mocks needed for
  Prisma, Next.js, or external services.
- Ubiquitous language: the glossary in `docs/domain.md` § 5 is the single
  source of truth for terminology.
- Contracts-first: API consumers can depend on `@workspace/contracts`
  without pulling in the full domain.

**Negative**

- More packages to maintain (domain + contracts + testing + observability + i18n).
- Discipline required: developers must not bypass the aggregate root or
  reach into another context's internals. Lint rules will be added to
  enforce this.
- Eventual consistency: cross-context communication via events means some
  flows are async. This is acceptable — the monolith processes events
  synchronously for now, but the architecture doesn't assume it.

## Alternatives Considered

- **Single domain package (no subcontexts)** — rejected: leads to a
  god-package with no boundaries.
- **Transaction-script (no aggregates)** — rejected: works for simple CRUD
  but breaks down for orders/payments where invariants matter.
- **Event-sourced aggregates** — deferred: the infrastructure cost
  (event store, projections, snapshots) is not justified yet. Domain events
  remain in-process so the upgrade path is open.
- **Contracts inside domain** — rejected: causes circular dependencies when
  the UI imports contracts but not domain logic.

## References

- ADR-0001 (Modular Monolith — this ADR refines the module boundaries)
- ADR-0002 (Bun workspaces — `@workspace/domain` is a workspace package)
- `docs/domain.md` (full context map, aggregate details, event catalog)
- Evans, "Domain-Driven Design" (2003)
- Vernon, "Implementing Domain-Driven Design" (2013)
