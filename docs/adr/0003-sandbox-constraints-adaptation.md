# ADR-0003: Sandbox-constrained layout adaptation

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The original plan (from the project brief) specified a classic Turborepo layout:

```
apps/
  web/         ← Next.js app lives here
packages/
  ui/
  ...
```

The execution sandbox, however, auto-starts the Next.js dev server from **the repository root** with the script `next dev -p 3000`. Moving the app to `apps/web/` would break the auto-run contract, hide the app from the user-visible preview, and force a parallel workaround for every CI run.

## Decision

Adapt the layout to the sandbox constraint while preserving the architectural intent:

- The Next.js app stays at the **repository root** (`/`), acting conceptually as `apps/web`. The root `package.json` is the app's `package.json` and also declares the workspaces.
- The `packages/*` directory is a real Bun workspace and holds all shared code.
- `turbo.json` is configured at the root and treats the root app as the implicit `web` package.
- ADR-0002 (workspace layout) is honoured in spirit: every package boundary, path alias, and Turborepo pipeline works exactly as planned. The only delta is the absence of the `apps/` indirection layer.

When the project is deployed to Vercel / GitHub in a non-sandboxed context, a follow-up ADR may move the app into `apps/web/` if a cleaner repo shape is desired. The migration is mechanical (move files, add `apps/web/package.json`, update `workspaces` glob to `["apps/*", "packages/*"]`).

## Consequences

**Positive**

- Sandbox auto-run works unchanged → no risk of breaking the dev-server contract.
- All Turborepo features still work.
- Zero-cost migration path to `apps/web/` later.

**Negative**

- Conceptual asymmetry: root `package.json` is both the app's manifest and the workspace root manifest. Requires discipline to keep scripts and deps organized (app deps vs. workspace tooling deps).
- Documentation must clarify "root = apps/web".

## Alternatives Considered

- **Move app to `apps/web/` and override the sandbox dev script** — rejected: the dev script is owned by the sandbox runtime (`/home/z/my-project/.zscripts/dev.sh`), not the user. Overriding it is fragile.
- **Symlink `apps/web` → root** — rejected: solves nothing the current approach doesn't, adds confusion.
- **Skip Turborepo / workspaces entirely** — rejected: ADR-0002 still stands; this would only weaken boundaries.

## References

- ADR-0002 (monorepo workspaces)
- `/home/z/my-project/.zscripts/dev.sh` (sandbox dev runner)
