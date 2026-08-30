/**
 * Gerador de SQL de produção (T033 — passo 2). NÃO executa nada.
 *
 * Gera SQL idempotente para corrigir as categorias de DeepCool AK620 e
 * Minisforum N100, incluindo a criação das 2 subcategorias novas
 * (cooling, mini-pc) no nicho PC Hardware & Gamer.
 *
 * - INSERT ... WHERE NOT EXISTS: rodar 2x não muda nada.
 * - UPDATE ... WHERE sku = ...: apenas categoryId (nunca SKU/preço/estoque).
 * - Nenhum DELETE. Pedidos/OrderItems intactos.
 *
 * Rodar: bun scripts/fix-categories-sql.ts   → imprime o SQL no stdout.
 * O SQL gerado NÃO é commitado (artefato transitório para o Neon SQL Editor).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NEW_CATEGORIES = [
  { slug: "cooling", name: "Coolers & Ventoinhas", nicheId: "pc-hardware" },
  { slug: "mini-pc", name: "Mini PCs", nicheId: "pc-hardware" }
];

const PRODUCT_MOVES = [
  { sku: "SF-COOLER-DEEPCOOL-AK620", categorySlug: "cooling" },
  { sku: "SF-MINIPC-MINISFORUM-N100", categorySlug: "mini-pc" }
];

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function main(): Promise<void> {
  const store = await prisma.store.findFirst({ select: { id: true } });
  if (!store) throw new Error("nenhuma Store encontrada no banco");
  const storeId = store.id;

  const lines: string[] = [];
  lines.push("-- T033: correção de categorias (DeepCool AK620, Minisforum N100)");
  lines.push(`-- Store: ${storeId}`);
  lines.push("-- Idempotente: seguro rodar múltiplas vezes. Nenhum DELETE/INSERT de produtos.");
  lines.push("");

  lines.push("-- 1) Subcategorias novas (idempotente)");
  for (const cat of NEW_CATEGORIES) {
    const description = JSON.stringify({ nicheId: cat.nicheId });
    lines.push(
      `INSERT INTO "Category" ("id", "storeId", "slug", "name", "description", "version", "createdAt", "updatedAt")\n` +
        `SELECT gen_random_uuid()::text, ${q(storeId)}, ${q(cat.slug)}, ${q(cat.name)}, ${q(description)}, 1, now(), now()\n` +
        `WHERE NOT EXISTS (\n` +
        `  SELECT 1 FROM "Category" WHERE "storeId" = ${q(storeId)} AND slug = ${q(cat.slug)}\n` +
        `);`
    );
  }

  lines.push("");
  lines.push("-- 2) Move produtos para a categoria correta (apenas categoryId)");
  for (const move of PRODUCT_MOVES) {
    lines.push(
      `UPDATE "Product"\n` +
        `SET "categoryId" = (SELECT id FROM "Category" WHERE "storeId" = ${q(storeId)} AND slug = ${q(move.categorySlug)}),\n` +
        `    "updatedAt" = now()\n` +
        `WHERE sku = ${q(move.sku)};`
    );
  }

  lines.push("");
  lines.push("-- 3) Verificação");
  const skuList = PRODUCT_MOVES.map((m) => q(m.sku)).join(", ");
  lines.push(
    `SELECT p.sku, p.title, c.slug AS category_slug, c.name AS category_name\n` +
      `FROM "Product" p JOIN "Category" c ON c.id = p."categoryId"\n` +
      `WHERE p.sku IN (${skuList});`
  );

  console.log(lines.join("\n"));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error("erro:", error instanceof Error ? error.message : String(error));
    await prisma.$disconnect();
    process.exit(1);
  });
