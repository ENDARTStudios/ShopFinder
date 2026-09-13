#!/usr/bin/env bash
# Iteration 02 prep — Architectural Refinements
# Creates: domain, contracts, testing, observability, i18n packages
# Restructures: ai (7 subdirs), seo (4 subdirs)
# Adds: .changeset, dependabot, SECURITY.md, CODEOWNERS, security.txt
set -euo pipefail
ROOT="/home/z/my-project"

# ── helpers ──────────────────────────────────────────────────
make_pkg() {
  local name="$1" desc="$2" extra_exports="$3"
  local dir="$ROOT/packages/$name"
  mkdir -p "$dir/src"
  cat > "$dir/package.json" <<JSON
{
  "name": "@workspace/$name",
  "version": "0.1.0",
  "private": true,
  "description": "$desc",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": { "types": "./src/index.ts", "import": "./src/index.ts" }${extra_exports}
  },
  "scripts": { "lint": "eslint .", "typecheck": "tsc --noEmit" },
  "publishConfig": { "access": "restricted" }
}
JSON
  cat > "$dir/tsconfig.json" <<'TS'
{
  "extends": "@workspace/config/tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "composite": false },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
TS
  cat > "$dir/README.md" <<MD
# @workspace/$name

$desc

## Status

Placeholder — populated as the relevant backlog module lands.
MD
}

make_subdir() {
  local pkg="$1" sub="$2"
  local dir="$ROOT/packages/$pkg/src/$sub"
  mkdir -p "$dir"
  cat > "$dir/index.ts" <<TS
/**
 * @workspace/${pkg}/${sub}
 * Placeholder barrel — populated as the relevant backlog module lands.
 */
export const _PLACEHOLDER = "@workspace/${pkg}/${sub}" as const;
TS
}

# ── 1. packages/domain ──────────────────────────────────────
echo "=== packages/domain ==="
DOMAIN_EXPORTS=""
for ctx in shared catalog customer cart checkout order payment supplier; do
  DOMAIN_EXPORTS="${DOMAIN_EXPORTS}, \"./${ctx}\": { \"types\": \"./src/${ctx}/index.ts\", \"import\": \"./src/${ctx}/index.ts\" }"
done
make_pkg "domain" "Domain model — bounded contexts, aggregates, entities, value objects, domain events." "$DOMAIN_EXPORTS"
for ctx in shared catalog customer cart checkout order payment supplier; do
  make_subdir "domain" "$ctx"
done

# ── 2. packages/contracts ───────────────────────────────────
echo "=== packages/contracts ==="
CONTRACTS_EXPORTS=""
for sub in api events dto schemas; do
  CONTRACTS_EXPORTS="${CONTRACTS_EXPORTS}, \"./${sub}\": { \"types\": \"./src/${sub}/index.ts\", \"import\": \"./src/${sub}/index.ts\" }"
done
make_pkg "contracts" "Public contracts — DTOs, event schemas, API contracts, Zod schemas." "$CONTRACTS_EXPORTS"
for sub in api events dto schemas; do
  make_subdir "contracts" "$sub"
done

# ── 3. packages/testing ─────────────────────────────────────
echo "=== packages/testing ==="
TESTING_EXPORTS=""
for sub in utils mocks fixtures; do
  TESTING_EXPORTS="${TESTING_EXPORTS}, \"./${sub}\": { \"types\": \"./src/${sub}/index.ts\", \"import\": \"./src/${sub}/index.ts\" }"
done
make_pkg "testing" "Shared test infrastructure — Vitest config, utils, mocks, fixtures." "$TESTING_EXPORTS"
for sub in utils mocks fixtures; do
  make_subdir "testing" "$sub"
done

# ── 4. packages/observability ───────────────────────────────
echo "=== packages/observability ==="
OBS_EXPORTS=""
for sub in logger metrics tracing instrumentation; do
  OBS_EXPORTS="${OBS_EXPORTS}, \"./${sub}\": { \"types\": \"./src/${sub}/index.ts\", \"import\": \"./src/${sub}/index.ts\" }"
done
make_pkg "observability" "Observability layer — logger, metrics, tracing, instrumentation." "$OBS_EXPORTS"
for sub in logger metrics tracing instrumentation; do
  make_subdir "observability" "$sub"
done

# ── 5. packages/i18n ────────────────────────────────────────
echo "=== packages/i18n ==="
I18N_EXPORTS=", \"./locale\": { \"types\": \"./src/locale.ts\", \"import\": \"./src/locale.ts\" }"
for sub in messages routing; do
  I18N_EXPORTS="${I18N_EXPORTS}, \"./${sub}\": { \"types\": \"./src/${sub}/index.ts\", \"import\": \"./src/${sub}/index.ts\" }"
done
make_pkg "i18n" "Internationalization — messages, routing, locale config." "$I18N_EXPORTS"
for sub in messages routing; do
  make_subdir "i18n" "$sub"
done

# ── 6. Restructure packages/ai ──────────────────────────────
echo "=== restructure packages/ai ==="
AI_EXPORTS=""
for sub in core providers prompts embeddings rag evaluation tools; do
  AI_EXPORTS="${AI_EXPORTS}, \"./${sub}\": { \"types\": \"./src/${sub}/index.ts\", \"import\": \"./src/${sub}/index.ts\" }"
  make_subdir "ai" "$sub"
done
# rewrite ai package.json with subpath exports
cat > "$ROOT/packages/ai/package.json" <<JSON
{
  "name": "@workspace/ai",
  "version": "0.1.0",
  "private": true,
  "description": "Decoupled AI layer with interchangeable providers — core, providers, prompts, embeddings, RAG, evaluation, tools.",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": { "types": "./src/index.ts", "import": "./src/index.ts" }${AI_EXPORTS}
  },
  "scripts": { "lint": "eslint .", "typecheck": "tsc --noEmit" },
  "publishConfig": { "access": "restricted" }
}
JSON

# ── 7. Restructure packages/seo ─────────────────────────────
echo "=== restructure packages/seo ==="
SEO_EXPORTS=""
for sub in metadata schema robots sitemap; do
  SEO_EXPORTS="${SEO_EXPORTS}, \"./${sub}\": { \"types\": \"./src/${sub}/index.ts\", \"import\": \"./src/${sub}/index.ts\" }"
  make_subdir "seo" "$sub"
done
cat > "$ROOT/packages/seo/package.json" <<JSON
{
  "name": "@workspace/seo",
  "version": "0.1.0",
  "private": true,
  "description": "SEO layer — metadata, schema.org JSON-LD, robots, sitemap.",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": { "types": "./src/index.ts", "import": "./src/index.ts" }${SEO_EXPORTS}
  },
  "scripts": { "lint": "eslint .", "typecheck": "tsc --noEmit" },
  "publishConfig": { "access": "restricted" }
}
JSON

# ── 8. .changeset ───────────────────────────────────────────
echo "=== .changeset ==="
mkdir -p "$ROOT/.changeset"
cat > "$ROOT/.changeset/config.json" <<'JSON'
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": ["@changesets/changelog-git", { "repo": "dropshipping/dropshipping-platform" }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@workspace/web"]
}
JSON
cat > "$ROOT/.changeset/README.md" <<'MD'
# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage
versions and changelogs for the `@workspace/*` packages.

## Workflow

1. Make your changes.
2. Run `bunx changeset` to create a changeset describing the change.
3. Commit the changeset alongside your code.
4. When the `release` GitHub Action runs (or you run `bunx changeset version`),
   the changeset is consumed and package versions + CHANGELOG.md are updated.

## Why (even for a solo project)

- Keeps a readable history of *what changed and why* per package.
- Makes future extraction to standalone repos trivial.
- Zero cost: changesets are tiny markdown files.
MD
cat > "$ROOT/.changeset/.gitkeep" <<''
empty placeholder to keep dir in git

# ── 9. .github/dependabot.yml ───────────────────────────────
echo "=== dependabot ==="
mkdir -p "$ROOT/.github"
cat > "$ROOT/.github/dependabot.yml" <<'YAML'
version: 2
updates:
  # Root app dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "06:00"
      timezone: "America/Sao_Paulo"
    open-pull-requests-limit: 10
    versioning-strategy: "increase"
    commit-message:
      prefix: "chore(deps)"
      include: "scope"
    labels: ["dependencies", "automated"]
    groups:
      radix-ui:
        patterns: ["@radix-ui/*"]
      prisma:
        patterns: ["prisma", "@prisma/client"]
      next:
        patterns: ["next", "eslint-config-next"]
      react:
        patterns: ["react", "react-dom", "@types/react", "@types/react-dom"]
      testing:
        patterns: ["vitest", "@vitest/*", "@testing-library/*"]

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    commit-message:
      prefix: "chore(ci)"
    labels: ["ci", "dependencies", "automated"]
YAML

# ── 10. Security files ──────────────────────────────────────
echo "=== security files ==="
cat > "$ROOT/SECURITY.md" <<'MD'
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security bugs seriously. We appreciate your efforts to responsibly
disclose your findings and will make every effort to acknowledge them.

**Please DO NOT open public GitHub issues for security vulnerabilities.**

Instead, report them privately:

1. Email: security@dropshipping-platform.example
2. PGP: see `public/security.txt`
3. Response time: within 48 hours (business days)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

## Disclosure Policy

- We acknowledge receipt within 48 hours.
- We provide a detailed response within 5 business days.
- We publish a fix and advisory after coordination with the reporter.
- We credit reporters (unless they prefer to remain anonymous).

## Scope

- The production deployment at the canonical domain.
- All `@workspace/*` packages in this repository.
- CI/CD pipeline configuration.

Out of scope: third-party services (Vercel, Supabase, Cloudflare, etc.) —
report to their respective security teams.
MD

cat > "$ROOT/CODEOWNERS" <<'OWNERS'
# Default owners for everything
*                       @project-lead

# Per-package ownership
/packages/domain/       @project-lead
/packages/contracts/    @project-lead
/packages/ai/           @project-lead
/packages/database/     @project-lead
/packages/auth/         @project-lead
/packages/integrations/ @project-lead

# CI and security
/.github/               @project-lead
/SECURITY.md            @project-lead
/CODEOWNERS             @project-lead
OWNERS

mkdir -p "$ROOT/public"
cat > "$ROOT/public/security.txt" <<'TXT'
Contact: mailto:security@dropshipping-platform.example
Expires: 2027-12-31T23:59:59.000Z
Preferred-Languages: en, pt-BR
Canonical: https://dropshipping-platform.example/.well-known/security.txt
Policy: https://github.com/dropshipping/dropshipping-platform/blob/main/SECURITY.md
TXT

# .well-known alias
mkdir -p "$ROOT/public/.well-known"
cp "$ROOT/public/security.txt" "$ROOT/public/.well-known/security.txt"

echo ""
echo "=== DONE ==="
echo "New packages: domain, contracts, testing, observability, i18n"
echo "Restructured: ai (7 subdirs), seo (4 subdirs)"
echo "Added: .changeset, dependabot, SECURITY.md, CODEOWNERS, security.txt"
