/**
 * ShopFinder — Prisma provider selector.
 *
 * Prisma does not natively support `provider = env("DATABASE_PROVIDER")`.
 * The `provider` field must be a literal string in `schema.prisma`.
 *
 * This script reads `DATABASE_URL` from the environment and rewrites the
 * `provider` line in `prisma/schema.prisma` accordingly:
 *
 *   - DATABASE_URL starts with `postgresql://` or `postgres://` → provider = "postgresql"
 *   - DATABASE_URL starts with `file:` or is unset → provider = "sqlite"
 *
 * Run this BEFORE any `prisma generate`, `prisma db push`, or `prisma migrate`
 * command. The npm scripts in `package.json` already wire this up:
 *
 *   "prebuild": "bun run scripts/select-prisma-provider.ts",
 *   "db:generate": "bun run scripts/select-prisma-provider.ts && prisma generate",
 *   "db:push": "bun run scripts/select-prisma-provider.ts && prisma db push",
 *   "db:migrate": "bun run scripts/select-prisma-provider.ts && prisma migrate dev",
 *
 * The script is idempotent — running it multiple times produces the same
 * result. It does NOT modify any other line of `schema.prisma`.
 *
 * Usage:
 *   bun run scripts/select-prisma-provider.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";

const SCHEMA_PATH = path.resolve(process.cwd(), "prisma", "schema.prisma");

function resolveProvider(): "sqlite" | "postgresql" {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    return "postgresql";
  }
  // Default to SQLite for dev (file: prefix or unset).
  return "sqlite";
}

function main() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`✗ schema.prisma not found at ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const provider = resolveProvider();
  const original = fs.readFileSync(SCHEMA_PATH, "utf8");

  // Replace the `provider = "..."` line within the `datasource db` block.
  // Regex matches: provider = "sqlite"  OR  provider = "postgresql"
  // Only inside the datasource block (first occurrence after `datasource db {`).
  const updated = original.replace(
    /(datasource\s+db\s*\{[^}]*?provider\s*=\s*")(?:sqlite|postgresql)(")/s,
    `$1${provider}$2`
  );

  if (updated === original) {
    // Already correct or pattern didn't match — check if it's already the target.
    const currentMatch = original.match(
      /datasource\s+db\s*\{[^}]*?provider\s*=\s*"([^"]+)"/s
    );
    const currentProvider = currentMatch?.[1];
    if (currentProvider === provider) {
      console.log(`✓ schema.prisma already uses provider = "${provider}"`);
      return;
    }
    console.error(
      `✗ Could not find provider line in datasource block. Current: ${currentProvider}, target: ${provider}`
    );
    process.exit(1);
  }

  fs.writeFileSync(SCHEMA_PATH, updated, "utf8");
  console.log(`✓ schema.prisma provider set to "${provider}" (based on DATABASE_URL)`);
}

main();
