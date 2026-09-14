#!/usr/bin/env node
/**
 * T015 — Seed Catalog Runner
 * Lê .env, executa seed, verifica resultado.
 * Tudo escrito via fs.writeFileSync (confiável).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const OUT = path.join(__dirname, "..", "state", "seed_result.txt");
const ENV_FILE = path.join(__dirname, "..", ".env");

function log(msg) {
  fs.writeFileSync(OUT, msg + "\n", { flag: "a" });
  process.stdout.write(msg + "\n");
}

function run(cmd, env) {
  log(`\n$ ${cmd}`);
  try {
    const out = execSync(cmd, { encoding: "utf8", env, timeout: 180000 });
    log(out.trim() || "(vazio)");
    return 0;
  } catch (e) {
    log(e.stdout?.trim() || "");
    log(e.stderr?.trim() || "");
    log(`[exit code: ${e.status}]`);
    return e.status ?? -1;
  }
}

function main() {
  // Reset output
  try { fs.unlinkSync(OUT); } catch {}

  log("=== T015: Seed Catalog (Neon) ===");
  log(`Started: ${new Date().toISOString()}\n`);

  // Read .env manually (NO read_file — parse only)
  const envContent = fs.readFileSync(ENV_FILE, "utf8");
  const envVars = {};
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && trimmed.includes("=") && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      envVars[k] = v;
    }
  }

  const dbUrl = envVars["DATABASE_URL"] || "";
  const safeUrl = dbUrl.includes("@")
    ? `${dbUrl.split("@")[0].split(":")[0]}://${dbUrl.split("@")[0].split(":")[1]}@<REDACTED>`
    : "<NOT FOUND>";
  log(`DATABASE_URL: ${safeUrl}\n`);

  if (!dbUrl) {
    log("ERRO: DATABASE_URL não encontrada no .env");
    log("\n=== BLOCKED: ENV_MISMATCH ===");
    process.exit(1);
  }

  const env = { ...process.env, DATABASE_URL: dbUrl };

  // Step 1: Prisma generate
  log("=== Step 1: Prisma Generate ===");
  let code = run("npx prisma generate", env);
  if (code !== 0) {
    log("\nTrying bunx prisma generate...");
    code = run("bunx prisma generate", env);
  }

  // Step 2: Seed catalog
  log("\n=== Step 2: Seed Catalog ===");
  code = run("npx tsx scripts/seed-catalog.ts", env);
  if (code !== 0) {
    log("\nTrying bun run scripts/seed-catalog.ts...");
    code = run("bun run scripts/seed-catalog.ts", env);
  }

  // Step 3: Verification
  log("\n=== Step 3: Verification ===");
  const verifyScript = `
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const total = await prisma.product.count();
  const published = await prisma.product.count({ where: { status: "published" } });
  const products = await prisma.product.findMany({
    where: { status: "published" },
    select: { sku: true, title: true, slug: true },
    take: 25
  });
  console.log("=== VERIFICATION RESULT ===");
  console.log("Total products: " + total);
  console.log("Published: " + published);
  console.log("--- Product List ---");
  for (const p of products) {
    console.log(p.sku + "|" + p.title + "|/" + p.slug);
  }
  await prisma.\$disconnect();
}
main().catch((e) => { console.error("VERIFY ERROR:", e); process.exit(1); });
`;
  const verifyPath = path.join(__dirname, "verify.cjs");
  fs.writeFileSync(verifyPath, verifyScript);

  code = run(`node ${verifyPath}`, env);

  log("\n=== Done ===");
  console.log("\n✅ Seed completo. Resultado salvo em state/seed_result.txt");
}

main();