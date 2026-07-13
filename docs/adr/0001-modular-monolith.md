# ADR-0001: Modular Monolith as initial topology

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The platform targets a global dropshipping marketplace with many features (catalog, suppliers, search, cart, checkout, payments, orders, admin, blog, AI, i18n). The team is small and the product surface is volatile. Premature microservices would multiply operational cost without shortening lead time.

Two forces are in tension:

1. **Speed of iteration** — wants a single deployable, one DB, one CI, one mental model.
2. **Long-term scalability** — wants the option to split hot modules out without rewriting their public API.

## Decision

Adopt a **Modular Monolith**: one deployable Next.js application whose internal code is partitioned into modules with strict boundaries. Each module owns its domain, services, repositories, HTTP surface, and UI. Cross-module communication is allowed only through:

- explicit service interfaces (synchronous),
- domain events (asynchronous, in-process pub/sub initially),
- shared read models projected from events.

Direct cross-module database access is forbidden. The schema is partitioned by module prefix (`catalog_*`, `orders_*`, ...) so a future extraction is mechanical.

## Consequences

**Positive**

- Single deploy target → faster CI, simpler ops, single Vercel project.
- Local dev is one `bun run dev`.
- Transactions span modules naturally (no distributed-commit headaches).
- Refactoring across modules is a search-and-replace, not a cross-service migration.

**Negative**

- Discipline required to keep module boundaries clean. Linters and import-boundary rules will be added (ESLint `no-restricted-imports` per module path).
- A runtime crash takes down the whole app — mitigated by Sentry + auto-redeploy.
- Shared schema migration ownership must be explicit (each module owns its tables).

## Alternatives Considered

- **Microservices from day 1** — rejected: too much infra overhead for a small team and an unvalidated product surface. Risks overengineering.
- **Single-layer monolith (no module boundaries)** — rejected: leads to a Big Ball of Mud within 6 months; future extraction becomes a rewrite.
- **Event-sourced system** — rejected for now: useful for audit-heavy domains, but YAGNI until payments/orders actually need it. Domain events remain in-process so the upgrade path is open.

## References

- "Modular Monoliths" — Simon Brown
- "Majestic Monolith" — DHH
- ADR-0002 (workspace layout that enforces boundaries)
