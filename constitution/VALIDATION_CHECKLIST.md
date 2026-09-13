# Validation Checklist — Mandatory Before Responding

> Before completing any task, verify every item. If any fails, fix it before responding to the user.

## Checklist

### 1. Compiles

```bash
bunx tsc --noEmit -p tsconfig.json
```

- 0 errors in modified packages
- Pre-existing errors in unrelated packages are acceptable (document them)

### 2. Tests pass

```bash
bun test packages/domain/src/ packages/database/src/
```

- 0 failures
- If tests were modified, they must pass
- If tests were not modified, they must still pass (no regressions)

### 3. Lint passes

```bash
bunx eslint <modified-files>
```

- 0 errors
- 0 warnings in modified files
- Pre-existing warnings in unmodified files are acceptable

### 4. Build succeeds

```bash
bunx next build
```

- Build completes without errors
- All routes are listed in the output
- Static pages are generated

### 5. Architecture test passes

```bash
bun run test:arch
```

- 0 violations
- The count of checked files should not decrease (new files should be checked)

### 6. Contracts preserved

- All public exports still exist (types, interfaces, functions)
- All API routes still respond with the same status codes
- All event types still exist
- All Prisma models are unchanged (unless explicitly modified)
- If contracts changed, the change is documented in the response

### 7. Imports valid

- All `import` statements resolve to real files
- No circular imports introduced
- No imports from forbidden packages (see ARCHITECTURE_RULES.md)
- No imports of types that do not exist

### 8. Types valid

- No `any` types added without justification
- All branded IDs use `BrandedId<T>` correctly
- All generics are properly typed
- All return types are explicit (no implicit `any`)

### 9. APIs exist

- Every API endpoint referenced in code exists in `src/app/api/`
- Every Prisma model referenced exists in `prisma/schema.prisma`
- Every `@workspace/*` package referenced exists in `packages/`
- Every npm package referenced exists in `package.json` or `node_modules/`

### 10. Documentation consistent

- File header comments match the file's actual content
- Type/interface comments match the type's actual fields
- Registry comments match the registry's actual entries
- Worklog entry is appended (if task produced code changes)

## If any item fails

**Fix it before responding to the user.**

Do not report a task as complete if:
- TypeScript has errors in the modified code
- Tests fail
- Lint has warnings in modified files
- Build fails
- Architecture test has violations
- Public contracts are broken

If a fix is not possible within the current task scope, explicitly state what failed and why, and ask the user how to proceed.
