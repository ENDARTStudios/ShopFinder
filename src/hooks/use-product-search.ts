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
 *
 * Sprint 11: hook estendido para aceitar `ProductFilter` (manufacturers,
 * priceMin/Max, attributes). Filtros aplicados APÓS a busca textual —
 * MiniSearch retorna candidatos, depois o filtro paramétrico reduz.
 */
"use client";

import * as React from "react";
import MiniSearch from "minisearch";
import type { ApiProduct } from "@/components/site/landing";

// ── Filter contract ────────────────────────────────────────

/**
 * ProductFilter — declarative parametric filter applied AFTER textual search.
 *
 * - `manufacturers`: list of brand names (matched against `product.brand`).
 * - `priceMin`, `priceMax`: USD price bounds (inclusive). When `priceRange.min`
 *   is 0 (no offers yet), the product's own base price is used instead.
 * - `attributes`: map of attribute name → lowercase substring that must
 *   appear in the attribute value (e.g. `{ "psu.wattage": "850" }`).
 *   Empty values are ignored.
 */
export interface ProductFilter {
  manufacturers: string[];
  priceMin?: number;
  priceMax?: number;
  attributes: Record<string, string>;
}

export const EMPTY_FILTER: ProductFilter = {
  manufacturers: [],
  attributes: {}
};

export function isFilterEmpty(f: ProductFilter): boolean {
  return (
    f.manufacturers.length === 0 &&
    f.priceMin === undefined &&
    f.priceMax === undefined &&
    Object.values(f.attributes).every((v) => !v || v.trim() === "")
  );
}

// MiniSearch document type — extends ApiProduct with searchable attribute IDs
interface SearchableProduct extends ApiProduct {
  readonly attributeIds: string; // "cpu.socket cpu.cores gpu.memory ..."
  readonly attributeValues: string; // "LGA1700 24 24GB GDDR6X ..."
  readonly allText: string; // title + brand + category + specs
}

// ── Ontology term resolver (client-side, lightweight) ──────

// Common Portuguese + English aliases for attribute names
// (subset of the full ontology — enough for search)
const SEARCH_ALIASES: Record<string, string> = {
  // CPU
  socket: "cpu.socket",
  soquete: "cpu.socket",
  cpu_socket: "cpu.socket",
  cores: "cpu.cores",
  nucleos: "cpu.cores",
  núcleos: "cpu.cores",
  threads: "cpu.threads",
  base_clock: "cpu.base_clock",
  frequencia: "cpu.base_clock",
  frequência: "cpu.base_clock",
  turbo: "cpu.max_turbo",
  boost: "cpu.max_turbo",
  tdp: "cpu.tdp",
  consumo: "cpu.tdp",
  // GPU
  vram: "gpu.memory",
  memoria_video: "gpu.memory",
  "memória de vídeo": "gpu.memory",
  cuda: "gpu.cuda_cores",
  // Memory
  ddr: "memory.type",
  ddr4: "memory.type",
  ddr5: "memory.type",
  mhz: "memory.speed",
  frequencia_ram: "memory.speed",
  // Storage
  ssd: "storage.interface",
  nvme: "storage.interface",
  sata: "storage.interface",
  leitura: "storage.read_speed",
  escrita: "storage.write_speed",
  // PSU
  watts: "psu.wattage",
  w: "psu.wattage",
  fonte: "psu.wattage",
  // Cooling
  cooler: "cooling.type",
  refrigeracao: "cooling.type"
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

// ── Parametric filtering (post-search) ─────────────────────

function passesParametricFilter(p: ApiProduct, filter: ProductFilter): boolean {
  // Manufacturer (brand) filter
  if (filter.manufacturers.length > 0) {
    if (!filter.manufacturers.includes(p.brand)) return false;
  }

  // Price filter — use the offer range if available, otherwise base price.
  if (filter.priceMin !== undefined || filter.priceMax !== undefined) {
    const effectiveMin = p.priceRange.min > 0 ? p.priceRange.min : p.price;
    const effectiveMax = p.priceRange.max > 0 ? p.priceRange.max : p.price;
    if (filter.priceMin !== undefined && effectiveMax < filter.priceMin) return false;
    if (filter.priceMax !== undefined && effectiveMin > filter.priceMax) return false;
  }

  // Attribute filters — match by canonical attribute name OR display label
  // substring; value matched by substring (case-insensitive).
  const attrEntries = Object.entries(filter.attributes).filter(([, v]) => v && v.trim() !== "");
  if (attrEntries.length > 0) {
    for (const [attrName, valueQuery] of attrEntries) {
      const lowered = valueQuery.toLowerCase().trim();
      const match = p.specs.find((s) => {
        const name = s.name.toLowerCase();
        const value = s.value.toLowerCase();
        const nameMatches =
          name === attrName.toLowerCase() || name.includes(attrName.toLowerCase());
        return nameMatches && value.includes(lowered);
      });
      if (!match) return false;
    }
  }

  return true;
}

// ── Hook ───────────────────────────────────────────────────

export function useProductSearch(
  allProducts: ApiProduct[],
  query: string,
  nicheFilter: string | null,
  productFilter: ProductFilter = EMPTY_FILTER
) {
  const [searchIndex, setSearchIndex] = React.useState<MiniSearch<SearchableProduct> | null>(null);
  const [indexed, setIndexed] = React.useState(false);

  // Build the MiniSearch index when products change.
  // T078 — adiado para idle: não bloqueia a primeira pintura/interação
  // (index de ~1.000 produtos custa ~1s de main thread).
  React.useEffect(() => {
    if (allProducts.length === 0) {
      setIndexed(false);
      return;
    }

    const buildIndex = () => {
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
        storeFields: [
          "title",
          "brand",
          "category",
          "price",
          "slug",
          "imageGradient",
          "imageLabel",
          "specs",
          "offers",
          "inStock",
          "stockCount",
          "suppliers",
          "nicheId",
          "priceRange",
          "rating",
          "reviewCount",
          "mpn",
          "description"
        ],
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
    };

    // Defer to idle: o build de ~1.000 docs custa ~1s de main thread.
    const ric = (
      globalThis as { requestIdleCallback?: (cb: () => void) => number }
    ).requestIdleCallback;
    if (typeof ric === "function") {
      ric(buildIndex);
    } else {
      const t = setTimeout(buildIndex, 50);
      return () => clearTimeout(t);
    }
  }, [allProducts]);

  // Search + filter
  const results = React.useMemo(() => {
    if (!indexed || !searchIndex) return [];

    // Filter by niche first (before search)
    let filtered = allProducts;
    if (nicheFilter) {
      filtered = allProducts.filter((p) => p.nicheId === nicheFilter);
    }

    // Textual search phase
    let textMatches: ApiProduct[];
    if (!query.trim()) {
      textMatches = filtered;
    } else {
      // Resolve ontology terms
      const { text, attributeIds } = resolveSearchTerms(query);

      // Build search query — search for text AND resolved attribute IDs.
      // MiniSearch v7: múltiplas queries vão numa QueryCombination
      // ({ queries: [...] }) — passar o array direto lança TypeError.
      const searchQueries: Array<{
        queries: string[];
        fields?: string[];
        boost?: Record<string, number>;
      }> = [{ queries: [text] }];

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
      const searchResults = searchIndex.search({ queries: searchQueries } as Parameters<
        typeof searchIndex.search
      >[0]);
      const resultSlugs = new Set(searchResults.map((r) => r.slug));
      textMatches = filtered.filter((p) => resultSlugs.has(p.slug));
    }

    // Parametric filter phase (Sprint 11)
    if (isFilterEmpty(productFilter)) {
      return textMatches;
    }
    return textMatches.filter((p) => passesParametricFilter(p, productFilter));
  }, [query, nicheFilter, productFilter, indexed, searchIndex, allProducts]);

  return { results, indexed };
}
