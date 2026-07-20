# Architecture Map — ShopFinder

> Package dependency map. The architecture test (`scripts/architecture-test.mjs`) enforces these boundaries.

## Dependency graph

```
src/ (Next.js app)
    ↓ imports
    packages/database ← packages/domain ← packages/shared
    packages/contracts ← packages/shared
    packages/database ← packages/contracts
```

## Package responsibilities

### `packages/domain/`
- **Responsibility**: Domain model — types, interfaces, value objects, events, coordinators, policies, registry.
- **Can import from**: `packages/shared` (BrandedId, DomainEvent, etc.)
- **Cannot import from**: `react`, `next`, `@prisma`, `prisma`, `@radix-ui`, `@workspace/database`, `@workspace/ui`, `@workspace/integrations`, `@workspace/analytics`, `@workspace/auth`
- **Key submodules**: `discovery/` (15-stage pipeline + enrichment + knowledge graph), `catalog/`, `cart/`, `checkout/`, `order/`, `payment/`, `customer/`, `supplier/`

### `packages/database/`
- **Responsibility**: Prisma client, repositories, mappers, unit of work.
- **Can import from**: `@workspace/domain`, `@workspace/contracts`, `@workspace/shared`
- **Cannot import from**: `react`, `@radix-ui`, `@workspace/ui`
- **Key files**: `src/client.ts` (PrismaClient singleton), `src/repositories/`, `src/mappers/`, `src/base/base-repository.ts`, `src/unit-of-work/`

### `packages/contracts/`
- **Responsibility**: API DTOs, JSON schemas, event schemas.
- **Can import from**: `@workspace/shared` (type-only)
- **Cannot import from**: `@workspace/database`, `@workspace/ui`, `react`, `next`, `@prisma`

### `packages/shared/`
- **Responsibility**: Base primitives — BrandedId, DomainEvent, EventBus, UnitOfWork, Money, persistence conventions.
- **Can import from**: Nothing (no `@workspace/*` imports)
- **Cannot import from**: Any other `@workspace/*` package

### `src/` (Next.js app)
- **Responsibility**: Web application — pages, API routes, components.
- **Can import from**: Any `@workspace/*` package
- **Key directories**: `src/app/` (App Router), `src/components/` (UI), `src/lib/`, `src/hooks/`

### `packages/infrastructure/` (legacy)
- **Status**: Partially migrated. Contains Intel/AMD manufacturer connectors.
- **Can import from**: `@workspace/domain`
- **Note**: Being migrated to use ConnectorDefinition + ConnectorInstance

## Architecture test

```bash
bun run test:arch
```

Rules enforced by `scripts/architecture-test.mjs`:
1. `packages/domain/**` must NOT import from: react, next, @prisma, prisma, @radix-ui, @workspace/ui, @workspace/database, @workspace/integrations, @workspace/analytics, @workspace/auth
2. `packages/contracts/**` must NOT import from: react, next, @prisma, @workspace/database, @workspace/ui, @workspace/integrations, @workspace/analytics, @workspace/auth
3. `packages/ui/**` must NOT import from: @prisma, @workspace/database, @workspace/integrations
4. `packages/database/**` must NOT import from: react, @radix-ui, @workspace/ui
5. `packages/testing/**` must NOT import from: react, @radix-ui

Result must always be: **0 violations**.
