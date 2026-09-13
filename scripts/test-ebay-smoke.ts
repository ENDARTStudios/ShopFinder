/**
 * Smoke test eBay (T047) — commitável, sem segredos.
 *
 * OAuth2 client_credentials (padrões de connectors/ebay/auth.ts):
 * - Host por EBAY_ENV: sandbox (default) → api.sandbox.ebay.com |
 *   production → api.ebay.com.
 * - Scope: a STRING "https://api.ebay.com/oauth/api_scope" é aceita pelos
 *   DOIS hosts (particularidade do eBay — validado em T047 contra sandbox).
 *
 * Imprime SOMENTE: status do token, status da busca, total e 2
 * itemIds/títulos. Credenciais lidas do .env — nunca impressas.
 *
 * Rodar: bun scripts/test-ebay-smoke.ts
 */
import { readFileSync } from "node:fs";

const env = readFileSync(".env", "utf8");
function envVar(name: string): string {
  const line = env.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : "";
}

const clientId = envVar("EBAY_CLIENT_ID");
const clientSecret = envVar("EBAY_CLIENT_SECRET");
const envName = (envVar("EBAY_ENV") || "sandbox").toLowerCase();
const isProd = envName === "production";
const apiBase = isProd ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";
const oauthScope = "https://api.ebay.com/oauth/api_scope";

async function main(): Promise<void> {
  if (!clientId || !clientSecret) {
    console.log("token HTTP status: 0 (EBAY_CLIENT_ID/EBAY_CLIENT_SECRET ausentes)");
    process.exit(1);
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch(`${apiBase}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: oauthScope
    })
  });
  console.log(`token HTTP status: ${tokenRes.status}`);
  if (!tokenRes.ok) {
    console.log((await tokenRes.text()).slice(0, 300));
    process.exit(1);
  }
  const { access_token: token } = (await tokenRes.json()) as { access_token: string };

  const searchRes = await fetch(`${apiBase}/buy/browse/v1/item_summary/search?q=ssd&limit=3`, {
    headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" }
  });
  console.log(`search HTTP status: ${searchRes.status}`);
  if (!searchRes.ok) {
    console.log((await searchRes.text()).slice(0, 300));
    process.exit(1);
  }

  const data = (await searchRes.json()) as {
    total?: number;
    itemSummaries?: Array<{ itemId: string; title: string }>;
  };
  const items = data.itemSummaries ?? [];
  console.log(`total de itens: ${data.total ?? items.length}`);
  for (const item of items.slice(0, 2)) {
    console.log(`- ${item.itemId} | ${item.title.slice(0, 70)}`);
  }
}

main();
