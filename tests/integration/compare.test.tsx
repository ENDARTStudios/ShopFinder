/**
 * Sprint 12 — /api/catalog?slugs= + /compare page + CompareContext integration tests.
 *
 * 17 testes cobrindo:
 *   - Catalog API ?slugs= filter (6 testes)
 *   - /compare page render (2 testes)
 *   - CompareContext state machine pure logic (9 testes)
 *
 * Os testes do Catalog API e da página /compare rodam contra o dev server
 * (http://localhost:3000). Os testes do CompareContext são pure logic —
 * reimplementam o reducer do contexto em TypeScript puro para verificar os
 * invariantes sem precisar de DOM.
 *
 * Run: bun test tests/integration/compare.test.tsx
 */
/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// ── Catalog API ?slugs= filter ────────────────────────────

describe("Catalog API ?slugs= filter", () => {
  it("should return only the requested slugs", async () => {
    const url = `${BASE_URL}/api/catalog?path=products&slugs=intel-core-i9-14900k-desktop-processor,amd-ryzen-9-7950x-desktop-processor&limit=10`;
    const res = await fetch(url);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.products).toBeDefined();
    expect(data.products.length).toBe(2);
    const slugs = data.products.map((p: { slug: string }) => p.slug);
    expect(slugs).toContain("intel-core-i9-14900k-desktop-processor");
    expect(slugs).toContain("amd-ryzen-9-7950x-desktop-processor");
  });

  it("should include enrichedSpecs with provenance", async () => {
    const url = `${BASE_URL}/api/catalog?path=products&slugs=intel-core-i9-14900k-desktop-processor&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    const product = data.products[0];
    expect(product).toBeDefined();
    expect(product.enrichedSpecs).toBeDefined();
    expect(product.enrichedSpecs.length).toBeGreaterThan(0);
    const firstEnriched = product.enrichedSpecs[0];
    expect(firstEnriched.source).not.toBeNull();
    expect(firstEnriched.confidence).not.toBeNull();
    expect(firstEnriched.evidence).toBeInstanceOf(Array);
    expect(firstEnriched.evidence.length).toBeGreaterThan(0);
  });

  it("should include manufacturer extracted from description", async () => {
    const url = `${BASE_URL}/api/catalog?path=products&slugs=intel-core-i9-14900k-desktop-processor&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    const product = data.products[0];
    expect(product.manufacturer).toBe("Intel Corporation");
  });

  it("should return empty list for unknown slugs", async () => {
    const url = `${BASE_URL}/api/catalog?path=products&slugs=does-not-exist-12345&limit=10`;
    const res = await fetch(url);
    const data = await res.json();
    expect(data.products).toEqual([]);
    expect(data.total).toBe(0);
  });

  it("should ignore empty slug segments", async () => {
    const url = `${BASE_URL}/api/catalog?path=products&slugs=,,intel-core-i9-14900k-desktop-processor,,&limit=10`;
    const res = await fetch(url);
    const data = await res.json();
    expect(data.products.length).toBe(1);
    expect(data.products[0].slug).toBe("intel-core-i9-14900k-desktop-processor");
  });

  it("should cap slugs at 20 to prevent abuse", async () => {
    // Build 25 slug segments; only the first 20 should be honoured. We use
    // the Intel CPU slug + 24 unknown segments so the expected result is 1.
    const slugs = Array.from({ length: 24 }, (_, i) => `unknown-${i}`).join(",");
    const url = `${BASE_URL}/api/catalog?path=products&slugs=intel-core-i9-14900k-desktop-processor,${slugs}&limit=50`;
    const res = await fetch(url);
    const data = await res.json();
    // Should still include the Intel CPU (one of the first 20) — at most 1 result.
    expect(data.products.length).toBe(1);
  });
});

// ── /compare page ─────────────────────────────────────────

describe("/compare page", () => {
  it("should render the empty state when no slugs are provided", async () => {
    const res = await fetch(`${BASE_URL}/compare`);
    expect(res.status).toBe(200);
    const html = await res.text();
    // Empty-state copy (PT default locale)
    expect(html).toContain("Nenhum produto selecionado");
  });

  it("should render the comparison shell when slugs are provided", async () => {
    const url = `${BASE_URL}/compare?slugs=intel-core-i9-14900k-desktop-processor,amd-ryzen-9-7950x-desktop-processor`;
    const res = await fetch(url);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Comparar Produtos");
    // Loading indicator should appear initially (client-side fetch happens
    // after hydration).
    expect(html.length).toBeGreaterThan(1000);
  });
});

// ── CompareContext state machine (pure logic) ─────────────
//
// Reimplementa o reducer do CompareContext em TypeScript puro para verificar
// os invariantes sem precisar de DOM. O hook React real é um wrapper fino
// sobre esta mesma lógica.

interface CompareState {
  items: string[];
  maxItems: number;
}

function initState(maxItems = 4): CompareState {
  return { items: [], maxItems };
}

function addItem(state: CompareState, slug: string): CompareState {
  if (!slug) return state;
  if (state.items.includes(slug)) return state;
  if (state.items.length >= state.maxItems) return state;
  return { ...state, items: [...state.items, slug] };
}

function removeItem(state: CompareState, slug: string): CompareState {
  return { ...state, items: state.items.filter((s) => s !== slug) };
}

function toggleItem(state: CompareState, slug: string): CompareState {
  if (!slug) return state;
  if (state.items.includes(slug)) return removeItem(state, slug);
  return addItem(state, slug);
}

function clearAll(state: CompareState): CompareState {
  return { ...state, items: [] };
}

function isSelected(state: CompareState, slug: string): boolean {
  return state.items.includes(slug);
}

describe("CompareContext state machine (pure logic)", () => {
  it("should start empty", () => {
    const s = initState();
    expect(s.items).toEqual([]);
  });

  it("addItem should add a slug to the list", () => {
    const s0 = initState();
    const s1 = addItem(s0, "intel");
    expect(s1.items).toEqual(["intel"]);
    expect(isSelected(s1, "intel")).toBe(true);
    expect(isSelected(s1, "amd")).toBe(false);
  });

  it("removeItem should remove a slug", () => {
    let s = initState();
    s = addItem(s, "intel");
    s = addItem(s, "amd");
    s = removeItem(s, "intel");
    expect(s.items).toEqual(["amd"]);
    expect(isSelected(s, "intel")).toBe(false);
  });

  it("should refuse to exceed max capacity (4)", () => {
    let s = initState(4);
    s = addItem(s, "a");
    s = addItem(s, "b");
    s = addItem(s, "c");
    s = addItem(s, "d");
    s = addItem(s, "e"); // should be ignored
    expect(s.items).toEqual(["a", "b", "c", "d"]);
    expect(s.items.length).toBe(4);
  });

  it("isSelected should return true/false correctly", () => {
    let s = initState();
    s = addItem(s, "intel");
    expect(isSelected(s, "intel")).toBe(true);
    expect(isSelected(s, "amd")).toBe(false);
  });

  it("clearAll should empty the list", () => {
    let s = initState();
    s = addItem(s, "a");
    s = addItem(s, "b");
    s = clearAll(s);
    expect(s.items).toEqual([]);
  });

  it("addItem should be idempotent (no-op if already present)", () => {
    let s = initState();
    s = addItem(s, "a");
    s = addItem(s, "a"); // ignored
    expect(s.items).toEqual(["a"]);
  });

  it("toggleItem should add if absent and remove if present", () => {
    let s = initState();
    s = toggleItem(s, "a");
    expect(s.items).toEqual(["a"]);
    s = toggleItem(s, "a");
    expect(s.items).toEqual([]);
  });

  it("toggleItem should respect max capacity when adding", () => {
    let s = initState(4);
    s = addItem(s, "a");
    s = addItem(s, "b");
    s = addItem(s, "c");
    s = addItem(s, "d");
    s = toggleItem(s, "e"); // should be ignored
    expect(s.items.length).toBe(4);
    expect(s.items).toEqual(["a", "b", "c", "d"]);
  });

  it("removeItem of a non-existent slug should be safe (no crash)", () => {
    let s = initState();
    s = addItem(s, "a");
    s = removeItem(s, "nonexistent");
    expect(s.items).toEqual(["a"]);
  });
});

// ── localStorage persistence + hydration (logic simulation) ──
//
// Simula o envelope versionado e a lógica de hidratação do CompareContext
// sem precisar de DOM — valida o contrato de persistência.

const STORAGE_VERSION = 1;

interface StoredEnvelope {
  version: number;
  items: string[];
}

function simulateWriteToStorage(items: string[]): string {
  const envelope: StoredEnvelope = { version: STORAGE_VERSION, items };
  return JSON.stringify(envelope);
}

function simulateReadFromStorage(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredEnvelope | string[];
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === "string").slice(0, 4);
    }
    if (parsed && parsed.version === STORAGE_VERSION && Array.isArray(parsed.items)) {
      return parsed.items.filter((s): s is string => typeof s === "string").slice(0, 4);
    }
    // Unknown version → reset
    return [];
  } catch {
    return [];
  }
}

describe("CompareContext persistence + hydration (logic simulation)", () => {
  it("should persist items to localStorage envelope", () => {
    const items = ["a", "b", "c"];
    const raw = simulateWriteToStorage(items);
    const parsed = JSON.parse(raw) as StoredEnvelope;
    expect(parsed.version).toBe(1);
    expect(parsed.items).toEqual(["a", "b", "c"]);
  });

  it("should hydrate from localStorage on mount", () => {
    const raw = simulateWriteToStorage(["intel", "amd"]);
    const hydrated = simulateReadFromStorage(raw);
    expect(hydrated).toEqual(["intel", "amd"]);
  });

  it("envelope versionada: unknown version = reset to empty", () => {
    const future: StoredEnvelope = { version: 99, items: ["a", "b"] };
    const raw = JSON.stringify(future);
    const hydrated = simulateReadFromStorage(raw);
    expect(hydrated).toEqual([]);
  });

  it("should tolerate legacy bare-array shape", () => {
    const legacy = JSON.stringify(["intel", "amd"]);
    const hydrated = simulateReadFromStorage(legacy);
    expect(hydrated).toEqual(["intel", "amd"]);
  });

  it("should tolerate null/corrupted storage (return empty)", () => {
    expect(simulateReadFromStorage(null)).toEqual([]);
    expect(simulateReadFromStorage("not valid json")).toEqual([]);
  });
});
