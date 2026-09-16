"use client";

/**
 * T107 — Controles + grade dos resultados (client).
 *
 * Toda interação atualiza a URL (router.replace/push, sem reload) — o server
 * re-renderiza a página com os novos params. Back/forward restaura. Densidade
 * persiste em localStorage quando não há ?view= (URL vence).
 */
import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Price } from "@/components/site/price";

export interface ResultProduct {
  slug: string;
  title: string;
  brand: string;
  category: string;
  priceMinBrl: number;
  inStock: boolean;
  stock: "in" | "supplier" | "out";
  supplierNames: string[];
}

interface Resolved {
  sort: string;
  view: "grid" | "list" | null;
  suppliers: string[];
  brands: string[];
  priceMin: number | null;
  priceMax: number | null;
  inStock: boolean;
  q: string;
}

interface Labels {
  sort: string;
  sortRelevance: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  density: string;
  gridView: string;
  listView: string;
  supplier: string;
  inStockOnly: string;
  min: string;
  max: string;
  apply: string;
}

const VIEW_STORAGE_KEY = "shopfinder:results-view";

function buildUrl(
  pathname: string,
  current: URLSearchParams,
  changes: Record<string, string | null>
): string {
  const sp = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") sp.delete(key);
    else sp.set(key, value);
  }
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function ResultsView({
  products,
  resolved,
  supplierOptions,
  brandOptions,
  labels
}: {
  products: ResultProduct[];
  resolved: Resolved;
  supplierOptions: Array<{ slug: string; name: string }>;
  brandOptions: Array<{ slug: string; name: string }>;
  labels: Labels;
}) {
  const t = useTranslations("products");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Densidade: URL vence; sem param, localStorage aplica no load.
  const [view, setView] = React.useState<"grid" | "list">(resolved.view ?? "grid");
  React.useEffect(() => {
    if (resolved.view) {
      setView(resolved.view);
      return;
    }
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored === "list" || stored === "grid") setView(stored);
    } catch {
      // ignore
    }
  }, [resolved.view]);

  function setParam(changes: Record<string, string | null>, mode: "replace" | "push" = "push") {
    const url = buildUrl(pathname, searchParams as unknown as URLSearchParams, changes);
    router[mode](url, { scroll: false });
  }

  function setViewAndPersist(next: "grid" | "list") {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // ignore
    }
    setParam({ view: next === "grid" ? null : next }, "replace");
  }

  function toggleInList(list: string[], slug: string): string[] {
    return list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
  }

  const sortOptions: Array<{ value: string; label: string }> = [
    { value: "relevance", label: labels.sortRelevance },
    { value: "price-asc", label: labels.sortPriceAsc },
    { value: "price-desc", label: labels.sortPriceDesc }
  ];

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ── Filtros (sidebar) ─────────────────────────────────────────── */}
      <aside
        role="region"
        aria-label={labels.sort}
        className="w-full shrink-0 space-y-5 lg:sticky lg:top-20 lg:w-64 lg:self-start"
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {labels.supplier}
          </p>
          {supplierOptions.map((s) => {
            const checked = resolved.suppliers.includes(s.slug);
            return (
              <label
                key={s.slug}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-muted/60"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setParam({ suppliers: toggleInList(resolved.suppliers, s.slug).join(",") || null })}
                  className="h-4 w-4 accent-emerald-600"
                />
                <span className="flex-1 truncate">{s.name}</span>
              </label>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Marca
          </p>
          <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
            {brandOptions.map((b) => {
              const checked = resolved.brands.includes(b.slug);
              return (
                <label
                  key={b.slug}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setParam({ brands: toggleInList(resolved.brands, b.slug).join(",") || null })}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="flex-1 truncate">{b.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={resolved.inStock}
            onChange={(e) => setParam({ inStock: e.target.checked ? "1" : null })}
            className="h-4 w-4 accent-emerald-600"
          />
          {labels.inStockOnly}
        </label>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Faixa de preço (R$)
          </p>
          <PriceInputs
            minInitial={resolved.priceMin}
            maxInitial={resolved.priceMax}
            onApply={(min, max) =>
              setParam({
                priceMin: min === null ? null : String(min),
                priceMax: max === null ? null : String(max)
              })
            }
            minLabel={labels.min}
            maxLabel={labels.max}
            applyLabel={labels.apply}
          />
        </div>
      </aside>

      {/* ── Toolbar + resultados ──────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-1 rounded-md border border-border p-0.5"
            role="group"
            aria-label={labels.sort}
          >
            {sortOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setParam({ sort: o.value === "relevance" ? null : o.value })}
                aria-pressed={resolved.sort === o.value}
                className={cn(
                  "h-8 rounded px-2.5 text-xs font-medium transition-colors",
                  resolved.sort === o.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div
            className="flex items-center gap-1 rounded-md border border-border p-0.5"
            role="group"
            aria-label={labels.density}
          >
            <button
              type="button"
              onClick={() => setViewAndPersist("grid")}
              aria-pressed={view === "grid"}
              aria-label={labels.gridView}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded transition-colors",
                view === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setViewAndPersist("list")}
              aria-pressed={view === "list"}
              aria-label={labels.listView}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded transition-colors",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {t("noResults")}
          </p>
        ) : (
          <div
            className={
              view === "grid"
                ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                : "flex flex-col gap-3"
            }
            data-results
          >
            {products.map((p) => (
              <article
                key={p.slug}
                className={cn(
                  "rounded-lg border border-border bg-card transition-colors hover:border-emerald-500/40",
                  view === "list" && "flex"
                )}
              >
                <Link
                  href={`/produtos/${p.slug}`}
                  className={cn(
                    "min-w-0 flex-1 p-4",
                    view === "list" && "flex gap-4"
                  )}
                >
                  <div className={cn("min-w-0", view === "list" && "flex-1")}>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium">{p.brand}</span>
                      <span>{p.category}</span>
                    </div>
                    <h3 className="mb-2 line-clamp-2 font-semibold leading-tight">{p.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {p.supplierNames.join(" · ")}
                    </p>
                  </div>
                  <div className={cn("mt-3 shrink-0", view === "list" && "mt-0 self-center")}>
                    <span
                      className={cn(
                        "mb-1 block text-[11px] font-medium",
                        p.stock === "in"
                          ? "text-stock-ok"
                          : p.stock === "out"
                            ? "text-stock-out"
                            : "text-muted-foreground"
                      )}
                    >
                      {p.stock === "in"
                        ? "Em estoque"
                        : p.stock === "out"
                          ? "Esgotado"
                          : "Disponível no fornecedor"}
                    </span>
                    <Price amount={p.priceMinBrl} currency="BRL" className="price-value text-xl font-bold" />
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Inputs min/max com validação local (min≤max; inteiros ≥0). */
function PriceInputs({
  minInitial,
  maxInitial,
  onApply,
  minLabel,
  maxLabel,
  applyLabel
}: {
  minInitial: number | null;
  maxInitial: number | null;
  onApply: (min: number | null, max: number | null) => void;
  minLabel: string;
  maxLabel: string;
  applyLabel: string;
}) {
  const [minStr, setMinStr] = React.useState(minInitial?.toString() ?? "");
  const [maxStr, setMaxStr] = React.useState(maxInitial?.toString() ?? "");

  function apply() {
    const parse = (s: string): number | null =>
      /^\d{1,9}$/.test(s.trim()) ? Number(s.trim()) : null;
    let min = parse(minStr);
    let max = parse(maxStr);
    if (min !== null && max !== null && min > max) {
      // par inválido → ignora ambos
      onApply(null, null);
      return;
    }
    onApply(min, max);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder={minLabel}
          aria-label={`${minLabel} (R$)`}
          value={minStr}
          onChange={(e) => setMinStr(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
        <span className="text-muted-foreground">–</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder={maxLabel}
          aria-label={`${maxLabel} (R$)`}
          value={maxStr}
          onChange={(e) => setMaxStr(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>
      <button
        type="button"
        onClick={apply}
        className="h-9 w-full rounded-md border border-border text-sm font-medium hover:bg-muted"
      >
        {applyLabel}
      </button>
    </div>
  );
}
