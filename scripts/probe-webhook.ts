/**
 * Probe ativo do webhook (T040) — diagnóstico decisivo da T020b. NÃO é commitável
 * como ferramenta de produção: usa o STRIPE_WEBHOOK_SECRET do .env local para
 * assinar um evento checkout.session.completed sintético e POSTa no endpoint de
 * produção. Escreve no banco APENAS via o próprio webhook (1 Order marcada com
 * number = cs_test_probe_shopfinder, facilmente identificável).
 *
 * Rodar: bun scripts/probe-webhook.ts [producao]
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const env = readFileSync(".env", "utf8");
const secretLine = env.split(/\r?\n/).find((l) => l.startsWith("STRIPE_WEBHOOK_SECRET="));
if (!secretLine) {
  console.log("STRIPE_WEBHOOK_SECRET ausente no .env local");
  process.exit(1);
}
const secret = secretLine.slice("STRIPE_WEBHOOK_SECRET=".length).trim();
console.log(
  `secret local: ${secret.slice(0, 8)}...${secret.slice(-4)} (nunca impresso por completo)`
);

const event = {
  id: "evt_test_probe_001",
  object: "event",
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: "cs_test_probe_shopfinder",
      object: "checkout.session",
      amount_total: 2199,
      currency: "usd",
      status: "complete",
      payment_status: "paid",
      customer_details: {
        email: "probe@shopfinder.local",
        name: "Probe ShopFinder",
        address: null
      },
      total_details: { amount_shipping: 0, amount_tax: 0 },
      metadata: {
        items: JSON.stringify([{ sku: "SF-SSD-KINGSPEC-512GB", qty: 1 }])
      }
    }
  },
  livemode: false,
  type: "checkout.session.completed"
};

const body = JSON.stringify(event);
const timestamp = Math.floor(Date.now() / 1000);
const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

const target =
  process.argv[2] === "local"
    ? "http://localhost:3001/api/webhook"
    : "https://shop-finder-taupe.vercel.app/api/webhook";

const res = await fetch(target, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "stripe-signature": `t=${timestamp},v1=${signature}`
  },
  body
});
const responseBody = await res.text();
console.log(`probe => HTTP ${res.status} | body: ${responseBody}`);
