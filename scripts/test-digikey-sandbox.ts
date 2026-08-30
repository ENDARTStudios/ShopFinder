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
  const keywords = process.argv[2] ?? "500";
  const limit = Number(process.argv[3] ?? 5);
  const client = new DigiKeyClient();

  const token = await client.authenticate();
  console.log(`token HTTP status: ${token.status}`);
  if (!token.ok) {
    if (token.errorBody) console.log(token.errorBody);
    process.exit(1);
  }

  const search = await client.searchProducts(keywords, limit);
  console.log(`search HTTP status: ${search.status}`);
  if (!search.ok) {
    console.log(search.rawBody);
    process.exit(1);
  }

  const payload = search.json as {
    Products?: Array<Record<string, unknown>>;
    ProductsCount?: number;
  } | null;
  const products = payload?.Products ?? [];
  console.log(`total de produtos: ${payload?.ProductsCount ?? products.length}`);

  // V4: o número DigiKey vive em ProductVariations[].DigiKeyProductNumber;
  // BaseProductNumber é { Id, Name } (part number normalizado do fabricante).
  const partNumbers = products.slice(0, 2).map((p) => {
    const variations = p.ProductVariations as Array<Record<string, unknown>> | undefined;
    const digiKeyPart = variations?.[0]?.DigiKeyProductNumber;
    const base = p.BaseProductNumber as { Name?: string } | undefined;
    return String(digiKeyPart ?? base?.Name ?? "(sem part number)");
  });
  console.log(`part numbers de exemplo: ${partNumbers.join(" | ")}`);
}

main();
