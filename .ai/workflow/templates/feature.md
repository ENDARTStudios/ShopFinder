# Feature Template — ShopFinder

> Copy this template when implementing a new feature. Fill in all sections.

## Objective

[One sentence describing what the feature does]

## Context

- **Files read**: [list every file read before starting]
- **Types referenced**: [list existing types used]
- **Interfaces implemented**: [list existing interfaces satisfied]
- **Packages involved**: [list @workspace/* packages touched]

## Constraints

- [What cannot change]
- [Which public contracts must be preserved]
- [Which architecture rules apply]

## Architecture fit

- **Package**: [which package the code belongs in]
- **Pattern**: [which existing pattern to follow]
- **Events**: [which events to emit, if any]
- **Artifacts**: [which artifact types are produced, if any]

## Files

- [ ] [file path to create or modify]
- [ ] [file path to create or modify]

## Acceptance criteria

- [ ] TypeScript compiles with 0 errors
- [ ] ESLint passes with 0 warnings
- [ ] `bunx next build` succeeds
- [ ] `bun run test:arch` passes with 0 violations
- [ ] Public contracts preserved
- [ ] Worklog entry appended

## Validation

```bash
bunx tsc --noEmit -p tsconfig.json
bun test packages/domain/src/
bunx eslint <modified-files>
bunx next build
bun run test:arch
```

## Deliverables

- [Modified/created file list]
- [Worklog entry]
