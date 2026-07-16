# Architecture Rules — Preservation and Extension

> The ShopFinder architecture is consolidated. Changes require justification.

## 1. Never alter architecture without necessity

The architecture is:
- **Modular monolith** with `@workspace/*` packages
- **15-stage discovery pipeline** (DiscoverySignal → BusinessMetricsSnapshot)
- **Event-driven** — stages communicate via events, not direct calls
- **Immutable artifacts** — every artifact has ArtifactMetadata and is never modified
- **Append-only** raw store
- **Domain layer** has zero infrastructure imports (no Prisma, no React, no Next.js)
- **Infrastructure layer** implements domain interfaces without altering them

If a change is proposed that alters any of these, it must be justified with:
- The specific problem being solved
- Why the current architecture cannot solve it
- The migration path

## 2. Always reuse existing modules

Before creating a new module:
- Search for existing modules that solve the same or similar problem
- Check if an existing interface can be extended
- Check if an existing repository can be reused
- Check if an existing event type can be adopted

Search commands:
```
Grep: "interface.*Repository" in packages/
Grep: "export.*interface" in packages/domain/
Glob: packages/domain/src/**/*.ts
```

## 3. Always prefer

In order of preference:

1. **Composition** over inheritance
2. **Reuse** over duplication
3. **Low coupling** — modules should not know about each other's internals
4. **High cohesion** — a module should do one thing well
5. **Explicit** over implicit (no magic, no reflection, no dynamic imports unless necessary)
6. **Flat** over nested (avoid deeply chained property access)

## 4. Never create abstractions in advance

- Do not create interfaces "for future use"
- Do not create factory patterns unless there are 2+ implementations
- Do not create strategy patterns unless there are 2+ strategies
- Do not create plugin systems unless there are 2+ plugins

Abstractions should be extracted from working code, not anticipated.

## 5. Never overengineer

- Do not add configuration options that have only one value
- Do not add extensibility points that are not used
- Do not add logging that is never read
- Do not add caching that is never needed
- Do not add pagination to queries that return < 100 items

## 6. Package boundaries (enforced by architecture test)

```
packages/domain/         — NO imports from: react, next, @prisma, @workspace/database, @workspace/ui
packages/contracts/      — NO imports from: react, next, @prisma, @workspace/database
packages/database/       — CAN import from: @workspace/domain, @workspace/contracts
packages/contracts/      — CAN import from: @workspace/shared
packages/shared/         — NO imports from any other @workspace/* package
src/                     — CAN import from: any @workspace/* package
```

The architecture test (`scripts/architecture-test.mjs`) enforces these rules. It must always pass with 0 violations.

## 7. Pipeline stage boundaries

Each of the 15 pipeline stages:
- Produces exactly one new artifact type
- Does not modify the previous artifact
- Communicates via events
- Has its own coordinator, repository, and event types
- Is independently testable

Never:
- Call a later stage from an earlier stage
- Call an earlier stage from a later stage
- Share mutable state between stages
- Skip the event bus for inter-stage communication

## 8. Domain purity

The domain layer (`packages/domain/`) must contain:
- ✅ Types, interfaces, value objects, domain events, coordinators, policies
- ❌ No Prisma imports
- ❌ No React imports
- ❌ No Next.js imports
- ❌ No HTTP client imports
- ❌ No file system imports
- ❌ No environment variable reads

Infrastructure concerns belong in `packages/database/` or `src/`.

## 9. Enrichment module structure

The enrichment module (`packages/domain/src/discovery/enrichment/`) contains:
- `types.ts` — all type contracts + legacy compat aliases
- `registry.ts` — MANUFACTURERS, CONNECTOR_DEFINITIONS, CONNECTOR_INSTANCES, INFORMATION_SOURCES, MANUFACTURER_VERSIONS, PRODUCT_ATTRIBUTES, KNOWLEDGE_GRAPH
- `ontology.ts` — ONTOLOGY (AttributeDefinition[]), resolveAttribute()
- `knowledge-graph.ts` — KnowledgeNode, KnowledgeEdge, query helpers
- `index.ts` — barrel exports

Never split these into more files unless a file exceeds 2000 lines.
