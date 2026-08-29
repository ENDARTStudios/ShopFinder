/**
 * Smoke test DigiKey sandbox (T024) — commitável, sem segredos.
 *
 * Lê DIGIKEY_CLIENT_ID / DIGIKEY_CLIENT_SECRET / DIGIKEY_ENV do .env local
 * (nunca imprime valores de ambiente). Rodar: bun scripts/test-digikey-sandbox.ts
 *
 * Imprime SOMENTE: status HTTP do token, status HTTP da busca, total de
 * produtos e 2 part numbers de exemplo. Em 401/403 imprime o body exato da
 * resposta (o body de erro OAuth/API não contém segredos).
 */
import { DigiKeyClient } from "../packages/infrastructure/src/connectors/digikey/client";

async function main(): Promise<void> {
  const client = new DigiKeyClient();

  const token = await client.authenticate();
  console.log(`token HTTP status: ${token.status}`);
  if (!token.ok) {
    if (token.errorBody) console.log(token.errorBody);
    process.exit(1);
  }

  const search = await client.searchProducts("500", 5);
  console.log(`search HTTP status: ${search.status}`);
  if (!search.ok) {
    console.log(search.rawBody);
    process.exit(1);
  }

  const products =
    (search.json as { Products?: Array<Record<string, unknown>> } | null)?.Products ?? [];
  console.log(`total de produtos: ${products.length}`);

  const partNumbers = products
    .slice(0, 2)
    .map((p) => String(p.ProductNumber ?? p.productNumber ?? "(sem ProductNumber)"));
  console.log(`part numbers de exemplo: ${partNumbers.join(" | ")}`);
}

main();
