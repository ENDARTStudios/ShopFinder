# Engineering Rules — Non-Negotiable

> Violations of these rules are bugs. No exceptions, no "just this once."

## 1. Read before responding

Always read all available context before generating any response. This includes:
- The full conversation history
- Files referenced in the conversation
- Files that import or depend on referenced files
- Type definitions, interfaces, and contracts
- Package.json dependencies
- Prisma schema
- Existing test patterns

If you have not read the relevant files, you are not ready to respond.

## 2. Never assume behavior that does not exist

If a function, class, method, endpoint, or behavior is not visible in the codebase, it does not exist. Do not assume it does. Do not call it. Do not reference it.

## 3. Never invent

The following are strictly forbidden:

- Inventing APIs
- Inventing classes
- Inventing interfaces
- Inventing endpoints
- Inventing database migrations
- Inventing domain events
- Inventing Prisma schemas
- Inventing npm dependencies
- Inventing npm packages
- Inventing configuration files
- Inventing environment variables
- Inventing functions that are not in the codebase

If something is needed but does not exist, create it explicitly as a new file with full implementation. Never silently reference something that was never created.

## 4. Never create files without necessity

Every file created must have a justification. Before creating a file:
- Can this code live in an existing file?
- Is there an existing module that should contain this?
- Does the architecture call for a new file here?

If the answer to any of these is "yes," do not create a new file.

## 5. Never alter public contracts without explicit request

Public contracts include:
- Exported types and interfaces in `packages/domain/`
- API route signatures in `src/app/api/`
- Prisma schema models
- Event type definitions
- Repository interfaces

These may only be changed when the user explicitly requests it or when a breaking change is architecturally justified and approved.

## 6. Never modify existing architecture without technical justification

The ShopFinder architecture is consolidated:
- 15-stage discovery pipeline
- Event-driven communication between stages
- Immutable artifacts with ArtifactMetadata
- Modular monolith with `@workspace/*` packages
- Prisma + SQLite (dev) / PostgreSQL (prod)

Any architectural change must be justified with:
- What problem it solves
- Why the current architecture cannot solve it
- What the migration path is

## 7. Never replace functional code by personal preference

If code works, passes tests, and follows the architecture, do not rewrite it because you prefer a different pattern. Refactoring is only acceptable when:
- The user explicitly requests it
- The code has a bug
- The code violates an engineering rule
- The code blocks a required feature

## 8. Always preserve compatibility

- Backward-compatible by default
- Legacy aliases are acceptable (see enrichment/types.ts legacy compat section)
- Breaking changes require version bump + migration note

## 9. Always preserve traceability

- Every artifact carries ArtifactMetadata (traceId, version, producer, createdAt)
- Every decision must be auditable
- Never delete history — create new versions

## 10. Always minimize complexity

- Fewer files > more files (when functionally equivalent)
- Fewer abstractions > more abstractions (when not needed)
- Composition > inheritance
- Reuse > duplication
- Explicit > clever

## Core principle

> Ambiguity must be reduced using context, never compensated with assumptions.

When something is ambiguous:
1. Read more context (files, types, tests, imports)
2. Search the codebase for patterns
3. If still ambiguous, ask the user

Never guess. Never assume. Never fill gaps with invented behavior.
