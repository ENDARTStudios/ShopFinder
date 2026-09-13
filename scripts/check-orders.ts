/**
 * Verificação read-only de Orders (T029) — commitável, sem segredos.
 *
 * Usa o PrismaClient com a DATABASE_URL do .env. SELECT apenas — nada é
 * escrito no banco. O `select` traz SOMENTE number/status/grandTotal/createdAt:
 * nenhum campo de cliente (email, endereço, PII) é buscado ou impresso.
 *
 * Rodar: bun scripts/check-orders.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const total = await prisma.order.count();
  console.log(`total de orders: ${total}`);

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      number: true,
      status: true,
      grandTotalMinorUnits: true,
      createdAt: true
    }
  });

  for (const order of orders) {
    console.log(
      `${order.number} | ${order.status} | ${order.grandTotalMinorUnits} minor units | ${order.createdAt.toISOString()}`
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error("erro:", error instanceof Error ? error.message : String(error));
    await prisma.$disconnect();
    process.exit(1);
  });
