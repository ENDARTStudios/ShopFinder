# ADR-0002: Bun workspaces + Turborepo monorepo

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The platform needs shared code across several concerns (UI primitives, types, validation, database client, auth, SEO, analytics, AI providers, supplier integrations). Options:

1. Keep everything in `src/lib/*` of one Next.js app.
2. Multi-package monorepo with a package manager that supports workspaces.
3. Separate npm packages published to a private registry.

## Decision

Adopt **Bun workspaces** as the package manager and **Turborepo** as the build orchestrator. All shared code lives under `packages/*` and is referenced from `apps/web` (the Next.js app at repo root) via `workspace:*` dependencies and `@workspace/*` TypeScript path aliases.

Each package has:

- `package.json` with `name: "@workspace/<pkg>"`, `private: true`, ESM `"type": "module"`, and `exports` pointing at `src/index.ts`.
- `tsconfig.json` extending `@workspace/config/tsconfig.base.json`.
- `src/index.ts` barrel export.
- README with status.

Turborepo pipelines (`turbo.json`) define `dev`, `build`, `lint`, `typecheck`, `test` with proper `^build` dependencies and caching.

## Consequences

**Positive**

- Clear ownership boundaries; packages can be extracted to standalone repos later if needed.
- Turborepo caches build outputs → CI speedup on unchanged packages.
- Bun workspaces hoist deps → fast installs, small disk footprint.
- TypeScript path aliases give editor go-to-definition across packages without building first.

**Negative**

- Slightly more boilerplate per package (3 files minimum).
- Need to be careful that packages don't accidentally import from `apps/web` (lint rule to be added).
- Turborepo cache invalidation rules must be kept in sync with `globalDependencies`.

## Alternatives Considered

- **pnpm workspaces** — viable, but Bun is already the runtime and is faster for this stack.
- **Nx** — heavier than needed; Turborepo covers caching + orchestration with far less config.
- **Single app with `src/lib/*`** — rejected: no boundary enforcement, refactoring hurts earlier.

## References

- ADR-0001 (modular monolith — packages mirror modules)
- ADR-0003 (sandbox adaptation of the layout)
