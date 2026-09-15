/**
 * Auditoria de categorias (T033 — passo 1, READ-ONLY).
 *
 * Lista todos os produtos com a categoria atual e sugere a correta
 * (heurística por marca/título + taxonomia do seed-catalog.ts).
 * NÃO escreve nada no banco.
 *
 * Rodar: bun scripts/audit-categories.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Taxonomia alvo (subcategorias de pc-hardware existentes + 2 propostas novas)
const SUGGEST_RULES: Array<{ match: RegExp; slug: string; label: string }> = [
  { match: /cooler|ventoinha|fan\b/i, slug: "cooling", label: "Coolers & Ventoinhas (NOVA)" },
  { match: /mini\s?pc|n100|n95\b/i, slug: "mini-pc", label: "Mini PCs (NOVA)" },
  { match: /intel core|ryzen|cpu\b|14900k|7950x/i, slug: "cpu", label: "Processadores" },
  { match: /ssd|nvme|storage|hdd/i, slug: "ssd", label: "SSD & Storage" },
  {
    match: /motherboard|placa-mãe|placa ma(e|̃)i|x99|x79/i,
    slug: "motherboard",
    label: "Placas-mãe"
  },
  { match: /ram|ddr[34]|mem(ó|o)ria/i, slug: "ram", label: "Memória RAM" },
  { match: /850w|psu|fonte\b/i, slug: "psu", label: "Fontes" },
  { match: /gabinete|case\b/i, slug: "case", label: "Gabinetes" },
  { match: /gpu|radeon|geforce|rtx/i, slug: "gpu", label: "Placas de Vídeo" },
  { match: /stm32|esp32|esp8266|mcu|microcontrol/i, slug: "mcu", label: "Microcontroladores" },
  { match: /bme280|sensor/i, slug: "sensor", label: "Sensores" },
  {
    match: /amplifier|op.?amp|lm358|circuito integrado/i,
    slug: "ic",
    label: "Circuitos Integrados"
  },
  { match: /watch|wearable/i, slug: "wearable", label: "Wearables" },
  { match: /iphone|galaxy|smartphone/i, slug: "smartphone", label: "Smartphones" },
  { match: /airpods|fone|earbud|headphone|áudio|audio/i, slug: "audio", label: "Áudio & Fones" }
];

function suggest(title: string, brand: string): string {
  const haystack = `${brand} ${title}`;
  for (const rule of SUGGEST_RULES) {
    if (rule.match.test(haystack)) return rule.label;
  }
  return "(sem sugestão — revisão manual)";
}

async function main(): Promise<void> {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: [{ categoryId: "asc" }, { sku: "asc" }],
    select: {
      sku: true,
      title: true,
      category: { select: { name: true, slug: true } }
    }
  });

  console.log("sku | title | categoria_atual | categoria_sugerida");
  console.log("--- | ----- | --------------- | ------------------");
  for (const p of products) {
    const atual = p.category?.name ?? "(sem categoria)";
    const atualSlug = p.category?.slug ?? "-";
    const sugerida = suggest(p.title, "");
    const marker = atual === sugerida || sugerida.startsWith(atual) ? "" : " ⚠️";
    console.log(`${p.sku} | ${p.title} | ${atual} (${atualSlug}) | ${sugerida}${marker}`);
  }
  console.log(`\ntotal: ${products.length} produtos (leitura apenas — nada foi alterado)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error("erro:", error instanceof Error ? error.message : String(error));
    await prisma.$disconnect();
    process.exit(1);
  });
