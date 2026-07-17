/**
 * ShopFinder — MiniSearch latency benchmark.
 *
 * Simulates the client-side search workload:
 *   1. Fetches all published products from the catalog API.
 *   2. Builds the MiniSearch index (one-time cost).
 *   3. Runs a set of representative queries (textual, ontological, filtered)
 *      and reports the median + p95 latency for each.
 *
 * Run:
 *   bun run scripts/bench-search.ts
 *
 * The script requires the dev server to be running on http://localhost:3000.
 *
 * Output:
 *   - Per-query: count, min, median, p95, max (ms)
 *   - Index build time
 *   - Total product count
 *
 * Goal: every query should complete in < 100ms with up to 1000 products
 * (the Sprint 16 target). If latency exceeds 100ms, it's a signal that we
 * need to migrate to Meilisearch or a server-side search endpoint.
 */
import MiniSearch from "minisearch";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

interface ApiProduct {
  id: string;
  slug: string;
  title: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  specs: Array<{ name: string; value: string }>;
}

interface SearchableProduct extends ApiProduct {
  attributeIds: string;
  attributeValues: string;
  allText: string;
}

const QUERIES: Array<{ label: string; query: string }> = [
  { label: "short brand",       query: "Intel" },
  { label: "long keyword",      query: "Intel Core i9" },
  { label: "ontological (PT)",  query: "soquete AM5" },
  { label: "ontological (EN)",  query: "socket LGA1700" },
  { label: "PSU wattage",       query: "fonte 750W" },
  { label: "microcontroller",   query: "STM32" },
  { label: "smartphone",        query: "iPhone 15" },
  { label: "audio",             query: "AirPods" },
  { label: "MPN lookup",        query: "BX8071514900K" },
  { label: "vague",             query: "processor" }
];

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx]!;
}

async function main() {
  console.log("🔍 ShopFinder MiniSearch Latency Benchmark\n");

  // 1. Fetch all products
  console.log(`  Fetching products from ${BASE_URL}/api/catalog...`);
  const fetchStart = Date.now();
  const res = await fetch(`${BASE_URL}/api/catalog?path=products&limit=1000`);
  if (!res.ok) {
    console.error(`  Failed to fetch products: HTTP ${res.status}`);
    process.exit(1);
  }
  const data = (await res.json()) as { products: ApiProduct[]; total: number };
  const fetchMs = Date.now() - fetchStart;
  console.log(`  Fetched ${data.products.length} products in ${fetchMs}ms\n`);

  // 2. Build the MiniSearch index
  const docs: SearchableProduct[] = data.products.map((p) => {
    const attributeIds = p.specs.map((s) => s.name).join(" ");
    const attributeValues = p.specs.map((s) => s.value).join(" ");
    const allText = [p.title, p.brand, p.category, p.description, attributeIds, attributeValues].join(" ");
    return { ...p, attributeIds, attributeValues, allText };
  });

  const indexStart = Date.now();
  const ms = new MiniSearch<SearchableProduct>({
    fields: ["title", "brand", "category", "attributeIds", "attributeValues", "allText"],
    storeFields: ["slug"],
    searchOptions: {
      boost: { title: 3, brand: 2, attributeValues: 2 },
      fuzzy: 0.2,
      prefix: true,
      combineWith: "AND"
    }
  });
  ms.addAll(docs);
  const indexMs = Date.now() - indexStart;
  console.log(`  Built MiniSearch index in ${indexMs}ms (${docs.length} docs)\n`);

  // 3. Run each query 50 times and collect latencies
  const ITERATIONS = 50;
  console.log(`  Running ${QUERIES.length} queries × ${ITERATIONS} iterations...\n`);
  console.log("  ┌──────────────────────────────┬────────┬────────┬────────┬────────┬────────┐");
  console.log("  │ Query                        │ Count  │ Min ms │ Med ms │ p95 ms │ Max ms │");
  console.log("  ├──────────────────────────────┼────────┼────────┼────────┼────────┼────────┤");

  const allLatencies: number[] = [];

  for (const { label, query } of QUERIES) {
    const latencies: number[] = [];
    let lastCount = 0;
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      const results = ms.search(query);
      const elapsed = performance.now() - start;
      latencies.push(elapsed);
      lastCount = results.length;
    }
    latencies.sort((a, b) => a - b);
    allLatencies.push(...latencies);
    const min = latencies[0]!.toFixed(2);
    const med = percentile(latencies, 50).toFixed(2);
    const p95 = percentile(latencies, 95).toFixed(2);
    const max = latencies[latencies.length - 1]!.toFixed(2);
    console.log(
      `  │ ${label.padEnd(28)} │ ${String(lastCount).padStart(6)} │ ${min.padStart(6)} │ ${med.padStart(6)} │ ${p95.padStart(6)} │ ${max.padStart(6)} │`
    );
  }
  console.log("  └──────────────────────────────┴────────┴────────┴────────┴────────┴────────┘\n");

  // 4. Verdict
  allLatencies.sort((a, b) => a - b);
  const overallP95 = percentile(allLatencies, 95);
  const overallMax = allLatencies[allLatencies.length - 1]!;

  console.log(`  Overall across ${QUERIES.length * ITERATIONS} searches:`);
  console.log(`    p95 latency: ${overallP95.toFixed(2)}ms`);
  console.log(`    max latency: ${overallMax.toFixed(2)}ms`);
  console.log(`    catalog size: ${docs.length} products\n`);

  if (overallP95 < 100) {
    console.log("  ✅ PASS — p95 latency < 100ms. MiniSearch is adequate for this catalog size.");
  } else if (overallP95 < 250) {
    console.log("  ⚠ WARN — p95 latency between 100-250ms. Consider migrating to Meilisearch for > 1000 products.");
  } else {
    console.log("  ❌ FAIL — p95 latency > 250ms. MiniSearch is no longer adequate. Migrate to Meilisearch.");
  }
  console.log("");
}

main().catch((e) => {
  console.error("Benchmark failed:", e);
  process.exit(1);
});
