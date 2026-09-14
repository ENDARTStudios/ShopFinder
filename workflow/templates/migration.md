# Migration Template — ShopFinder

> Copy this template when performing a data or schema migration. Fill in all sections.

## Objective

[One sentence describing what the migration achieves]

## Context

- **Current state**: [what exists today — schema, data, types]
- **Target state**: [what should exist after migration]
- **Files read**: [list every file read before starting]
- **Data volume**: [how many records are affected]

## Constraints

- Data MUST NOT be lost
- Backward compatibility MUST be preserved during migration
- Rollback plan MUST exist
- Prisma schema changes MUST be reflected in `prisma/schema.prisma`
- Seed script MUST be updated if schema changes

## Migration plan

1. [Step: schema change]
2. [Step: data migration script]
3. [Step: code update]
4. [Step: verification]
5. [Step: rollback plan]

## Files

- [ ] `prisma/schema.prisma` — [what changes]
- [ ] `scripts/seed-catalog.ts` — [what changes]
- [ ] [code file to modify]

## Acceptance criteria

- [ ] Prisma schema compiles
- [ ] `bunx prisma generate` succeeds
- [ ] Seed script runs without errors
- [ ] TypeScript compiles with 0 errors
- [ ] All existing tests pass
- [ ] `bunx next build` succeeds
- [ ] No data loss
- [ ] Rollback plan documented
- [ ] Worklog entry appended

## Validation

```bash
bunx prisma generate
bun run scripts/seed-catalog.ts
bunx tsc --noEmit -p tsconfig.json
bun test packages/domain/src/
bunx next build
bun run test:arch
```

## Rollback plan

[Describe how to undo the migration if something goes wrong]
