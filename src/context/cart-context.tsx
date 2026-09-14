"use client";

import * as React from "react";

// ── Types ──────────────────────────────────────────────────

export interface CartItem {
  sku: string;
  title: string;
  price: number;
  currency: string;
  imageLabel?: string;
  qty: number;
}

interface CartState {
  items: CartItem[];
  isCartOpen: boolean;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isCartOpen: boolean;
  /** false até o estado ser restaurado do localStorage — clear() antes disso é perdido pela hidratação. */
  hydrated: boolean;
  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (sku: string) => void;
  setQty: (sku: string, qty: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = React.createContext<CartContextValue | null>(null);

const STORAGE_KEY = "sf:cart";
const MAX_ITEMS = 50;

// ── SSR-safe helpers ────────────────────────────────────────

function readStorage(): CartItem[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i: any) =>
        typeof i.sku === "string" &&
        typeof i.title === "string" &&
        typeof i.price === "number" &&
        typeof i.qty === "number"
    );
  } catch {
    return [];
  }
}

function writeStorage(items: CartItem[]) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota exceeded — ignore */
  }
}

// ── Provider ────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<CartState>({
    items: [],
    isCartOpen: false
  });
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate from localStorage on mount (client only)
  React.useEffect(() => {
    const stored = readStorage();
    setState((s) => ({ ...s, items: stored }));
    setHydrated(true);
  }, []);

  // Persist to localStorage whenever items change (after hydration)
  React.useEffect(() => {
    if (hydrated) {
      writeStorage(state.items);
    }
  }, [state.items, hydrated]);

  const itemCount = state.items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = state.items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const addItem = React.useCallback((item: Omit<CartItem, "qty">) => {
    setState((prev) => {
      const existing = prev.items.find((i) => i.sku === item.sku);
      if (existing) {
        const next = prev.items.map((i) =>
          i.sku === item.sku ? { ...i, qty: Math.min(i.qty + 1, 99) } : i
        );
        return { ...prev, items: next };
      }
      if (prev.items.length >= MAX_ITEMS) return prev;
      return {
        ...prev,
        items: [...prev.items, { ...item, qty: 1 }]
      };
    });
  }, []);

  const removeItem = React.useCallback((sku: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.sku !== sku)
    }));
  }, []);

  const setQty = React.useCallback((sku: string, qty: number) => {
    setState((prev) => {
      if (qty <= 0) {
        return { ...prev, items: prev.items.filter((i) => i.sku !== sku) };
      }
      return {
        ...prev,
        items: prev.items.map((i) => (i.sku === sku ? { ...i, qty: Math.min(qty, 99) } : i))
      };
    });
  }, []);

  const clear = React.useCallback(() => {
    setState((prev) => ({ ...prev, items: [] }));
  }, []);

  const openCart = React.useCallback(() => {
    setState((prev) => ({ ...prev, isCartOpen: true }));
  }, []);

  const closeCart = React.useCallback(() => {
    setState((prev) => ({ ...prev, isCartOpen: false }));
  }, []);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        itemCount,
        subtotal,
        isCartOpen: state.isCartOpen,
        hydrated,
        addItem,
        removeItem,
        setQty,
        clear,
        openCart,
        closeCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a <CartProvider>");
  }
  return ctx;
}
