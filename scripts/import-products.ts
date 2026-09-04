/**
 * T068 — Importação de produtos reais dos conectores DigiKey/eBay.
 *
 * Popula o catálogo com ~500 produtos de cada fonte (queries variadas),
 * idempotente por SKU (upsert): rodar de novo atualiza preços/estoque sem
 * duplicar. Os 22 produtos seed NÃO são tocados.
 *
 * - DigiKey: DigiKeyConnector.discover() (OAuth2 + rotas v4 do Swagger).
 * - eBay: Browse API item_summary/search (OAuth2 client_credentials), como no
 *   smoke T047 — o eBay não expõe quantidade em stock na busca, então a oferta
 *   importa com inventory 0 (honesto; o detalhe mostra "Sem estoque").
 *
 * Rodar: bun scripts/import-products.ts [--digikey-per-query 65] [--ebay-per-query 65] [--dry-run]
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
import { DigiKeyClient } from "../packages/infrastructure/src/connectors/digikey/client";
import { DigiKeyConnector } from "../packages/infrastructure/src/connectors/digikey/connector";
import {
  createNoopRateLimiter,
  createNoRetryPolicy,
  createStringCheckpointSerializer
} from "../packages/infrastructure/src/connectors/core";

const STORE_ID = "cmrfu2kdb0000oybnlekztroj";
const TARGET_PER_SOURCE = 500;

const DIGIKEY_QUERIES = ["stm32", "esp32", "arduino", "resistor", "capacitor", "led", "sensor", "motor", "diode", "transistor", "relay", "connector", "crystal oscillator", "inductor"];
const EBAY_QUERIES = ["ssd", "ram", "gpu", "cpu", "monitor", "keyboard", "mouse", "headset", "nvme ssd", "webcam", "router", "tablet"];

interface NormalizedHit {
  externalId: string;
  title: string;
  description: string;
  brand: string | null;
  category: string | null;
  priceMinor: number;
  currency: string;
  inventory: number;
  sourceUrl: string | null;
  imageUrl: string | null;
  attributes: Record<string, string>;
  shipsFromCountry: string;
  fulfillmentDays: { min: number; max: number };
}

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : fallback;
}

const digikeyPerQuery = arg("digikey-per-query", 65);
const ebayPerQuery = arg("ebay-per-query", 65);
const dryRun = process.argv.includes("--dry-run");
const sourceArg = (process.argv.find((a) => a.startsWith("--source")) ?? "").split("=")[1] ?? "both";

function envVar(name: string): string {
  const line = readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : "";
}

function slugify(title: string, sku: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return `${base || "produto"}-${sku.toLowerCase()}`;
}

async function importDigiKey(): Promise<NormalizedHit[]> {
  const client = new DigiKeyClient();
  const connector = new DigiKeyConnector(
    {
      provider: "digikey",
      transport: { name: "unused", execute: async () => ({ status: 0, headers: {}, body: "", durationMs: 0 }) },
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

  const byExternalId = new Map<string, NormalizedHit>();

  for (const keyword of DIGIKEY_QUERIES) {
    if (byExternalId.size >= TARGET_PER_SOURCE) break;
    const wanted = Math.min(digikeyPerQuery, TARGET_PER_SOURCE - byExternalId.size);
    try {
      for await (const page of connector.discover({
        keyword,
        region: "US",
        language: "en",
        limit: wanted
      })) {
        for (const raw of page.products as Array<Record<string, any>>) {
          const externalId: string = raw.externalId ?? "";
          const priceMinor: number = raw.price?.amount ?? 0;
          if (!externalId || !priceMinor || byExternalId.has(externalId)) continue;
          if (byExternalId.size >= TARGET_PER_SOURCE) break;
          byExternalId.set(externalId, {
            externalId,
            title: String(raw.title ?? externalId),
            description: String(raw.description ?? raw.title ?? ""),
            brand: raw.brand ?? null,
            category: raw.category ?? null,
            priceMinor,
            currency: raw.price?.currency ?? "USD",
            inventory: Math.max(0, Number(raw.inventory ?? 0)),
            sourceUrl: raw.sourceUrl ?? null,
            imageUrl: Array.isArray(raw.images) && raw.images[0] ? String(raw.images[0]) : null,
            attributes: (raw.attributes ?? {}) as Record<string, string>,
            shipsFromCountry: raw.shippingFromCountry ?? "US",
            fulfillmentDays: raw.estimatedDeliveryDays ?? { min: 1, max: 5 }
          });
        }
        break; // 1 página por query basta para o volume-alvo
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : JSON.stringify(err);
      console.log(`  ⚠ DigiKey "${keyword}" falhou (tentativa 1): ${detail}`);
      await new Promise((r) => setTimeout(r, 2500));
      try {
        for await (const page of connector.discover({
          keyword,
          region: "US",
          language: "en",
          limit: Math.min(wanted, 50)
        })) {
          for (const raw of page.products as Array<Record<string, any>>) {
            const externalId: string = raw.externalId ?? "";
            const priceMinor: number = raw.price?.amount ?? 0;
            if (!externalId || !priceMinor || byExternalId.has(externalId)) continue;
            if (byExternalId.size >= TARGET_PER_SOURCE) break;
            byExternalId.set(externalId, {
              externalId,
              title: String(raw.title ?? externalId),
              description: String(raw.description ?? raw.title ?? ""),
              brand: raw.brand ?? null,
              category: raw.category ?? null,
              priceMinor,
              currency: raw.price?.currency ?? "USD",
              inventory: Math.max(0, Number(raw.inventory ?? 0)),
              sourceUrl: raw.sourceUrl ?? null,
              imageUrl: Array.isArray(raw.images) && raw.images[0] ? String(raw.images[0]) : null,
              attributes: (raw.attributes ?? {}) as Record<string, string>,
              shipsFromCountry: raw.shippingFromCountry ?? "US",
              fulfillmentDays: raw.estimatedDeliveryDays ?? { min: 1, max: 5 }
            });
          }
          break;
        }
      } catch (err2) {
        const detail2 = err2 instanceof Error ? err2.message : JSON.stringify(err2);
        console.log(`  ⚠ DigiKey "${keyword}" falhou (tentativa 2): ${detail2}`);
      }
    }
    console.log(`Importando ${byExternalId.size}/${TARGET_PER_SOURCE} do DigiKey...`);
    await new Promise((r) => setTimeout(r, 1200));
  }
  return [...byExternalId.values()];
}

interface EbayItem {
  itemId: string;
  title: string;
  condition?: string;
  price?: { value?: string; currency?: string };
  itemWebUrl?: string;
  image?: { imageUrl?: string };
  seller?: { username?: string };
  itemLocation?: { countryCode?: string };
}

async function importEbay(): Promise<NormalizedHit[]> {
  const clientId = envVar("EBAY_CLIENT_ID");
  const clientSecret = envVar("EBAY_CLIENT_SECRET");
  const envName = (envVar("EBAY_ENV") || "sandbox").toLowerCase();
  const apiBase = envName === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";

  if (!clientId || !clientSecret) {
    console.log("  ⚠ EBAY_CLIENT_ID/EBAY_CLIENT_SECRET ausentes — eBay pulado");
    return [];
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch(`${apiBase}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "https://api.ebay.com/oauth/api_scope" })
  });
  if (!tokenRes.ok) {
    console.log(`  ⚠ token eBay HTTP ${tokenRes.status} — eBay pulado`);
    return [];
  }
  const { access_token: token } = (await tokenRes.json()) as { access_token: string };

  const byExternalId = new Map<string, NormalizedHit>();

  for (const keyword of EBAY_QUERIES) {
    if (byExternalId.size >= TARGET_PER_SOURCE) break;
    const wanted = Math.min(ebayPerQuery, TARGET_PER_SOURCE - byExternalId.size);
    try {
      const res = await fetch(
        `${apiBase}/buy/browse/v1/item_summary/search?q=${encodeURIComponent(keyword)}&limit=${wanted}`,
        { headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" } }
      );
      if (!res.ok) {
        console.log(`  ⚠ eBay "${keyword}" HTTP ${res.status}`);
        continue;
      }
      const { itemSummaries = [] } = (await res.json()) as { itemSummaries?: EbayItem[] };
      for (const item of itemSummaries) {
        const externalId = item.itemId ?? "";
        const priceMajor = Number(item.price?.value ?? 0);
        if (!externalId || !priceMajor || byExternalId.has(externalId)) continue;
        if (byExternalId.size >= TARGET_PER_SOURCE) break;
        byExternalId.set(externalId, {
          externalId,
          title: item.title ?? externalId,
          description: `${item.condition ?? "Novo/uso conforme anúncio"} — vendido por ${item.seller?.username ?? "vendedor do eBay"} via eBay.`,
          brand: null,
          category: null,
          priceMinor: Math.round(priceMajor * 100),
          currency: item.price?.currency ?? "USD",
          inventory: 0, // a busca do eBay não expõe quantidade — honesto
          sourceUrl: item.itemWebUrl ?? null,
          imageUrl: item.image?.imageUrl ?? null,
          attributes: {
            ...(item.condition ? { condition: item.condition } : {}),
            ...(item.seller?.username ? { seller: item.seller.username } : {})
          },
          shipsFromCountry: item.itemLocation?.countryCode ?? "US",
          fulfillmentDays: { min: 7, max: 21 }
        });
      }
    } catch (err) {
      console.log(`  ⚠ eBay "${keyword}" falhou: ${err instanceof Error ? err.message : err}`);
    }
    console.log(`Importando ${byExternalId.size}/${TARGET_PER_SOURCE} do eBay...`);
  }
  return [...byExternalId.values()];
}

async function upsertSource(
  supplierCode: string,
  supplierName: string,
  hits: NormalizedHit[]
): Promise<{ created: number; synced: number }> {
  const supplier = await prisma.supplier.upsert({
    where: { code: supplierCode },
    create: { code: supplierCode, name: supplierName, defaultCurrency: "USD", shipsFromCountry: "US" },
    update: {}
  });

  let created = 0;
  let synced = 0;

  for (const hit of hits) {
    const sku = `${supplierCode.toUpperCase()}-${hit.externalId}`;
    const minPrice = BigInt(Math.max(1, hit.priceMinor));

    const existed = await prisma.product.findUnique({ where: { sku }, select: { id: true } });
    const product = await prisma.product.upsert({
      where: { sku },
      create: {
        storeId: STORE_ID,
        sku,
        slug: slugify(hit.title, sku),
        title: hit.title.slice(0, 300),
        description: (hit.description || hit.title).slice(0, 2000),
        status: "published",
        basePriceMinorUnits: minPrice,
        basePriceCurrencyCode: hit.currency
      },
      update: {
        basePriceMinorUnits: minPrice,
        basePriceCurrencyCode: hit.currency
      }
    });
    if (existed) synced++;
    else created++;

    // Oferta: chave (produto, fornecedor, SKU externo) — sincroniza preço/estoque
    const existingOffer = await prisma.productOffer.findFirst({
      where: { productId: product.id, supplierId: supplier.id, supplierSku: hit.externalId },
      select: { id: true }
    });
    const offerData = {
      priceMinorUnits: BigInt(hit.priceMinor),
      priceCurrencyCode: hit.currency,
      inventory: hit.inventory,
      lastSyncedAt: new Date()
    };
    if (existingOffer) {
      await prisma.productOffer.update({ where: { id: existingOffer.id }, data: offerData });
    } else {
      await prisma.productOffer.create({
        data: {
          supplierId: supplier.id,
          productId: product.id,
          supplierSku: hit.externalId,
          externalProvider: supplierCode,
          externalId: hit.externalId,
          fulfillmentDaysMin: hit.fulfillmentDays.min,
          fulfillmentDaysMax: hit.fulfillmentDays.max,
          shipsFromCountry: hit.shipsFromCountry,
          ...offerData
        }
      });
    }

    // Atributos + mídia: criados apenas se o produto ainda não tem (idempotente)
    const attrCount = await prisma.productAttribute.count({ where: { productId: product.id } });
    if (attrCount === 0) {
      const entries = Object.entries(hit.attributes).slice(0, 12);
      if (entries.length > 0) {
        await prisma.productAttribute.createMany({
          data: entries.map(([name, value]) => ({
            productId: product.id,
            name: name.slice(0, 120),
            value: String(value).slice(0, 300),
            source: supplierCode === "digikey" ? "distributor" : "marketplace",
            sourceName: supplierName
          }))
        });
      }
    }
    const mediaCount = await prisma.productMedia.count({ where: { productId: product.id } });
    if (mediaCount === 0 && hit.imageUrl) {
      await prisma.productMedia.create({
        data: { productId: product.id, url: hit.imageUrl, altText: hit.title.slice(0, 200), isPrimary: true }
      });
    }

    const done = created + synced;
    if (done % 25 === 0 || done === hits.length) {
      console.log(`Importando ${done}/${hits.length} do ${supplierName}... (novos: ${created})`);
    }
  }

  return { created, synced };
}

async function main(): Promise<void> {
  console.log(`T068 — importação de produtos reais${dryRun ? " (DRY-RUN: nada será escrito)" : ""}`);

  const runDigikey = sourceArg === "both" || sourceArg === "digikey";
  const runEbay = sourceArg === "both" || sourceArg === "ebay";

  const digikeyHits = runDigikey ? await importDigiKey() : [];
  if (runDigikey) console.log(`DigiKey: ${digikeyHits.length} produtos normalizados`);

  const ebayHits = runEbay ? await importEbay() : [];
  if (runEbay) console.log(`eBay: ${ebayHits.length} produtos normalizados`);

  if (dryRun) {
    console.log("DRY-RUN — amostra DigiKey:", JSON.stringify(digikeyHits[0] ?? null, null, 1).slice(0, 600));
    console.log("DRY-RUN — amostra eBay:", JSON.stringify(ebayHits[0] ?? null, null, 1).slice(0, 600));
    await prisma.$disconnect();
    return;
  }

  const dk = await upsertSource("digikey", "DigiKey", digikeyHits);
  const eb = await upsertSource("ebay", "eBay", ebayHits);

  const total = await prisma.product.count();
  const newProducts = dk.created + eb.created;
  console.log(`\nTotal importado: ${newProducts} produtos novos (DigiKey: ${dk.created} novos/${dk.synced} re-sincronizados · eBay: ${eb.created} novos/${eb.synced} re-sincronizados)`);
  console.log(`Total no catálogo agora: ${total} produtos (inclui os 22 seed)`);
  await prisma.$disconnect();
}

main();
