/**
 * Smoke test do DigiKeyConnector (T027) — commitável, sem segredos.
 *
 * Instancia o connector real (DigiKeyClient por baixo: token OAuth2 em cache,
 * rotas v4 do Swagger) e imprime SOMENTE: count normalizado + 2 títulos +
 * 1 preço + 1 partNumber. Nada de banco/jobs.
 *
 * Rodar: bun scripts/test-digikey-connector.ts [keyword] [limit]
 */
import { DigiKeyClient } from "../packages/infrastructure/src/connectors/digikey/client";
import { DigiKeyConnector } from "../packages/infrastructure/src/connectors/digikey/connector";
import {
  createNoopRateLimiter,
  createNoRetryPolicy,
  createStringCheckpointSerializer
} from "../packages/infrastructure/src/connectors/core";

async function main(): Promise<void> {
  const keywords = process.argv[2] ?? "STM32";
  const limit = Number(process.argv[3] ?? 5);

  const client = new DigiKeyClient();
  const connector = new DigiKeyConnector(
    {
      provider: "digikey",
      transport: {
        name: "unused",
        execute: async () => ({ status: 0, headers: {}, body: "", durationMs: 0 })
      },
      auth: { name: "unused", authenticate: async (r) => r },
      pagination: { name: "unused", first: () => "0", next: () => null, apply: (r) => r },
      rateLimiter: createNoopRateLimiter(),
      retryPolicy: createNoRetryPolicy(),
      checkpointSerializer: createStringCheckpointSerializer(),
      timeoutMs: 20000,
      maxPages: 1
    },
    client
  );

  for await (const page of connector.discover({
    keyword: keywords,
    region: "US",
    language: "en",
    limit
  })) {
    const products = page.products as Array<{
      title: string;
      price: { amount: number; currency: string };
      attributes: Record<string, string>;
    }>;

    console.log(`produtos normalizados: ${products.length}`);
    for (const p of products.slice(0, 2)) {
      console.log(`- ${p.title}`);
    }
    const first = products[0];
    if (first) {
      const value = (first.price.amount / 100).toFixed(2);
      console.log(`preço (1ª oferta): ${first.price.currency} ${value}`);
      console.log(`partNumber: ${first.attributes["DigiKey PN"] ?? "(sem)"}`);
    }
    break; // apenas a primeira página
  }
}

main();
