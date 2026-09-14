#!/usr/bin/env node
/**
 * T016 — Seed + Verify (Node.js, CommonJS-free).
 * Este script usa write_to_file como fallback para gravar evidência.
 * 
 * Uso: node tool-results/seed-and-verify.mjs
 * (caminho relativo ao CWD)
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const LOG = path.resolve("state", "seed.log");
const RESULT = path.resolve("state", "seed-result.json");

function writeJson(obj) {
  fs.writeFileSync(RESULT, JSON.stringify(obj, null, 2) + "\n", "utf-8");
}

function log(msg) {
  fs.appendFileSync(LOG, msg + "\n", "utf-8");
  process.stdout.write(msg + "\n");
}

async function main() {
  // Carrega .env manualmente
  const envRaw = fs.readFileSync(".env", "utf-8");
  const envVars = {};
  for (const line of envRaw.split("\n")) {
    const t = line.trim();
    if (t && t.includes("=") && !t.startsWith("#")) {
      const idx = t.indexOf("=");
      let k = t.slice(0, idx).trim();
      let v = t.slice(idx + 1).trim();
      // Remove aspas simples/duplas
      if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
        v = v.slice(1, -1);
      }
      envVars[k] = v;
    }
  }

  const dbUrl = envVars["DATABASE_URL"] || process.env.DATABASE_URL || "";
  
  if (!dbUrl) {
    writeJson({ ok: false, error: "DATABASE_URL not found", timestamp: new Date().toISOString() });
    process.exit(1);
  }

  const hostRedacted = `<REDACTED>:****@${new URL(dbUrl).hostname}${new URL(dbUrl).pathname}${new URL(dbUrl).search}`;
  const isPooler = dbUrl.includes("-pooler");
  const hasPgbouncer = dbUrl.includes("pgbouncer=true");

  log(`\n=== T016: Seed Neon With Proof ===`);
  log(`Host: ${hostRedacted}`);
  log(`Pooler: ${isPooler}`);
  log(`Pgbouncer: ${hasPgbouncer}`);

  if (!isPooler || !hasPgbouncer) {
    writeJson({ ok: false, error: "ENV_MISMATCH", hostRedacted, isPooler, hasPgbouncer, timestamp: new Date().toISOString() });
    process.exit(1);
  }

  // Executa seed
  log(`\n--- Seed Catalog ---`);
  const env = { ...process.env, DATABASE_URL: dbUrl };
  let seedExitCode = 0;
  try {
    const out = execSync("npx tsx scripts/seed-catalog.ts", { encoding: "utf-8", timeout: 180000, env, maxBuffer: 50 * 1024 * 1024 });
    log(out);
    log("[SEED EXIT: 0]");
  } catch (e) {
    const msg = (e.stdout || "") + (e.stderr || "");
    log(msg);
    seedExitCode = e.status ?? -1;
    log(`[SEED EXIT: ${seedExitCode}]`);
    log(`[ERROR: ${e.message}]`);
  }

  // Verificação: fazer import dinâmico do PrismaClient
  log(`\n--- Counting products ---`);
  let storeCount = 0, totalProducts = 0, publishedCount = 0;
  let products = [];

  try {
    // Caminho para o Prisma Client gerado
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    
    storeCount = await prisma.store.count();
    totalProducts = await prisma.product.count();
    publishedCount = await prisma.product.count({ where: { status: "published" } });
    
    if (publishedCount > 0) {
      products = await prisma.product.findMany({
        where: { status: "published" },
        select: { sku: true, title: true },
        take: 50
      });
    }
    
    await prisma.$disconnect();
    
    log(`Stores: ${storeCount}`);
    log(`Total products: ${totalProducts}`);
    log(`Published: ${publishedCount}`);
    for (const p of products) {
      log(`  ${p.sku}: ${p.title}`);
    }
  } catch (e) {
    log(`VERIFY ERROR: ${e.message}`);
    log(e.stack || "");
  }

  // Grava resultado final
  const result = {
    ok: seedExitCode === 0 && publishedCount > 0,
    seedExitCode,
    storeCount,
    totalProducts,
    publishedCount,
    products: products.map(p => ({ sku: p.sku, title: p.title })),
    hostRedacted,
    timestamp: new Date().toISOString()
  };

  writeJson(result);
  log(`\nResult: ${JSON.stringify(result, null, 2)}`);
  log(`\n=== DONE ===`);
}

main().catch(e => {
  const err = { ok: false, error: e.message, stack: e.stack, timestamp: new Date().toISOString() };
  fs.writeFileSync(RESULT, JSON.stringify(err, null, 2) + "\n", "utf-8");
  process.exit(1);
});