/**
 * ShopFinder — Compare context (Sprint 12 recriação).
 *
 * Client-side React context that manages the user's product comparison
 * list. State is persisted to `localStorage` so the selection survives
 * page navigation and full reloads.
 *
 * Capacity: 4 products (UI surfaces a "max reached" hint when full).
 *
 * Public API:
 *   - `items: string[]`             — slugs of selected products
 *   - `addItem(slug)`               — add (no-op if already present or at capacity)
 *   - `removeItem(slug)`            — remove
 *   - `toggleItem(slug)`            — add if absent, remove if present
 *   - `clearAll()`                  — empty the list
 *   - `hasItem(slug): boolean`      — check membership
 *   - `isSelected(slug): boolean`   — alias for hasItem
 *   - `isFull: boolean`             — true when items.length === MAX_ITEMS
 *   - `compareUrl: string`          — `/compare?slugs=a,b,c` ready for navigation
 *
 * Persistence: envelope versionada `{ version: 1, items: [...] }` em
 * `localStorage` sob chave `shopfinder:compare`. Versão desconhecida
 * reseta para vazio (prevenção contra corrupção futura).
 *
 * Hidratação: estado começa vazio, populado em useEffect após mount —
 * evita mismatch SSR (server renderiza sem items, client popula depois).
 *
 * Provider montado em RootLayout via <CompareProvider> (componente client
 * wrapper que envolve o contexto).
 */
"use client";

import * as React from "react";

const MAX_ITEMS = 4;
const STORAGE_KEY = "shopfinder:compare";
const STORAGE_VERSION = 1;

interface CompareContextValue {
  items: string[];
  isFull: boolean;
  compareUrl: string;
  addItem: (slug: string) => void;
  removeItem: (slug: string) => void;
  toggleItem: (slug: string) => void;
  clearAll: () => void;
  hasItem: (slug: string) => boolean;
  isSelected: (slug: string) => boolean;
}

const CompareContext = React.createContext<CompareContextValue>({
  items: [],
  isFull: false,
  compareUrl: "/compare",
  addItem: () => {},
  removeItem: () => {},
  toggleItem: () => {},
  clearAll: () => {},
  hasItem: () => false,
  isSelected: () => false
});

interface StoredEnvelope {
  version: number;
  items: string[];
}

function readFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredEnvelope | string[];
    // Tolerate both new envelope and legacy bare-array shapes.
    if (Array.isArray(parsed)) {
      return parsed
        .filter((s): s is string => typeof s === "string")
        .slice(0, MAX_ITEMS);
    }
    if (parsed && parsed.version === STORAGE_VERSION && Array.isArray(parsed.items)) {
      return parsed.items
        .filter((s): s is string => typeof s === "string")
        .slice(0, MAX_ITEMS);
    }
    // Unknown version → reset (prevents corruption from future migrations).
    return [];
  } catch {
    return [];
  }
}

function writeToStorage(items: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: StoredEnvelope = { version: STORAGE_VERSION, items };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    // Notify other tabs / same-tab listeners (cross-tab sync future-proofing).
    window.dispatchEvent(new CustomEvent("shopfinder:compare-change"));
  } catch {
    // Swallow — localStorage may be unavailable (private mode, quota).
  }
}

export interface CompareProviderProps {
  children: React.ReactNode;
  /** Override capacity — used in tests. */
  maxItems?: number;
}

export function CompareProvider({ children, maxItems = MAX_ITEMS }: CompareProviderProps) {
  const [items, setItems] = React.useState<string[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate from localStorage after mount (avoids SSR/hydration mismatch).
  React.useEffect(() => {
    setItems(readFromStorage());
    setHydrated(true);
  }, []);

  // Persist whenever items change (after hydration).
  React.useEffect(() => {
    if (!hydrated) return;
    writeToStorage(items);
  }, [items, hydrated]);

  const addItem = React.useCallback(
    (slug: string) => {
      if (!slug) return;
      setItems((prev) => {
        if (prev.includes(slug)) return prev;
        if (prev.length >= maxItems) return prev;
        return [...prev, slug];
      });
    },
    [maxItems]
  );

  const removeItem = React.useCallback((slug: string) => {
    setItems((prev) => prev.filter((s) => s !== slug));
  }, []);

  const toggleItem = React.useCallback(
    (slug: string) => {
      if (!slug) return;
      setItems((prev) => {
        if (prev.includes(slug)) {
          return prev.filter((s) => s !== slug);
        }
        if (prev.length >= maxItems) return prev;
        return [...prev, slug];
      });
    },
    [maxItems]
  );

  const clearAll = React.useCallback(() => setItems([]), []);

  const hasItem = React.useCallback((slug: string) => items.includes(slug), [items]);
  const isSelected = React.useCallback((slug: string) => items.includes(slug), [items]);

  const value = React.useMemo<CompareContextValue>(
    () => ({
      items,
      isFull: items.length >= maxItems,
      compareUrl: items.length > 0 ? `/compare?slugs=${items.join(",")}` : "/compare",
      addItem,
      removeItem,
      toggleItem,
      clearAll,
      hasItem,
      isSelected
    }),
    [items, maxItems, addItem, removeItem, toggleItem, clearAll, hasItem, isSelected]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareContextValue {
  return React.useContext(CompareContext);
}

export const COMPARE_MAX_ITEMS = MAX_ITEMS;
