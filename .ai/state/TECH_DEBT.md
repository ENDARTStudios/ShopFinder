# Tech Debt — ShopFinder

> Consciously accepted technical debt. Each item has a reason and a migration trigger.
> The AI MUST NOT "fix" these without explicit request. They are documented here to prevent spontaneous refactoring.

## Temporary (will be resolved)

| Item | Reason | Migration trigger |
|---|---|---|
| SQLite in development | Lower operational cost; no Docker needed in sandbox | Production deployment (switch to PostgreSQL via `DATABASE_URL`) |
| `typescript.ignoreBuildErrors: true` in next.config.ts | 170+ pre-existing TS errors in `packages/application/`, `packages/bootstrap/`, `packages/auth/` | Complete auth module refactor (add `bcryptjs`, export `getAuthContext`, `hashPassword`) |
| Auth routes disabled (`src/app/api/auth/` → `/tmp/`) | `getAuthContext` not exported from `@workspace/auth`; `bcryptjs` not installed | Better Auth integration (ROADMAP: High priority) |
| Mock ratings/reviews in API | `rating` and `reviewCount` are random values in the API serializer | Real AI Evaluation execution (ROADMAP: Medium priority) |
| CSS gradient product images | No real product images available | Image hosting decision (OPEN_QUESTIONS) + real product image fetching |
| No search index | Search done via Prisma `findMany` + in-memory filtering | Search index technology decision (OPEN_QUESTIONS) |
| No real API credentials | All connector tests use ReplayTransport + fixtures | Configure DigiKey OAuth2 (ROADMAP: High priority) |

## Accepted (permanent trade-offs)

| Item | Reason | Accepted because |
|---|---|---|
| In-memory caches (ManufacturerCache, InferenceCache) | No Redis in dev | Redis is configured for prod via Docker Compose; in-memory is dev-only |
| No GraphQL | REST is sufficient for current API consumers | GraphQL adds complexity without clear benefit at current scale |
| No microservices | Modular monolith is simpler to operate | 15-stage pipeline is already modular; splitting into services adds ops overhead |
| Prisma client generated at build | Not committed to git | Keeps schema changes clean; `prisma generate` runs in build |
| Legacy compat aliases in enrichment/types.ts | Intel/AMD connectors reference old types | Migration to ConnectorDefinition + ConnectorInstance is in progress |

## Refactoring candidates (not urgent)

| Item | Current state | Improvement | Priority |
|---|---|---|---|
| `packages/infrastructure/` connectors | Use legacy types from enrichment | Migrate to ConnectorDefinition + ConnectorInstance | Medium |
| Landing page `products.ts` | Mock data file still exists alongside API | Remove mock file; API is the source | Low |
| `scripts/seed-catalog.ts` | Inline product data | Extract to JSON fixtures | Low |
| Architecture test scope | `infrastructure/` classified as "other" (no rules) | Add rules for infrastructure layer | Low |
