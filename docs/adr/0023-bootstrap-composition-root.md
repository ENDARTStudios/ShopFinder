# ADR-0023: Bootstrap Composition Root

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The application has 21 packages with many interdependent components:
PrismaClient, UnitOfWork, RepositoryFactory, CommandBus, QueryBus, EventBus,
ProviderRegistry, JobRegistry, ConsumerRegistry, EntityCache, QueryCache.

Without a composition root, each Route Handler or Application Service would
need to manually wire these dependencies. This leads to:

- Inconsistent initialization (some components might not be wired).
- Difficulty swapping implementations (SQLite → PostgreSQL, NoopCache → Redis).
- Test setup boilerplate.
- Hidden dependencies (components created ad-hoc, not visible).

The user explicitly recommended a single Bootstrap Composition Root as the
last architectural artifact before feature slices.

## Decision

Create `@workspace/bootstrap` package with a `Container` singleton.

### Container responsibilities:

1. **Database**: instantiate PrismaClient, PrismaRepositoryFactory, PrismaUnitOfWork.
2. **Buses**: instantiate CommandBus + QueryBus, register all handlers with schemas + authorize functions.
3. **Events**: get EventBus singleton, get ConsumerRegistry, wire consumers to bus.
4. **Providers**: get ProviderRegistry, register provider adapters.
5. **Jobs**: get JobRegistry, register background jobs.
6. **Cache**: get EntityCache + QueryCache singletons.

### API:

- `createContainer()` — creates and caches the singleton.
- `getContainer()` — returns the singleton (creates if needed).
- `resetContainer()` — clears the singleton (for tests).
- `getCommandBus()` — convenience accessor.
- `getQueryBus()` — convenience accessor.
- `getUnitOfWork()` — convenience accessor.
- `getPrisma()` — convenience accessor.

### Usage in Route Handlers:

```ts
import { getCommandBus } from "@workspace/bootstrap";
const bus = getCommandBus();
const result = await bus.execute("catalog.product.create", body, ctx);
```

### Usage in tests:

```ts
import { createContainer, resetContainer } from "@workspace/bootstrap";
beforeEach(() => resetContainer());
const container = createContainer();
```

### Registration modules:

- `buses.ts` — registers Command + Query handlers (with schemas + policies).
- `events.ts` — registers event consumers (placeholder for epic-specific consumers).
- `jobs.ts` — registers background jobs (placeholder for epic-specific jobs).
- `providers.ts` — registers provider adapters (placeholder for epic-specific providers).

## Consequences

**Positive**

- Single point of initialization — no manual composition anywhere else.
- Easy to swap implementations (change createContainer, everything follows).
- Easy to test (resetContainer + createContainer in beforeEach).
- All dependencies are explicit and visible in one place.
- Route Handlers are one-liners: `getCommandBus().execute(...)`.

**Negative**

- Bootstrap package depends on all other packages (high fan-out). Acceptable —
  this is the composition root, its job is to know everything.
- Circular dependency risk if bootstrap imports from a package that imports
  bootstrap. Mitigated: bootstrap is only imported by the app's entry points
  (Route Handlers, middleware, server config), never by domain/database/etc.

## Alternatives Considered

- **Manual composition per Route Handler** — rejected: repetitive, error-prone,
  inconsistent.
- **DI container library (Inversify, tsyringe)** — rejected: adds a dependency
  for a simple singleton pattern. TypeScript's type system is sufficient.
- **Next.js plugins/middleware for composition** — rejected: too coupled to
  the framework. The bootstrap package works in any runtime.

## References

- ADR-0017 (Application Layer — CommandBus/QueryBus are wired here)
- ADR-0018 (Providers — ProviderRegistry is wired here)
- ADR-0019 (Jobs — JobRegistry is wired here)
- ADR-0021 (Events — ConsumerRegistry is wired here)
- `packages/bootstrap/src/` (implementation)
