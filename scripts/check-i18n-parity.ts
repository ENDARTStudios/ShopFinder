/**
 * Paridade de i18n (T031) — compara as chaves de messages/pt-BR.json vs
 * messages/en.json (recursivo) e imprime chaves faltantes de cada lado.
 *
 * Rodar: bun scripts/check-i18n-parity.ts
 * Exit 0 = paridade total; 1 = diferenças encontradas.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PT_PATH = join(import.meta.dir, "..", "messages", "pt-BR.json");
const EN_PATH = join(import.meta.dir, "..", "messages", "en.json");

type Dict = Record<string, unknown>;

function flatten(obj: Dict, prefix = "", out: Set<string> = new Set()): Set<string> {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") {
      flatten(value as Dict, path, out);
    } else {
      out.add(path);
    }
  }
  return out;
}

const pt = JSON.parse(readFileSync(PT_PATH, "utf8")) as Dict;
const en = JSON.parse(readFileSync(EN_PATH, "utf8")) as Dict;

const ptKeys = flatten(pt);
const enKeys = flatten(en);

const missingInEn = [...ptKeys].filter((k) => !enKeys.has(k)).sort();
const missingInPt = [...enKeys].filter((k) => !ptKeys.has(k)).sort();

console.log(`pt-BR: ${ptKeys.size} chaves | en: ${enKeys.size} chaves`);

if (missingInEn.length === 0 && missingInPt.length === 0) {
  console.log("paridade total ✓");
} else {
  if (missingInEn.length > 0) {
    console.log(`\nfaltando em en.json (${missingInEn.length}):`);
    for (const k of missingInEn) console.log(`  - ${k}`);
  }
  if (missingInPt.length > 0) {
    console.log(`\nfaltando em pt-BR.json (${missingInPt.length}):`);
    for (const k of missingInPt) console.log(`  - ${k}`);
  }
  process.exit(1);
}
