/**
 * Paridade de i18n (T031, T058) — compara as chaves de messages/pt-BR.json
 * (base) contra todos os outros locales em messages/ (recursivo) e imprime,
 * por locale, as chaves ausentes nele e as chaves extras não presentes na base.
 *
 * Rodar: bun scripts/check-i18n-parity.ts
 * Exit 0 = paridade total; 1 = diferenças encontradas.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MESSAGES_DIR = join(import.meta.dir, "..", "messages");
const BASE_LOCALE = "pt-BR";

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

const localeFiles = readdirSync(MESSAGES_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .sort();

if (!localeFiles.includes(BASE_LOCALE)) {
  console.error(`locale base "${BASE_LOCALE}" não encontrado em messages/`);
  process.exit(1);
}

const baseKeys = flatten(
  JSON.parse(readFileSync(join(MESSAGES_DIR, `${BASE_LOCALE}.json`), "utf8")) as Dict,
);

console.log(
  `${BASE_LOCALE} (base): ${baseKeys.size} chaves | locales: ${localeFiles.join(", ")}`,
);

const otherLocales = localeFiles.filter((l) => l !== BASE_LOCALE);
let hasMissing = false;

for (const locale of otherLocales) {
  const keys = flatten(
    JSON.parse(readFileSync(join(MESSAGES_DIR, `${locale}.json`), "utf8")) as Dict,
  );
  const missingInLocale = [...baseKeys].filter((k) => !keys.has(k)).sort();
  const extraInLocale = [...keys].filter((k) => !baseKeys.has(k)).sort();

  console.log(`\n${locale}: ${keys.size} chaves`);

  if (missingInLocale.length === 0 && extraInLocale.length === 0) {
    console.log(`  paridade total ✓`);
    continue;
  }
  hasMissing = true;
  if (missingInLocale.length > 0) {
    console.log(`  faltando em ${locale}.json (${missingInLocale.length}):`);
    for (const k of missingInLocale) console.log(`    - ${k}`);
  }
  if (extraInLocale.length > 0) {
    console.log(`  extras em ${locale}.json (não existem na base ${BASE_LOCALE}) (${extraInLocale.length}):`);
    for (const k of extraInLocale) console.log(`    + ${k}`);
  }
}

if (!hasMissing) {
  console.log(`\nparidade total ✓ (${otherLocales.length} locales vs base ${BASE_LOCALE})`);
} else {
  process.exit(1);
}
