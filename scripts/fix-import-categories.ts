/**
 * T071 — atribui categorias existentes aos produtos importados (T068).
 *
 * Os 1.041 importados entraram com categoryId null → ficavam fora das
 * contagens por nicho/categoria e apareciam como "Uncategorized".
 *
 * Regras (na ordem):
 *  1. DIGIKEY — pelo atributo "Category" (taxonomia DigiKey gravada no
 *     import) mapeado para categorias locais;
 *  2. fallback por regex no título (principalmente eBay);
 *  3. sem destino claro → permanece sem categoria (não força).
 *
 * Idempotente: só toca em produtos importados com categoryId null.
 * Rodar: bun scripts/fix-import-categories.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Taxonomia DigiKey (atributo "Category") → slug local
const DIGIKEY_CATEGORY_MAP: Record<string, string> = {
  "integrated circuits (ics)": "ic",
  "embedded controllers and single board computers": "mcu",
  "capacitors": "passive",
  "resistors": "passive",
  "inductors, coils, chokes": "passive",
  "crystals, resonators, oscillators": "passive",
  "circuit protection": "passive",
  "filters": "passive",
  "diodes": "ic",
  "transistors": "ic",
  "fets, mosfets": "ic",
  "rf/if and rfid": "ic",
  "sensors, transducers": "sensor",
  "thermistors, ptc/ntc": "sensor"
};

// Regex de título → slug local (fallback, principalmente eBay)
const TITLE_RULES: Array<[RegExp, string]> = [
  [/\bSSD\b|\bNVME\b|HARD DRIVE|\bHDD\b/i, "ssd"],
  [/\bRAM\b|\bDDR[0-9]\b|MEMÓRIA|MEMORY/i, "ram"],
  [/\bGPU\b|\bRTX\b|\bGTX\b|VIDEO CARD|PLACA DE VÍDEO/i, "gpu"],
  [/\bCPU\b|RYZEN|CORE I[3579]|\bXEON\b|PROCESSADOR/i, "cpu"],
  [/MONITOR/i, "monitor"],
  [/HEADSET|HEADPHONE|EARPOD|EARBUD|\bFONE\b/i, "audio"],
  [/SMART ?WATCH|WEARABLE/i, "wearable"],
  [/IPHONE|GALAXY|SMARTPHONE|CELULAR/i, "smartphone"],
  [/ARDUINO|ESP32|ESP8266|MICROCONTROLADOR|MICROCONTROLLER/i, "mcu"],
  [/SENSOR/i, "sensor"]
];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

async function main(): Promise<void> {
  const categories = await prisma.category.findMany({ select: { id: true, slug: true, name: true } });
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  const imported = await prisma.product.findMany({
    where: {
      deletedAt: null,
      categoryId: null,
      sku: { startsWith: "DIGIKEY-" }
    },
    select: { id: true, sku: true, title: true, attributes: { select: { name: true, value: true } } }
  });
  const importedEbay = await prisma.product.findMany({
    where: {
      deletedAt: null,
      categoryId: null,
      sku: { startsWith: "EBAY-" }
    },
    select: { id: true, sku: true, title: true }
  });

  const tally = new Map<string, number>();
  let unassigned = 0;

  async function assign(productId: string, slug: string | null): Promise<void> {
    if (!slug) {
      unassigned++;
      return;
    }
    const cat = bySlug.get(slug);
    if (!cat) {
      unassigned++;
      return;
    }
    await prisma.product.update({ where: { id: productId }, data: { categoryId: cat.id } });
    tally.set(cat.name, (tally.get(cat.name) ?? 0) + 1);
  }

  for (const p of imported) {
    const catAttr = p.attributes.find((a) => normalize(a.name) === "category");
    const byDigiKey = catAttr ? DIGIKEY_CATEGORY_MAP[normalize(catAttr.value)] : undefined;
    if (byDigiKey) {
      await assign(p.id, byDigiKey);
      continue;
    }
    let matched: string | null = null;
    for (const [re, slug] of TITLE_RULES) {
      if (re.test(p.title)) {
        matched = slug;
        break;
      }
    }
    await assign(p.id, matched);
  }

  for (const p of importedEbay) {
    let matched: string | null = null;
    for (const [re, slug] of TITLE_RULES) {
      if (re.test(p.title)) {
        matched = slug;
        break;
      }
    }
    await assign(p.id, matched);
  }

  console.log("=== T071 — categorias atribuídas aos importados ===");
  for (const [name, count] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${name}: ${count}`);
  }
  console.log(`Sem categoria adequada (mantidos sem categoria): ${unassigned}`);
  await prisma.$disconnect();
}

main();
