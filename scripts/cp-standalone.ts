/**
 * Copia static+public para o output standalone (self-host).
 * Multiplataforma (Windows/Linux) — substitui o `cp -r` do script build,
 * que falhava sob bun run no Windows. Na Vercel (output não-standalone)
 * não faz nada.
 *
 * Rodar: bun scripts/cp-standalone.ts
 */
import { cpSync, existsSync } from "node:fs";

const standalone = ".next/standalone";

if (!existsSync(standalone)) {
  console.log("standalone ausente (build na Vercel) — nada a copiar");
  process.exit(0);
}

cpSync(".next/static", `${standalone}/.next/static`, { recursive: true });
cpSync("public", `${standalone}/public`, { recursive: true });
console.log("standalone: static + public copiados");
