/**
 * ShopFinder — Compare page (Sprint 12 recriação).
 *
 * Renders up to 4 products side by side in a matrix where each row is a
 * canonical attribute (union of all selected products' attributes) and each
 * column is a product. Cells show value + source badge + confidence bar.
 *
 * Below the spec matrix, a secondary matrix compares offer-level metadata:
 * best price, price range, supplier count, total stock.
 *
 * State source: `CompareContext` (persisted in localStorage). The URL also
 * carries `?slugs=...` for shareable links — on first load we sync the
 * context from the URL if the URL has slugs the context doesn't.
 *
 * Suspense boundary envolve useSearchParams (Next.js 15+ requirement).
 */
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  X,
  Trash2,
  Search,
  ShieldCheck,
  Factory,
  FileText,
  Store,
  CheckCircle2,
  TrendingUp
} from "lucide-react";
import { CompareTableSkeleton } from "@/components/site/compare-table-skeleton";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCompare, COMPARE_MAX_ITEMS } from "@/contexts/compare-context";
import { MiniSearchBox } from "@/components/site/mini-search-box";

// ── Types ──────────────────────────────────────────────────

interface CompareOffer {
  id: string;
  supplier: { id: string; code: string; name: string };
  price: number;
  currency: string;
  inventory: number;
  inStock: boolean;
  shipsFrom: string;
  fulfillmentDays: number[];
}

interface CompareEnrichedSpec {
  id: string;
  name: string;
  value: string;
  source: string | null;
  sourceName: string | null;
  confidence: number | null;
  evidence: Array<{
    sourceType: string;
    sourceName: string;
    confidence: number;
    extractedValue: string;
    normalizedValue: string;
    url: string;
    retrievedAt: string;
  }>;
}

interface CompareProduct {
  id: string;
  sku: string;
  slug: string;
  title: string;
  description: string;
  brand: string;
  category: string;
  categorySlug: string;
  nicheId: string;
  price: number;
  currency: string;
  priceRange: { min: number; max: number };
  inStock: boolean;
  stockCount: number;
  suppliers: number;
  imageUrl: string | null;
  imageGradient: string;
  imageLabel: string;
  specs: Array<{ name: string; value: string }>;
  mpn: string;
  offers: CompareOffer[];
  enrichedSpecs?: CompareEnrichedSpec[];
  manufacturer?: string | null;
}

// ── Source rendering helpers ───────────────────────────────

function getSourceIcon(sourceType: string | null) {
  switch (sourceType) {
    case "manufacturer":
      return <Factory className="h-3 w-3" />;
    case "datasheet":
      return <FileText className="h-3 w-3" />;
    case "distributor":
    case "marketplace":
      return <Store className="h-3 w-3" />;
    default:
      return <ShieldCheck className="h-3 w-3" />;
  }
}

function getSourceColor(sourceType: string | null): string {
  switch (sourceType) {
    case "manufacturer":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "datasheet":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "distributor":
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30";
    case "marketplace":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    default:
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30";
  }
}

function getConfidenceColor(c: number): string {
  if (c >= 0.95) return "bg-emerald-500";
  if (c >= 0.8) return "bg-blue-500";
  if (c >= 0.6) return "bg-amber-500";
  return "bg-red-500";
}

// ── Unified attribute row builder ──────────────────────────

interface UnifiedRow {
  attrName: string;
  cells: Array<{
    productSlug: string;
    value: string | null;
    source: string | null;
    sourceName: string | null;
    confidence: number | null;
  }>;
}

function buildUnifiedRows(products: CompareProduct[]): UnifiedRow[] {
  const attrOrder: Array<{ key: string; displayName: string }> = [];
  const attrMap = new Map<string, { displayName: string }>();

  for (const p of products) {
    for (const spec of p.specs) {
      const key = spec.name.toLowerCase();
      if (!attrMap.has(key)) {
        attrMap.set(key, { displayName: spec.name });
        attrOrder.push({ key, displayName: spec.name });
      }
    }
  }

  return attrOrder.map(({ key, displayName }) => {
    const cells = products.map((p) => {
      const enriched = (p.enrichedSpecs ?? []).find((es) => es.name.toLowerCase() === key);
      if (enriched) {
        return {
          productSlug: p.slug,
          value: enriched.value,
          source: enriched.source,
          sourceName: enriched.sourceName,
          confidence: enriched.confidence
        };
      }
      const plain = p.specs.find((s) => s.name.toLowerCase() === key);
      return {
        productSlug: p.slug,
        value: plain?.value ?? null,
        source: null,
        sourceName: null,
        confidence: null
      };
    });
    return { attrName: displayName, cells };
  });
}

// ── Page (wrapper with Suspense) ───────────────────────────

export default function ComparePageWrapper() {
  // `useSearchParams` requires a Suspense boundary during SSR/build.
  return (
    <React.Suspense fallback={<CompareTableSkeleton columns={2} />}>
      <ComparePage />
    </React.Suspense>
  );
}

function ComparePage() {
  const t = useTranslations("compare");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, addItem, removeItem, clearAll, isFull } = useCompare();

  // Sync from URL on first load (shareable links): if ?slugs= has slugs not
  // in the context, add them. We only do this once per URL change.
  const urlSlugs = searchParams.get("slugs");
  const syncedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!urlSlugs || syncedRef.current === urlSlugs) return;
    syncedRef.current = urlSlugs;
    const slugs = urlSlugs
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const s of slugs) addItem(s);
  }, [urlSlugs, addItem]);

  // Fetch the products for the current selection.
  const [products, setProducts] = React.useState<CompareProduct[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (items.length === 0) {
      setProducts([]);
      return;
    }
    setLoading(true);
    fetch(`/api/catalog?path=products&slugs=${encodeURIComponent(items.join(","))}&limit=20`)
      .then((r) => r.json())
      .then((d: { products: CompareProduct[] }) => {
        // Preserve the user's selection order (not DB return order).
        const bySlug = new Map<string, CompareProduct>((d.products ?? []).map((p) => [p.slug, p]));
        setProducts(items.map((slug) => bySlug.get(slug)).filter(Boolean) as CompareProduct[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [items]);

  // Keep the URL in sync with the context so the link stays shareable.
  React.useEffect(() => {
    const target = items.length > 0 ? `/compare?slugs=${items.join(",")}` : "/compare";
    if (urlSlugs !== (items.length > 0 ? items.join(",") : null)) {
      window.history.replaceState(null, "", target);
    }
  }, [items, urlSlugs]);

  const unifiedRows = React.useMemo(() => buildUnifiedRows(products), [products]);

  // ── Empty state ─────────────────────────────────────────

  if (items.length === 0 && !loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToCatalog")}
        </Link>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/10 px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Search className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-lg font-semibold">{t("empty")}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("emptyHint")}</p>
          <Link href="/" className="mt-5">
            <Button className="bg-emerald-500 hover:bg-emerald-600">{t("backToCatalog")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[95vw] px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToCatalog")}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {isFull && (
            <Badge
              variant="outline"
              className="border-amber-500/40 text-amber-600 dark:text-amber-400"
            >
              {t("maxReached")}
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearAll} disabled={items.length === 0}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {t("clearAll")}
          </Button>
        </div>
      </div>

      {loading ? (
        <CompareTableSkeleton columns={Math.max(items.length, 1)} />
      ) : (
        <>
          {/* Spec matrix */}
          <Card className="mb-6 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("specsTitle")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("specsHint")}</p>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="sticky left-0 z-10 w-44 min-w-44 bg-muted/20 p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("rowAttribute")}
                    </th>
                    {products.map((p) => (
                      <th key={p.slug} className="min-w-56 p-3 text-left align-top">
                        <div className="space-y-2">
                          <div
                            className="flex h-16 w-full items-center justify-center rounded-md text-xs font-bold text-white/90"
                            style={{ background: p.imageGradient }}
                          >
                            <span className="line-clamp-1 px-2">{p.imageLabel}</span>
                          </div>
                          <div className="space-y-1">
                            <a
                              href={`/produtos/${p.slug}`}
                              className="line-clamp-2 block text-xs font-semibold hover:text-emerald-600 hover:underline"
                            >
                              {p.title}
                            </a>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] text-muted-foreground">{p.brand}</span>
                              <button
                                type="button"
                                onClick={() => removeItem(p.slug)}
                                aria-label={`${t("remove")} ${p.title}`}
                                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-red-500"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </th>
                    ))}
                    {/* Empty "add" column */}
                    {!isFull && (
                      <th className="min-w-56 p-3 align-top">
                        <MiniSearchBox
                          excludedSlugs={products.map((p) => p.slug)}
                          onAdd={addItem}
                        />
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {/* Manufacturer row */}
                  <tr className="border-b border-border/40">
                    <td className="sticky left-0 z-10 bg-background p-3 text-xs font-medium text-muted-foreground">
                      {t("manufacturer")}
                    </td>
                    {products.map((p) => (
                      <td key={p.slug} className="p-3 text-xs">
                        {p.manufacturer ?? "—"}
                      </td>
                    ))}
                    {!isFull && <td className="p-3" />}
                  </tr>
                  {/* Category row */}
                  <tr className="border-b border-border/40">
                    <td className="sticky left-0 z-10 bg-background p-3 text-xs font-medium text-muted-foreground">
                      {t("category")}
                    </td>
                    {products.map((p) => (
                      <td key={p.slug} className="p-3 text-xs">
                        {p.category}
                      </td>
                    ))}
                    {!isFull && <td className="p-3" />}
                  </tr>
                  {/* Rating row — T071: sem dado real de avaliação, exibe "—"
                      (os ratings fabricados foram removidos do payload). */}
                  <tr className="border-b border-border/40">
                    <td className="sticky left-0 z-10 bg-background p-3 text-xs font-medium text-muted-foreground">
                      {t("rating")}
                    </td>
                    {products.map((p) => (
                      <td key={p.slug} className="p-3 text-xs">
                        <span className="text-muted-foreground/50">—</span>
                      </td>
                    ))}
                    {!isFull && <td className="p-3" />}
                  </tr>

                  {/* Unified attribute rows */}
                  {unifiedRows.map((row, idx) => (
                    <tr
                      key={row.attrName}
                      className={
                        idx % 2 === 0
                          ? "border-b border-border/40 bg-muted/5"
                          : "border-b border-border/40"
                      }
                    >
                      <td className="sticky left-0 z-10 bg-background p-3 text-xs font-medium text-muted-foreground">
                        {row.attrName}
                      </td>
                      {row.cells.map((cell) => (
                        <td key={cell.productSlug} className="p-3 align-top">
                          {cell.value ? (
                            <div className="space-y-1.5">
                              <div className="text-xs font-medium">{cell.value}</div>
                              {cell.source && (
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] ${getSourceColor(cell.source)}`}
                                >
                                  {getSourceIcon(cell.source)}
                                  <span className="ml-1">{cell.sourceName ?? cell.source}</span>
                                </Badge>
                              )}
                              {cell.confidence !== null && cell.confidence !== undefined && (
                                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={`h-full rounded-full ${getConfidenceColor(cell.confidence)}`}
                                    style={{
                                      width: `${cell.confidence * 100}%`
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </td>
                      ))}
                      {!isFull && <td className="p-3" />}
                    </tr>
                  ))}

                  {/* Empty-state row when no unified rows */}
                  {unifiedRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={products.length + (isFull ? 1 : 2)}
                        className="p-6 text-center text-xs text-muted-foreground"
                      >
                        {t("specsHint")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Offers comparison */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                {t("offersTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="sticky left-0 z-10 w-44 min-w-44 bg-muted/20 p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("offersTitle")}
                    </th>
                    {products.map((p) => (
                      <th key={p.slug} className="min-w-56 p-3 text-left text-xs font-semibold">
                        {p.brand}
                      </th>
                    ))}
                    {!isFull && <th className="p-3" />}
                  </tr>
                </thead>
                <tbody>
                  {/* Best price */}
                  <tr className="border-b border-border/40">
                    <td className="sticky left-0 z-10 bg-background p-3 text-xs font-medium text-muted-foreground">
                      {t("offersBestPrice")}
                    </td>
                    {products.map((p) => {
                      const best = p.priceRange.min > 0 ? p.priceRange.min : p.price;
                      const isBest =
                        products.length > 1 &&
                        best ===
                          Math.min(
                            ...products.map((q) =>
                              q.priceRange.min > 0 ? q.priceRange.min : q.price
                            )
                          );
                      return (
                        <td key={p.slug} className="p-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-bold ${isBest ? "text-emerald-600 dark:text-emerald-400" : ""}`}
                            >
                              ${best.toFixed(2)}
                            </span>
                            {isBest && (
                              <Badge className="bg-emerald-500/90 text-white text-[9px]">
                                <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
                                {t("offersBestPrice")}
                              </Badge>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    {!isFull && <td className="p-3" />}
                  </tr>
                  {/* Price range */}
                  <tr className="border-b border-border/40 bg-muted/5">
                    <td className="sticky left-0 z-10 bg-background p-3 text-xs font-medium text-muted-foreground">
                      {t("offersRange")}
                    </td>
                    {products.map((p) => (
                      <td key={p.slug} className="p-3 text-xs">
                        {p.priceRange.min > 0
                          ? `$${p.priceRange.min.toFixed(2)} – $${p.priceRange.max.toFixed(2)}`
                          : `$${p.price.toFixed(2)}`}
                      </td>
                    ))}
                    {!isFull && <td className="p-3" />}
                  </tr>
                  {/* Suppliers */}
                  <tr className="border-b border-border/40">
                    <td className="sticky left-0 z-10 bg-background p-3 text-xs font-medium text-muted-foreground">
                      {t("offersSuppliers")}
                    </td>
                    {products.map((p) => (
                      <td key={p.slug} className="p-3 text-xs">
                        {p.suppliers} · {p.offers.length} {t("offersTitle").toLowerCase()}
                      </td>
                    ))}
                    {!isFull && <td className="p-3" />}
                  </tr>
                  {/* Total stock */}
                  <tr className="bg-muted/5">
                    <td className="sticky left-0 z-10 bg-background p-3 text-xs font-medium text-muted-foreground">
                      {t("offersStock")}
                    </td>
                    {products.map((p) => (
                      <td key={p.slug} className="p-3 text-xs">
                        <span
                          className={
                            p.inStock
                              ? "text-emerald-600 dark:text-emerald-400 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {p.stockCount.toLocaleString()} un.
                        </span>
                      </td>
                    ))}
                    {!isFull && <td className="p-3" />}
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Separator className="my-8" />

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {t("backToCatalog")}
            </Button>
            <span>
              {products.length}/{COMPARE_MAX_ITEMS} {t("products")}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
