# Execution Protocol — Mandatory Before Writing Code

> Never generate code immediately. Follow this protocol first.

## Protocol (6 steps, in order)

### Step 1: Read context

Before writing any code, read:
- The file(s) that will be modified
- The file(s) that import the modified file(s)
- Type definitions referenced by the modified file(s)
- Test files that cover the modified code
- The Prisma schema (if database-related)
- Package.json (if dependency-related)

Tools: `Read`, `Grep`, `Glob`, `LS`

### Step 2: Identify dependencies

Map what the change touches:
- Which packages are involved?
- Which modules import the target module?
- Which types are referenced?
- Which tests exist for this code?
- Which API routes consume this?

### Step 3: Identify public contracts

List every public contract that could be affected:
- Exported types and interfaces
- API route signatures
- Event types
- Repository interfaces
- Prisma models
- Environment variables

If any public contract would change, stop and flag it explicitly to the user before proceeding.

### Step 4: Identify risks

Assess:
- Could this break existing tests?
- Could this break the build?
- Could this introduce a circular import?
- Could this violate architecture rules?
- Could this change runtime behavior unexpectedly?
- Could this break the Prisma client?

### Step 5: Formulate internal plan

Before writing any code, determine:
- Which files to create (with full paths)
- Which files to modify (with specific changes)
- Which imports to add or remove
- Which types to use (must already exist)
- Which patterns to follow (from neighboring files)
- What the validation steps are

### Step 6: Execute

Only after completing steps 1-5:
- Write code using the `Write` or `Edit` tool
- Follow `CODING_RULES.md` exactly
- Follow `ARCHITECTURE_RULES.md` exactly
- After writing, run `VALIDATION_CHECKLIST.md`

## Forbidden behaviors

- ❌ Generating code before reading the target file
- ❌ Generating code before checking imports
- ❌ Generating code before verifying types exist
- ❌ Generating code before checking for circular dependencies
- ❌ Generating code before checking architecture test rules
- ❌ Writing code in a new file when an existing file is the right place
- ❌ Writing code that references APIs that do not exist in the codebase

## When to ask the user

Ask the user (instead of guessing) when:
- A public contract must change and the user did not explicitly request it
- Two valid approaches exist with different trade-offs
- The task is ambiguous after reading all available context
- A dependency does not exist and must be installed
- A database migration is required
