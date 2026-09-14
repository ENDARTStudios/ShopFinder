#!/usr/bin/env bash
# Generates the canonical package skeleton for all @workspace/* packages.
# Each package gets: package.json, tsconfig.json, src/index.ts, README.md
set -euo pipefail

ROOT="/home/z/my-project/packages"

declare -A PKGS=(
  [ui]="Primitive UI components (shadcn/ui wrappers, design-system tokens). Consumed by apps/web."
  [shared]="Cross-cutting utilities: formatters, helpers, constants, tiny pure functions."
  [types]="Shared TypeScript types and Zod schemas re-exported domain-by-domain."
  [database]="Prisma client, schema, repositories, migrations. SQLite (dev) -> Supabase (prod)."
  [auth]="Auth.js configuration, sessions, RBAC primitives, password & OAuth adapters."
  [validation]="Zod schemas per domain (catalog, orders, checkout, customers, ...)."
  [analytics]="Server-side analytics clients (GA4, GSC, Clarity, Sentry, UptimeRobot)."
  [seo]="Schema.org JSON-LD builders, metadata API helpers, sitemap & robots generators."
  [ai]="Decoupled AI layer with interchangeable providers (OpenAI, Anthropic, Z.ai, ...)."
  [integrations]="Dropshipping supplier adapters (AliExpress, CJ, Zendrop, Spocket, ...)."
)

for name in "${!PKGS[@]}"; do
  desc="${PKGS[$name]}"
  dir="$ROOT/$name"
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
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts"
    },
    "./*": {
      "types": "./src/*.ts",
      "import": "./src/*.ts"
    }
  },
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "publishConfig": {
    "access": "restricted"
  }
}
JSON

  cat > "$dir/tsconfig.json" <<TS
{
  "extends": "@workspace/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
TS

  cat > "$dir/src/index.ts" <<TS
/**
 * @workspace/$name
 *
 * $desc
 *
 * This is a placeholder barrel export. Concrete APIs will be added
 * incrementally as the relevant backlog module is implemented.
 */

export const PACKAGE_NAME = "@workspace/$name" as const;
export const PACKAGE_VERSION = "0.1.0" as const;
TS

  cat > "$dir/README.md" <<MD
# @workspace/$name

$desc

## Status

Placeholder — populated as the relevant backlog module lands.

## Usage

\`\`\`ts
import { PACKAGE_NAME } from "@workspace/$name";
\`\`\`
MD
done

echo "Generated packages: ${!PKGS[@]}"
