# Known Limitations — ShopFinder

> These are known issues. Do not attempt to "fix" them unless explicitly asked. They are documented here so the AI does not waste time rediscovering them.

## Infrastructure

| Limitation | Status | Details |
|---|---|---|
| **Docker not available** | Permanent (sandbox) | `docker` command not found. PostgreSQL/MinIO/Redis run via Docker Compose in production only. Dev uses SQLite. |
| **Auth routes disabled** | Temporary | `src/app/api/auth/` and `src/app/(auth)/` moved to `/tmp/` due to `getAuthContext` not exported from `@workspace/auth`. Build fails if these are in `src/`. |
| **No PostgreSQL in dev** | By design | Dev uses SQLite (`db/custom.db`). Prisma schema uses no `@db.*` decorators to keep providers swappable. |
| **No Redis in dev** | By design | BullMQ queues are scaffolded but not running in dev. Workers are tested via fixtures. |

## Code

| Limitation | Status | Details |
|---|---|---|
| **170+ TS errors in non-enrichment packages** | Pre-existing | Errors in `packages/application/`, `packages/bootstrap/`, `packages/auth/` (missing `bcryptjs`, missing exports). `next.config.ts` has `typescript.ignoreBuildErrors: true`. |
| **`packages/infrastructure/` partially migrated** | In progress | Intel/AMD manufacturer connectors reference legacy types from `enrichment/types.ts`. Legacy compat aliases added to maintain compilation. Full migration to `ConnectorDefinition` + `ConnectorInstance` pending. |
| **`@workspace/auth` incomplete** | Pre-existing | Missing `getAuthContext`, `hashPassword` exports. `bcryptjs` not installed. |
| **`@workspace/bootstrap` missing exports** | Pre-existing | `CreateProductCommand`, `RegisterCustomerCommand`, etc. not exported from `@workspace/application`. |
| **Architecture test scope** | Known | `packages/infrastructure/` is classified as `"other"` (no forbidden rules). Only `domain`, `contracts`, `ui`, `database`, `integrations`, `testing` layers are checked. |

## Data

| Limitation | Status | Details |
|---|---|---|
| **22 products in catalog** | Seeded | `scripts/seed-catalog.ts` populates SQLite with 22 products, 67 offers, 16 categories, 7 suppliers. Real connectors not yet executed against live APIs. |
| **No search index** | Not implemented | No Elasticsearch/Meilisearch/Typesense. Search is done via Prisma `findMany` with in-memory filtering. |
| **Mock ratings/reviews** | Seeded | `rating` and `reviewCount` are random mock values in the API serializer. Not from AI Evaluation. |
| **No real AI calls** | Not executed | InferenceProvider interface exists but has never called OpenAI with real credentials. |

## Landing page

| Limitation | Status | Details |
|---|---|---|
| **"Comparar" button** | No handler | The "Comparar" button on product cards has no onClick handler. Does not navigate to a comparison page. |
| **"Entrar" button** | No handler | The "Entrar" button in the header has no onClick handler. Auth routes are disabled. |
| **Suggestion chips** | Client-side filter | Suggestion chips in the Hero filter the product list client-side via `onSearch`. No server-side search. |
| **Product images** | CSS gradients | No real product images. Each product has a `imageGradient` (CSS linear-gradient) and `imageLabel` (text). |

## Connectors

| Limitation | Status | Details |
|---|---|---|
| **No live API credentials** | Not configured | No real API keys for Amazon, DigiKey, Intel, AMD, etc. All connector tests use ReplayTransport + fixtures. |
| **Chinese manufacturer connectors** | Scraper-based | Colorful, Huananzhi, DeepCool, Jonsbo use `scraper` kind (HTML scraping), not official APIs. |
| **Huananzhi connector degraded** | Known | 87.2% success rate, 1850ms latency. Intermittent failures from scraper. |

## Do NOT fix without explicit request

- The 170+ TS errors in non-enrichment packages
- The disabled auth routes
- The missing `bcryptjs` dependency
- The `@workspace/auth` incomplete exports
- The `@workspace/bootstrap` missing command exports
- The mock ratings/reviews in the API
- The missing search index
- The "Comparar" and "Entrar" buttons without handlers
