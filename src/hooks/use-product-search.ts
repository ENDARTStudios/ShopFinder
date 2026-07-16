/**
 * ShopFinder — Ontology-enhanced product search hook
 *
 * Uses MiniSearch for full-text search with ontology-aware term mapping.
 * When the user types "soquete AM5", the hook:
 *   1. Resolves "soquete" → cpu.socket (via ontology aliases)
 *   2. Searches both the text AND the canonical attribute IDs
 *
 * This enables semantic search: "placa-mãe para i9" finds motherboards
 * with socket LGA1700 (the i9's socket), not just products with "i9" in the title.
 */
"use client";

import * as React from "react";
import MiniSearch from "minisearch";
import type { ApiProduct } from "@/components/site/landing";

// MiniSearch document type — extends ApiProduct with searchable attribute IDs
interface SearchableProduct extends ApiProduct {
  readonly attributeIds: string;     // "cpu.socket cpu.cores gpu.memory ..."
  readonly attributeValues: string;   // "LGA1700 24 24GB GDDR6X ..."
  readonly allText: string;           // title + brand + category + specs
}

// ── Ontology term resolver (client-side, lightweight) ──────

// Common Portuguese + English aliases for attribute names
// (subset of the full ontology — enough for search)
const SEARCH_ALIASES: Record<string, string> = {
  // CPU
  "socket": "cpu.socket", "soquete": "cpu.socket", "cpu_socket": "cpu.socket",
  "cores": "cpu.cores", "nucleos": "cpu.cores", "núcleos": "cpu.cores",
  "threads": "cpu.threads", "threads": "cpu.threads",
  "base_clock": "cpu.base_clock", "frequencia": "cpu.base_clock", "frequência": "cpu.base_clock",
  "turbo": "cpu.max_turbo", "boost": "cpu.max_turbo",
  "tdp": "cpu.tdp", "consumo": "cpu.tdp",
  // GPU
  "vram": "gpu.memory", "memoria_video": "gpu.memory", "memória de vídeo": "gpu.memory",
  "cuda": "gpu.cuda_cores",
  // Memory
  "ddr": "memory.type", "ddr4": "memory.type", "ddr5": "memory.type",
  "mhz": "memory.speed", "frequencia_ram": "memory.speed",
  // Storage
  "ssd": "storage.interface", "nvme": "storage.interface", "sata": "storage.interface",
  "leitura": "storage.read_speed", "escrita": "storage.write_speed",
  // PSU
  "watts": "psu.wattage", "w": "psu.wattage", "fonte": "psu.wattage",
  // Cooling
  "cooler": "cooling.type", "refrigeracao": "cooling.type",
};

function resolveSearchTerms(query: string): { text: string; attributeIds: string[] } {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const attributeIds: string[] = [];

  for (const term of terms) {
    // Check direct alias match
    if (SEARCH_ALIASES[term]) {
      attributeIds.push(SEARCH_ALIASES[term]);
    }
    // Check partial match (e.g., "soquete" matches "socket")
    for (const [alias, attrId] of Object.entries(SEARCH_ALIASES)) {
      if (term.includes(alias) || alias.includes(term)) {
        if (!attributeIds.includes(attrId)) {
          attributeIds.push(attrId);
        }
      }
    }
  }

  return { text: query, attributeIds };
}

// ── Hook ───────────────────────────────────────────────────

export function useProductSearch(
  allProducts: ApiProduct[],
  query: string,
  nicheFilter: string | null
) {
  const [searchIndex, setSearchIndex] = React.useState<MiniSearch<SearchableProduct> | null>(null);
  const [indexed, setIndexed] = React.useState(false);

  // Build the MiniSearch index when products change
  React.useEffect(() => {
    if (allProducts.length === 0) {
      setIndexed(false);
      return;
    }

    const docs: SearchableProduct[] = allProducts.map((p) => {
      const attributeIds = p.specs.map((s) => s.name).join(" ");
      const attributeValues = p.specs.map((s) => s.value).join(" ");
      const allText = [
        p.title,
        p.brand,
        p.category,
        p.description,
        attributeIds,
        attributeValues
      ].join(" ");

      return {
        ...p,
        attributeIds,
        attributeValues,
        allText
      };
    });

    const ms = new MiniSearch<SearchableProduct>({
      fields: ["title", "brand", "category", "attributeIds", "attributeValues", "allText"],
      storeFields: ["title", "brand", "category", "price", "slug", "imageGradient", "imageLabel", "specs", "offers", "inStock", "stockCount", "suppliers", "nicheId", "priceRange", "rating", "reviewCount", "mpn", "description"],
      searchOptions: {
        boost: { title: 3, brand: 2, attributeValues: 2 },
        fuzzy: 0.2,
        prefix: true,
        combineWith: "AND"
      }
    });

    ms.addAll(docs);
    setSearchIndex(ms);
    setIndexed(true);
  }, [allProducts]);

  // Search + filter
  const results = React.useMemo(() => {
    if (!indexed || !searchIndex) return [];

    // Filter by niche first (before search)
    let filtered = allProducts;
    if (nicheFilter) {
      filtered = allProducts.filter((p) => p.nicheId === nicheFilter);
    }

    // If no query, return all (filtered by niche)
    if (!query.trim()) {
      return filtered;
    }

    // Resolve ontology terms
    const { text, attributeIds } = resolveSearchTerms(query);

    // Build search query — search for text AND resolved attribute IDs
    const searchQueries: Array<{ queries: string[]; fields?: string[]; boost?: Record<string, number> }> = [
      { queries: [text] }
    ];

    if (attributeIds.length > 0) {
      // Also search for the attribute values (e.g., "AM5", "LGA1700")
      const valueTerms = text.split(/\s+/).filter((t) => t.length >= 2);
      searchQueries.push({
        queries: valueTerms,
        fields: ["attributeValues", "attributeIds"],
        boost: { attributeValues: 3, attributeIds: 2 }
      });
    }

    // Execute search
    const searchResults = searchIndex.search(searchQueries as any);

    // Map back to original products (filter by niche if set)
    const resultSlugs = new Set(searchResults.map((r) => r.slug));
    return filtered.filter((p) => resultSlugs.has(p.slug));
  }, [query, nicheFilter, indexed, searchIndex, allProducts]);

  return { results, indexed };
}
