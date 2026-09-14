# Coding Rules — Code Quality Standards

> All code must be complete, compilable, and follow existing style. No exceptions.

## 1. Complete code only

- ✅ Full implementations with real logic
- ❌ No pseudocode
- ❌ No `// TODO` comments
- ❌ No `// FIXME` comments
- ❌ No `// placeholder` comments
- ❌ No `pass` statements (Python)
- ❌ No empty function bodies
- ❌ No `throw new Error("not implemented")`

If a function is not yet needed, do not create it. If it is needed, implement it fully.

## 2. No unnecessary mocks

- Mocks are acceptable in tests when the real dependency is an external API
- Mocks are forbidden in production code
- If a real implementation is possible, use it
- Test fixtures (JSON files) are acceptable and preferred over inline mocks

## 3. No redundant comments

Comments should explain **why**, not **what**:

```typescript
// ✅ Good: explains the reasoning
// S is 10px taller than F because curved letters appear shorter (optical correction)
const S_HEIGHT = 210;
const F_HEIGHT = 200;

// ❌ Bad: restates the code
// Set the height of S to 210
const S_HEIGHT = 210;
```

## 4. Always produce compilable code

- TypeScript must compile with `bunx tsc --noEmit` and 0 errors
- ESLint must pass with 0 warnings
- Next.js build must succeed
- No `any` types unless absolutely necessary (and documented why)
- All imports must resolve
- All types must exist

## 5. Always respect existing style

Before writing code in a file, read it and match:
- Indentation (spaces vs tabs)
- Quote style (single vs double)
- Semicolon usage
- Import ordering
- Naming conventions (camelCase, PascalCase, UPPER_SNAKE)
- File header comment style
- Export style (named vs default)

The ShopFinder codebase uses:
- **Indentation**: 2 spaces
- **Quotes**: Double quotes for strings
- **Semicolons**: Always
- **Imports**: Named exports, grouped by source
- **Types**: `interface` for object shapes, `type` for unions/aliases
- **Constants**: `UPPER_SNAKE_CASE` for registry arrays, `camelCase` for functions
- **Files**: `kebab-case.ts` for modules, `PascalCase.tsx` for components

## 6. Script persistence rule

Scripts longer than ~10 lines must be saved to a file under `scripts/` before execution. Never run long scripts inline with `python -c "..."` or `bash -c "..."`. This ensures:
- Reproducibility
- Ability to edit and re-run on failure
- Audit trail

## 7. File path conventions

All files must live under `/home/z/my-project/`:
- `scripts/` — generation scripts
- `download/` — final deliverables
- `packages/` — workspace packages
- `src/` — Next.js application
- `public/` — static assets
- `prisma/` — database schema
- `docs/` — documentation
- `.ai/` — AI engineering directives (this directory)

Never write to `/tmp`, `~`, or system directories.

## 8. Error handling

- Always handle errors explicitly
- Never swallow errors silently
- Use typed errors when possible
- Log errors with context (what operation, what input)
- Return meaningful error messages to API callers

## 9. Naming

- **Branded IDs**: `BrandedId<"ManufacturerId">` — compile-time type safety
- **Events**: `domain.aggregate.event_type` (e.g., `discovery.resolution.identity_resolved`)
- **Artifacts**: PascalCase (e.g., `CanonicalProduct`, `EnrichedCanonicalProduct`)
- **Registry arrays**: UPPER_SNAKE (e.g., `MANUFACTURERS`, `CONNECTOR_DEFINITIONS`)
- **Helper functions**: camelCase (e.g., `routeBrandToManufacturer`, `getAuthorityScore`)
