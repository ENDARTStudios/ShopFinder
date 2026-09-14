#!/usr/bin/env node
/**
 * T016 — Seed com evidência real.
 * Executa seed-catalog contra Neon, salva log em seed-output.log,
 * depois faz query de verificação.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const LOG = path.join(__dirname, "..", "seed-output.log");
const ENV_FILE = path.join(__dirname, "..", ".env");

function log(msg) {
  fs.writeFileSync(LOG, msg + "\n", { flag: "a" });
}

function run(cmd, env, description) {
  log(`\n--- ${description} ---`);
  log(`$ ${cmd}`);
  try {
    const stdout = execSync(cmd, { encoding: "utf8", env, timeout: 180000, maxBuffer: 10 * 1024 * 1024 });
    log(stdout.trim());
    log(`[EXIT: 0]`);
    return { code: 0, out: stdout.trim() };
  } catch (e) {
    const msg = (e.stdout || "") + "\n" + (e.stderr || "");
    log(msg.trim());
    log(`[EXIT: ${e.status ?? -1}]`);
    log(`[ERROR: ${e.message}]`);
    return { code: e.status ?? -1, out: msg.trim() };
  }
}

function main() {
  try { fs.unlinkSync(LOG); } catch {}

  log("=== T016: Seed with Real Evidence ===");
  log(`Started: ${new Date().toISOString()}\n`);

  // Read .env manually (NO read_file tool — safe parsing)
  const envRaw = fs.readFileSync(ENV_FILE, "utf8");
  const envVars = {};
  for (const line of envRaw.split("\n")) {
    const t = line.trim();
    if (t && t.includes("=") && !t.startsWith("#")) {
      const idx = t.indexOf("=");
      envVars[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
    }
  }

  const dbUrl = envVars["DATABASE_URL"] || "";
  const safeUrl = dbUrl.includes("@")
    ? `${dbUrl.split("@")[0].split(":")[0]}://${dbUrl.split("@")[0].split(":")[1].split(":")[0]}:****@${dbUrl.split("@")[1].split("?")[0]}?sslmode=require`
    : "<NOT FOUND>";
  
  log(`Envs loaded: DATABASE_URL=${safeUrl}`);
  log(`Neon pooler confirmed: ${dbUrl.includes("-pooler") ? "YES (Neon)" : "NO!"}`);
  log(`Host: ${dbUrl.split("@")[1]?.split("?")[0] || "unknown"}`);

  if (!dbUrl) {
    log("\nERROR: DATABASE_URL not found in .env");
    log("\n=== BLOCKED: ENV_MISMATCH ===");
    process.exit(1);
  }

  const env = { ...process.env, DATABASE_URL: dbUrl };

  // Prisma generate
  run("npx prisma generate", env, "Step 1: Prisma Generate");

  // Seed catalog
  run("npx tsx scripts/seed-catalog.ts", env, "Step 2: Seed Catalog");
  // Fallback to bun if tsx fails
  if (false) { /* bun fallback already in script */ }

  // Verification query
  log("\n--- Step 3: Verification (count via Prisma) ---");
  const verifyScript = `
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const storeCount = await p.store.count();
  const totalProducts = await p.product.count();
  const published = await p.product.count({ where: { status: "published" } });
  const slug = await p.product.findMany({ where: { status: "published" }, select: { slug: true }, take: 5 });
  console.log("STORE_COUNT=" + storeCount);
  console.log("TOTAL_PRODUCTS=" + totalProducts);
  console.log("PUBLISHED_PRODUCTS=" + published);
  console.log("SAMPLE_SLUGS=" + slug.map(s => s.slug).join(","));
  await p.\$disconnect();
})().catch(e => { console.error("VERIFY_ERROR:", e.message); process.exit(1); });
`;
  const vPath = path.join(__dirname, "verify_t016.cjs");
  fs.writeFileSync(vPath, verifyScript);
  run(`node ${vPath}`, env, "Step 3: Verification");

  log("\n=== DONE ===");
  console.log(`✅ Log saved to: ${LOG}`);
}

main();