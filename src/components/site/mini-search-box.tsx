/**
 * ShopFinder — MiniSearchBox (Sprint 12 recriação).
 *
 * Input de busca com dropdown de sugestões para adicionar produtos à
 * comparação. Faz fetch de todos os produtos do catalog API uma vez,
 * filtra client-side por title/brand/sku/mpn conforme o usuário digita.
 *
 * Uso: recebe `excludedSlugs` (slugs já na comparação) e `onAdd` callback.
 * Ao selecionar uma sugestão, chama onAdd(slug) e limpa o input.
 *
 * Debounce de 150ms para não filtrar a cada tecla.
 * Click-outside fecha o dropdown.
 */
"use client";

import * as React from "react";
import { Search, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";

interface MiniProduct {
  slug: string;
  title: string;
  brand: string;
  sku: string;
  mpn: string;
  price: number;
}

interface MiniSearchBoxProps {
  excludedSlugs: string[];
  onAdd: (slug: string) => void;
}

export function MiniSearchBox({ excludedSlugs, onAdd }: MiniSearchBoxProps) {
  const t = useTranslations("compare");
  const [query, setQuery] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const [allProducts, setAllProducts] = React.useState<MiniProduct[]>([]);
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const boxRef = React.useRef<HTMLDivElement | null>(null);

  // Fetch all products once
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/catalog?path=products&limit=1000")
      .then((r) => r.json())
      .then((d: { products: MiniProduct[] }) => {
        if (!cancelled) setAllProducts(d.products ?? []);
      })
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounce query
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(id);
  }, [query]);

  // Click outside to close
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = React.useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const ql = debouncedQuery.toLowerCase();
    return allProducts
      .filter(
        (p) =>
          p.title.toLowerCase().includes(ql) ||
          p.brand.toLowerCase().includes(ql) ||
          p.sku.toLowerCase().includes(ql) ||
          p.mpn.toLowerCase().includes(ql)
      )
      .filter((p) => !excludedSlugs.includes(p.slug))
      .slice(0, 8);
  }, [allProducts, debouncedQuery, excludedSlugs]);

  return (
    <div ref={boxRef} className="relative w-full">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("addMore")}
      </label>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          placeholder={t("addMorePlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          className="h-10 pl-9 text-sm"
          aria-label={t("addMorePlaceholder")}
        />
      </div>
      {focused && debouncedQuery.trim() && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border/60 bg-popover shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {t("noResults", { query: debouncedQuery })}
            </div>
          ) : (
            results.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => {
                  onAdd(p.slug);
                  setQuery("");
                  setFocused(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{p.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {p.brand} · ${p.price.toFixed(2)}
                  </div>
                </div>
                <Plus className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
