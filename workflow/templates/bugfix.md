# Bugfix Template — ShopFinder

> Copy this template when fixing a bug. Fill in all sections.

## Objective

[One sentence describing the bug being fixed]

## Context

- **Bug description**: [what is wrong]
- **Expected behavior**: [what should happen]
- **Actual behavior**: [what actually happens]
- **Files read**: [list every file read before starting]
- **Root cause**: [what causes the bug — must be identified before fixing]

## Constraints

- Fix the root cause, not the symptom
- Do not introduce new behavior
- Do not change public contracts
- All existing tests must still pass

## Fix

- [What to change and why]
- [File path to modify]

## Acceptance criteria

- [ ] Bug is fixed (expected behavior occurs)
- [ ] TypeScript compiles with 0 errors
- [ ] All existing tests pass (no regressions)
- [ ] ESLint passes with 0 warnings
- [ ] `bunx next build` succeeds
- [ ] `bun run test:arch` passes with 0 violations
- [ ] No new bugs introduced
- [ ] Worklog entry appended

## Validation

```bash
bunx tsc --noEmit -p tsconfig.json
bun test packages/domain/src/
bunx eslint <modified-files>
bunx next build
bun run test:arch
```
