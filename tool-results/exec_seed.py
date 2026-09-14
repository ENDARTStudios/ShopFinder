#!/usr/bin/env python3
"""Executa seed-catalog contra Neon e salva resultado em state/seed_result.txt"""
import subprocess, os, json, time
from pathlib import Path

OUT = Path("state/seed_result.txt")
ENV = Path(".env")

def log(msg):
    with open(OUT, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

def run(cmd, cwd=None, env=None):
    log(f"\n$ {cmd}")
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120, cwd=cwd)
        out = (r.stdout + r.stderr).strip()
        log(out if out else "(vazio)")
        if r.returncode != 0:
            log(f"[exit code: {r.returncode}]")
        return r.returncode, out
    except Exception as e:
        log(f"[ERRO: {e}]")
        return -1, str(e)

def main():
    if OUT.exists():
        OUT.unlink()
    
    log("=== T015: Seed Catalog (Neon) ===")
    log(f"Started: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Carrega DATABASE_URL do .env
    env_vars = {}
    with open(".env", "r") as f:
        for line in f:
            line = line.strip()
            if line and "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip()
    
    db_url = env_vars.get("DATABASE_URL", "")
    safe_url = f"{db_url.split('@')[0].split(':')[0]}://{db_url.split('@')[0].split(':')[1]}@<REDACTED>" if "@" in db_url else "<NOT FOUND>"
    log(f"DATABASE_URL: {safe_url}\n")
    
    if not db_url or db_url == "":
        log("ERRO: DATABASE_URL não encontrada no .env")
        log("\n=== BLOCKED: ENV_MISMATCH ===")
        return
    
    env = os.environ.copy()
    env["DATABASE_URL"] = db_url
    
    # Step 1: Prisma generate
    log("=== Step 1: Prisma Generate ===")
    code, out = run("npx prisma generate", env=env)
    if code != 0:
        log("\nTrying bunx prisma generate...")
        code, out = run("bunx prisma generate", env=env)
    
    # Step 2: Seed catalog
    log("\n=== Step 2: Seed Catalog ===")
    code, out = run("npx tsx scripts/seed-catalog.ts", env=env)
    if code != 0:
        log("\nTrying bun run scripts/seed-catalog.ts...")
        code, out = run("bun run scripts/seed-catalog.ts", env=env)
    
    # Step 3: Verification
    log("\n=== Step 3: Verification ===")
    
    # Create a verifier script
    verifier = """
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const totalProducts = await prisma.product.count();
  const published = await prisma.product.count({ where: { status: "published" } });
  const products = await prisma.product.findMany({
    where: { status: "published" },
    select: { sku: true, title: true, slug: true },
    take: 20
  });
  console.log(`Total products: ${totalProducts}`);
  console.log(`Published products: ${published}`);
  console.log("Products:");
  for (const p of products) {
    console.log(`  - ${p.sku}: ${p.title} (/${p.slug})`);
  }
  await prisma.$disconnect();
}
main().catch(console.error);
"""
    with open("tool-results/verify_count.cjs", "w") as f:
        f.write(verifier)
    
    code, out = run("node tool-results/verify_count.cjs", env=env)
    if code != 0:
        log("\nTrying npx tsx for verification...")
        code, out = run("npx tsx tool-results/verify_count.cjs", env=env)
    
    log("\n=== Done ===")

if __name__ == "__main__":
    main()