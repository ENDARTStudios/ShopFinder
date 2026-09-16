"use client";

/**
 * T104 — barra sticky de comparação (fluxo, não destino).
 *
 * Lê o localStorage `shopfinder:compare` (via useCompare + espelho para
 * cross-tab via storage/custom event), aparece com ≥1 item validado contra o
 * catálogo (`/api/catalog?path=products&slugs=…` — slug desconhecido é
 * ignorado), thumbnails (max 3) + "+N", remover por item, "Comparar (n)" e
 * "Limpar tudo" com confirmação. Some com 0 itens; spacer compensa o footer.
 */
import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useCompare } from "@/contexts/compare-context";

const STORAGE_KEY = "shopfinder:compare";
const CHANGE_EVENT = "shopfinder:compare-change";
const MAX_THUMBS = 3;

interface CatalogMeta {
  slug: string;
  title: string;
  price: number;
}

function readEnvelopeSlugs(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { version?: number; items?: unknown } | unknown[];
    const items = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown }).items)
        ? ((parsed as { items: unknown[] }).items)
        : [];
    return items.filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

export function CompareBar() {
  const t = useTranslations("compare");
  const tBar = useTranslations("compareBar");
  const { items, removeItem, clearAll, isFull, compareUrl } = useCompare();

  // Espelho: storage event (outra aba) + custom event (mesma aba)
  const [mirror, setMirror] = React.useState<string[] | null>(null);
  const [meta, setMeta] = React.useState<Map<string, CatalogMeta>>(new Map());
  const [liveMsg, setLiveMsg] = React.useState("");

  React.useEffect(() => {
    const sync = () => setMirror(readEnvelopeSlugs());
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const slugs = mirror ?? items;

  // Validação contra o catálogo + metadados (título/price)
  React.useEffect(() => {
    if (slugs.length === 0) {
      setMeta(new Map());
      return;
    }
    const controller = new AbortController();
    fetch(`/api/catalog?path=products&slugs=${encodeURIComponent(slugs.join(","))}`, {
      signal: controller.signal
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { products?: CatalogMeta[] } | null) => {
        if (!data?.products) return;
        const map = new Map<string, CatalogMeta>();
        for (const p of data.products) {
          map.set(p.slug, p);
        }
        setMeta(map);
      })
      .catch(() => {
        // best-effort
      });
    return () => controller.abort();
  }, [slugs]);

  const known = slugs.filter((s) => meta.has(s));

  // aria-live: anuncia mudanças de contagem
  const prevCount = React.useRef(known.length);
  React.useEffect(() => {
    if (known.length !== prevCount.current) {
      setLiveMsg(tBar("liveCount", { count: known.length }));
      prevCount.current = known.length;
    }
  }, [known.length, t]);

  if (known.length === 0) return null;

  const thumbs = known.slice(0, MAX_THUMBS);
  const extra = known.length - thumbs.length;

  function removeSlug(slug: string) {
    setMirror((prev) => (prev ? prev.filter((s) => s !== slug) : prev));
    removeItem(slug);
  }

  function clearEverything() {
    if (window.confirm(t("confirmClear"))) clearAll();
  }

  return (
    <>
      {/* Spacer para não cobrir o footer */}
      <div aria-hidden className="h-[72px]" />
      <div
        role="region"
        aria-label={tBar("label")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
      >
        <div
          aria-live="polite"
          className="sr-only"
        >
          {liveMsg}
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {thumbs.map((slug) => {
              const m = meta.get(slug);
              return (
                <li
                  key={slug}
                  className="flex max-w-[240px] items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2 py-1"
                >
                  <Link
                    href={`/produtos/${slug}`}
                    className="min-w-0 truncate text-xs font-medium hover:underline"
                    title={m?.title ?? slug}
                  >
                    {m?.title ?? slug}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeSlug(slug)}
                    aria-label={`${t("remove")}: ${m?.title ?? slug}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              );
            })}
            {extra > 0 && (
              <li className="rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground">
                +{extra}
              </li>
            )}
          </ul>

          {isFull && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {t("maxReached")}
            </span>
          )}

          <Link
            href={`/compare?slugs=${known.join(",")}`}
            className="inline-flex h-11 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {tBar("compare", { count: known.length })}
          </Link>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t("confirmClear"))) clearAll();
            }}
            className="inline-flex h-11 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
          >
            {t("clearAll")}
          </button>
        </div>
      </div>
    </>
  );
}
