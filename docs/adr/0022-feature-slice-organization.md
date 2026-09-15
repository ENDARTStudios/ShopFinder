# ADR-0022: Feature Slice Organization

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

Iterations 01-05 built horizontal infrastructure layers (domain, persistence, application, etc.). The architecture is now mature. Continuing horizontal would delay user-visible features. The user explicitly recommended switching to vertical feature slices.

## Decision

Switch from horizontal (by layer) to vertical (by feature) development. Each Epic delivers a complete feature slice:

```
UI → Route Handler → Application → Repository → Prisma
```

Epic order:

1. **Epic 1 — Identity**: Auth.js, login/logout, session, RBAC, admin bootstrap.
2. **Epic 2 — Supplier**: Provider SDK, OAuth, sync jobs, webhooks, import products.
3. **Epic 3 — Catalog**: CRUD, variants, offers, inventory, search, admin UI, public API.
4. **Epic 4 — Cart**.
5. **Epic 5 — Checkout**.
6. **Epic 6 — Orders**.
7. **Epic 7 — Payments**.
8. **Epic 8 — Storefront**.

Architecture is now frozen. New features add code; they don't alter the base.

## Consequences

**Positive**: User-visible features delivered sooner. Architecture validated by real use. Less overengineering risk.
**Negative**: Some shared infrastructure may need retrofitting when a feature demands it. Acceptable — the architecture is flexible enough.

## References

- ADRs 0001-0021 (the frozen architecture)
- `packages/` (20 packages — the structural foundation)
