# Conventions — ShopFinder

> All naming, formatting, and structural conventions. Follow existing patterns in the codebase.

## File naming

| Type | Convention | Example |
|---|---|---|
| Domain modules | `kebab-case.ts` | `raw-store/types.ts`, `enrichment/registry.ts` |
| React components | `PascalCase.tsx` | `ProductCard.tsx`, `SiteFooter.tsx` |
| API routes | `route.ts` in `kebab-case/` dirs | `api/catalog/route.ts` |
| Test files | `*.test.ts` | `normalizer.test.ts` |
| Fixtures | `*.json` in `fixtures/` | `fixtures/ark-i9-14900k.json` |
| Scripts | `kebab-case.ts` or `.py` | `seed-catalog.ts`, `generate-icons.py` |
| Config | `*.config.mjs` or `*.json` | `eslint.config.mjs`, `tsconfig.json` |

## Type naming

| Category | Convention | Example |
|---|---|---|
| Interfaces | `PascalCase` | `Manufacturer`, `KnowledgeNode` |
| Type aliases | `PascalCase` | `ManufacturerTier`, `CapabilityLevel` |
| Branded IDs | `PascalCase` ending in `Id` | `ManufacturerId`, `ConnectorId` |
| Enums (union) | `PascalCase` | `"healthy" \| "degraded" \| "down"` |
| Constants (registry) | `UPPER_SNAKE_CASE` | `MANUFACTURERS`, `ONTOLOGY` |
| Functions | `camelCase` | `routeBrandToManufacturer`, `getAuthorityScore` |
| Event types | `domain.aggregate.event_type` | `discovery.resolution.identity_resolved` |

## ID conventions

```typescript
// Branded IDs — compile-time type safety
type ManufacturerId = BrandedId<"ManufacturerId">;
type ConnectorId = BrandedId<"ConnectorId">;

// Generation
const id = `mfr_${code}` as unknown as ManufacturerId;
const id = `cdef_${code}_${kind}` as unknown as ConnectorDefinitionId;
```

## Event naming

Format: `domain.aggregate.event_type`

```
discovery.resolution.identity_resolved
discovery.resolution.conflict_detected
discovery.enrichment.requested
discovery.enrichment.applied
discovery.enrichment.skipped
```

## Artifact naming

All pipeline artifacts use PascalCase:
- `DiscoverySignal`, `DiscoveryJob`, `RawProductRecord`, `NormalizedProductRecord`
- `SimilarityCluster`, `CanonicalProduct`, `EnrichedCanonicalProduct`
- `EvaluatedProduct`, `CompliantProduct`, `CatalogProduct`, `PublicationRecord`
- `PricingSnapshot`, `RankingRecord`, `StageMetrics`, `BusinessMetricsSnapshot`

## Registry arrays

```typescript
export const MANUFACTURERS: ReadonlyArray<Manufacturer> = [...];
export const CONNECTOR_DEFINITIONS: ReadonlyArray<ConnectorDefinition> = [...];
export const CONNECTOR_INSTANCES: ReadonlyArray<ConnectorInstance> = [...];
export const ONTOLOGY: ReadonlyArray<AttributeDefinition> = [...];
export const KNOWLEDGE_GRAPH: KnowledgeGraph = { nodes, edges };
```

## Code style

- **Indentation**: 2 spaces
- **Quotes**: Double quotes for strings
- **Semicolons**: Always
- **Trailing commas**: Yes (in multi-line objects/arrays)
- **Imports**: Named exports, grouped by source (external → `@workspace/*` → relative)
- **Export style**: Named exports (no default exports except for Next.js pages/layouts)
- **`readonly`**: All interface properties are `readonly`
- **`const`**: Always prefer `const` over `let`; never use `var`

## Prisma conventions

- All tables: `id String @id @default(cuid())`
- All tables: `createdAt`, `updatedAt`, `deletedAt?` (soft delete)
- Money: `amountMinorUnits BigInt` + `currencyCode String` (never Float/Decimal)
- JSON: `Json` type (SQLite maps to String internally)
- Foreign keys: `RESTRICT` by default, `SET NULL` for optional

## Git conventions

- Conventional commits via commitlint: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Branch protection + CODEOWNERS
- Husky pre-commit: lint-staged (ESLint + Prettier on staged files)
