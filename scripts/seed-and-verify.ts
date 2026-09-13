#!/usr/bin/env bun
/**
 * T016 — Seed + Verify wrapper.
 * Valida a URL pooled do Neon, executa seed-catalog, grava resultado.
 * Usa process.cwd() para paths absolutos (evita problemas de CWD).
 */
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const CWD = process.cwd();
const LOG = path.join(CWD, "state", "seed.log");
const RESULT = path.join(CWD, "state", "seed-result.json");

function log(msg: string) {
  try {
    fs.appendFileSync(LOG, msg + "\n", "utf-8");
    console.log(msg); // também para stdout (se capturado)
  } catch (e) {
    console.log(msg);
  }
}

function redactHost(url: string): string {
  try {
    const u = new URL(url);
    return `<REDACTED>:****@${u.hostname}${u.pathname}${u.search}`;
  } catch {
    return "<INVALID_URL>";
  }
}

function writeResult(obj: any) {
  try {
    fs.writeFileSync(RESULT, JSON.stringify(obj, null, 2), "utf-8");
    console.log("\n=== RESULT WRITTEN TO " + RESULT + " ===");
    console.log(JSON.stringify(obj));
  } catch (e: any) {
    console.log("\n=== UNABLE TO WRITE FILE: " + e.message + " ===");
    console.log(JSON.stringify(obj));
  }
}

async function main() {
  console.log("=== T016: Seed Neon With Proof ===");
  console.log("CWD:", CWD);

  const dbUrl = process.env.DATABASE_URL || "";
  const hostRedacted = redactHost(dbUrl);

  console.log("DATABASE_URL:", hostRedacted);

  const isPooler = dbUrl.includes("-pooler");
  const hasPgbouncer = dbUrl.includes("pgbouncer=true");
  const isPostgres = dbUrl.startsWith("postgresql://");

  console.log("isPostgres:", isPostgres);
  console.log("isPooler:", isPooler);
  console.log("hasPgbouncer:", hasPgbouncer);

  if (!isPostgres || !isPooler || !hasPgbouncer) {
    const result = {
      ok: false,
      error: "ENV_MISMATCH",
      hostRedacted,
      hint: "DATABASE_URL precisa ter -pooler + pgbouncer=true",
      isPostgres, isPooler, hasPgbouncer
    };
    writeResult(result);
    process.exit(1);
  }

  console.log("\n✓ Neon pooled validada. Rodando seed-catalog...");

  // Step 2: Run seed
  let seedExitCode = 0;
  let seedOutput = "";
  try {
    seedOutput = execSync("bun run scripts/seed-catalog.ts", {
      encoding: "utf-8",
      timeout: 180_000,
      maxBuffer: 50 * 1024 * 1024,
      env: { ...process.env }
    });
    console.log(seedOutput);
    console.log("[SEED EXIT: 0]");
  } catch (e: any) {
    seedOutput = (e.stdout || "") + "\n" + (e.stderr || "");
    console.log(seedOutput);
    seedExitCode = e.status ?? -1;
    console.log(`[SEED EXIT: ${seedExitCode}]`);
    console.log(`[ERROR: ${e.message}]`);
  }

  // Step 3: Count
  console.log("\n--- Counting products ---");
  let storeCount = 0, totalProducts = 0, publishedCount = 0;
  let products: Array<{ sku: string; title: string }> = [];

  try {
    const prisma = new PrismaClient();
    storeCount = await prisma.store.count();
    totalProducts = await prisma.product.count();
    publishedCount = await prisma.product.count({ where: { status: "published" } });
    products = await prisma.product.findMany({
      where: { status: "published" },
      select: { sku: true, title: true },
      take: 50
    });
    await prisma.$disconnect();
    console.log("Stores:", storeCount);
    console.log("Total products:", totalProducts);
    console.log("Published:", publishedCount);
    for (const p of products) console.log(" ", p.sku, ":", p.title);
  } catch (e: any) {
    console.log("VERIFY ERROR:", e.message);
  }

  const result = {
    ok: seedExitCode === 0 && publishedCount > 0,
    seedExitCode, storeCount, totalProducts, publishedCount,
    products: products.map(p => ({ sku: p.sku, title: p.title })),
    hostRedacted,
    timestamp: new Date().toISOString()
  };

  writeResult(result);
  console.log("\n=== DONE ===");
}

main().catch(e => {
  console.error("FATAL:", e);
  writeResult({ ok: false, error: String(e), timestamp: new Date().toISOString() });
  process.exit(1);
});