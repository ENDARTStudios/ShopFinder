# Refactor Template — ShopFinder

> Copy this template when refactoring existing code. Fill in all sections.

## Objective

[One sentence describing what the refactor achieves]

## Context

- **Files read**: [list every file read before starting]
- **Current behavior**: [what the code does today]
- **Why refactor**: [what problem the current code has — must be a real problem, not preference]
- **Risk level**: [low / medium / high — and why]

## Constraints

- Public contracts MUST be preserved (types, exports, API routes, events)
- All existing tests MUST still pass
- Architecture test MUST pass with 0 violations
- No behavioral change (same inputs → same outputs)

## Migration plan

- [Step 1: what to change]
- [Step 2: what to change]
- [Step 3: verification]

## Files

- [ ] [file path to modify]
- [ ] [file path to modify]

## Acceptance criteria

- [ ] TypeScript compiles with 0 errors
- [ ] All existing tests pass (no regressions)
- [ ] ESLint passes with 0 warnings
- [ ] `bunx next build` succeeds
- [ ] `bun run test:arch` passes with 0 violations
- [ ] No behavioral change (same inputs → same outputs)
- [ ] Public contracts preserved
- [ ] Worklog entry appended

## Validation

```bash
bunx tsc --noEmit -p tsconfig.json
bun test packages/domain/src/ packages/database/src/
bunx eslint <modified-files>
bunx next build
bun run test:arch
```
