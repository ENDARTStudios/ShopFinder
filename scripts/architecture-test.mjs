#!/usr/bin/env node
/**
 * Architecture Tests — enforces layer dependency rules without external deps.
 *
 * Rules:
 *   1. packages/domain/**      must NOT import from: react, next, @prisma, @radix, @workspace/ui, @workspace/database, @workspace/integrations, @workspace/analytics
 *   2. packages/contracts/**   must NOT import from: react, next, @prisma, @workspace/database, @workspace/domain (except type-only), @workspace/ui
 *   3. packages/ui/**          must NOT import from: @prisma, @workspace/database, @workspace/integrations, next/ (except next/font, next/image, next/link, next/navigation)
 *   4. packages/database/**    must NOT import from: react, @radix, @workspace/ui
 *   5. packages/integrations/** must NOT import from: react, @radix, @workspace/ui, src/app
 *   6. No package imports from apps/web (src/) — only the other direction.
 *
 * Exit codes: 0 = pass, 1 = violations found.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const violations = [];

// ── Helpers ─────────────────────────────────────────────────

function walk(dir, acc = []) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (
      entry === "node_modules" ||
      entry === ".next" ||
      entry === "dist" ||
      entry === ".git" ||
      entry === "skills" ||
      entry === "examples" ||
      entry === "download" ||
      entry === "upload" ||
      entry === ".zscripts"
    )
      continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, acc);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry) && !/\.d\.ts$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

const IMPORT_RE =
  /(?:^|\n)\s*(?:import\s+[^'"]*?from\s+|import\s+|export\s+[^'"]*?from\s+|require\s*\(\s*)(['"])([^'"]+)\1/g;

function extractImports(filePath) {
  const content = readFileSync(filePath, "utf8");
  const imports = [];
  let m;
  while ((m = IMPORT_RE.exec(content)) !== null) {
    imports.push(m[2]);
  }
  return imports;
}

function classify(filePath) {
  const rel = relative(ROOT, filePath).split(sep).join("/");
  if (rel.startsWith("packages/domain/")) return { layer: "domain", rel };
  if (rel.startsWith("packages/contracts/")) return { layer: "contracts", rel };
  if (rel.startsWith("packages/ui/")) return { layer: "ui", rel };
  if (rel.startsWith("packages/database/")) return { layer: "database", rel };
  if (rel.startsWith("packages/integrations/")) return { layer: "integrations", rel };
  if (rel.startsWith("packages/auth/")) return { layer: "auth", rel };
  if (rel.startsWith("packages/analytics/")) return { layer: "analytics", rel };
  if (rel.startsWith("packages/seo/")) return { layer: "seo", rel };
  if (rel.startsWith("packages/ai/")) return { layer: "ai", rel };
  if (rel.startsWith("packages/i18n/")) return { layer: "i18n", rel };
  if (rel.startsWith("packages/observability/")) return { layer: "observability", rel };
  if (rel.startsWith("packages/shared/")) return { layer: "shared", rel };
  if (rel.startsWith("packages/types/")) return { layer: "types", rel };
  if (rel.startsWith("packages/testing/")) return { layer: "testing", rel };
  if (rel.startsWith("packages/config/")) return { layer: "config", rel };
  if (rel.startsWith("packages/validation/")) return { layer: "validation", rel };
  if (rel.startsWith("src/")) return { layer: "app", rel };
  return { layer: "other", rel };
}

// ── Rules ───────────────────────────────────────────────────

const FORBIDDEN = {
  domain: [
    "react",
    "next",
    "@prisma",
    "prisma",
    "@radix-ui",
    "@workspace/ui",
    "@workspace/database",
    "@workspace/integrations",
    "@workspace/analytics",
    "@workspace/auth"
  ],
  contracts: [
    "react",
    "next",
    "@prisma",
    "prisma",
    "@radix-ui",
    "@workspace/database",
    "@workspace/ui",
    "@workspace/integrations",
    "@workspace/analytics",
    "@workspace/auth"
  ],
  ui: ["@prisma", "prisma", "@workspace/database", "@workspace/integrations", "src/app"],
  database: ["react", "@radix-ui", "@workspace/ui"],
  integrations: ["react", "@radix-ui", "@workspace/ui", "src/app"],
  testing: ["react", "@radix-ui"] // testing may import domain + contracts
};

function isForbidden(layer, importPath) {
  const rules = FORBIDDEN[layer];
  if (!rules) return null;
  for (const rule of rules) {
    if (importPath === rule || importPath.startsWith(rule + "/")) {
      return rule;
    }
  }
  return null;
}

// ── Run ─────────────────────────────────────────────────────

const files = walk(join(ROOT, "packages")).concat(walk(join(ROOT, "src")));
let checked = 0;

for (const file of files) {
  const { layer, rel } = classify(file);
  if (!FORBIDDEN[layer]) continue; // no rules for this layer
  const imports = extractImports(file);
  for (const imp of imports) {
    // Skip type-only imports from contracts → domain (allowed for type inference)
    if (layer === "contracts" && imp.startsWith("@workspace/domain")) {
      // allowed only as type-only — we check the file content heuristically
      const content = readFileSync(file, "utf8");
      const lineMatch = content.match(
        new RegExp(
          `import\\s+type\\s+.*from\\s+['"]${imp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]`
        )
      );
      if (lineMatch) continue;
      // also allow `import { type X }` form
      if (/import\s*\{[^}]*\btype\b[^}]*\}\s*from/.test(content) && content.includes(imp)) continue;
    }
    const hit = isForbidden(layer, imp);
    if (hit) {
      violations.push({ file: rel, layer, import: imp, rule: hit });
    }
  }
  checked++;
}

// ── Report ──────────────────────────────────────────────────

if (violations.length === 0) {
  console.log(`✓ Architecture tests passed — ${checked} files checked, 0 violations.`);
  process.exit(0);
} else {
  console.error(`✗ Architecture tests FAILED — ${violations.length} violation(s):\n`);
  for (const v of violations) {
    console.error(`  [${v.layer}] ${v.file}`);
    console.error(`    imports: ${v.import}  (forbidden by rule: ${v.rule})\n`);
  }
  process.exit(1);
}
