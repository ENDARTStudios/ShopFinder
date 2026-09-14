# ADR-0007: Architecture Tests

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The architecture in ADR-0001 (Modular Monolith) and ADR-0005 (Domain
Architecture) defines strict layer boundaries:

- Domain must not import React/Next/Prisma.
- Contracts must not import Database.
- UI must not import Database or Integrations.
- Integrations must not import Presentation.

Without enforcement, these boundaries erode over time. A developer in a
hurry adds `import { db } from "@workspace/database"` inside a domain
service "just to make it work" — and the architecture is compromised.
Code review catches some of these, but not all, and not consistently.

## Decision

Add **architecture tests** as a custom script (`scripts/architecture-test.mjs`)
that scans all `.ts`/`.tsx` files and fails if a forbidden import is detected.
The script runs:

- Locally via `bun run test:arch`.
- In CI (`.github/workflows/ci.yml`) before build.

### Rules enforced

| Layer        | Cannot import                                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| domain       | react, next, @prisma, @radix-ui, @workspace/ui, @workspace/database, @workspace/integrations, @workspace/analytics, @workspace/auth |
| contracts    | react, next, @prisma, @radix-ui, @workspace/database, @workspace/ui, @workspace/integrations, @workspace/analytics, @workspace/auth |
| ui           | @prisma, @workspace/database, @workspace/integrations, src/app                                                                      |
| database     | react, @radix-ui, @workspace/ui                                                                                                     |
| integrations | react, @radix-ui, @workspace/ui, src/app                                                                                            |
| testing      | react, @radix-ui                                                                                                                    |

### Implementation choice

A custom Node script (no external deps) rather than a tool like
`dependency-cruiser` or `archunit`:

- Zero install cost.
- Runs in CI without extra setup.
- Rules are plain JS — easy to read, easy to extend.
- Sufficient for our needs (regex-based import detection).

## Consequences

**Positive**

- Boundary violations are caught before merge, not in code review.
- The script is fast (~58 files in <1s) — runs on every commit.
- Rules are versioned with the code — changes go through PR review.
- New developers learn the boundaries by reading the rules.

**Negative**

- Regex-based detection can miss dynamic imports or re-exports.
  Mitigation: combine with ESLint `no-restricted-imports` (to be added).
- No graph visualization (dependency-cruiser offers this). Acceptable —
  the rules are simple enough to read.
- Maintaining the script is a small ongoing cost.

## Alternatives Considered

- **dependency-cruiser** — feature-rich but adds a dependency and config file.
  Revisit if rules become complex (e.g., per-file rules, cycle detection).
- **ESLint `no-restricted-imports` only** — simpler but per-file rules are
  awkward and the error messages are less clear. Used as a complement.
- **No enforcement (trust the team)** — rejected: trust erodes under deadline
  pressure. The architecture is the project's most valuable asset.

## References

- ADR-0001 (Modular Monolith — boundaries)
- ADR-0005 (Domain Architecture — layer rules)
- `scripts/architecture-test.mjs` (implementation)
- `.github/workflows/ci.yml` (CI integration — to be added)
