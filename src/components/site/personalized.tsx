"use client";

/**
 * NOVA_DIRECAO A1/A2 — Faixas de personalização da home (client, cookieless):
 *  - "Vistos recentemente": histórico local de views (A2);
 *  - "Recomendados para você": nicho mais visto do histórico cruzado com o
 *    catálogo (A1); sem histórico → renderiza nada (sem invenção).
 * Grava o view do produto quando `record` recebe um item (montado pelo detalhe).
 */
import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";
import { readViews, recordView, type HistoryItem } from "@/lib/history";

interface CatalogProduct {
  id: string;
  slug: string;
  title: string;
  category?: string | null;
  niche?: string | null;
}

export function recordProductView(item: Omit<HistoryItem, "ts">) {
  recordView(item);
}

function ProductStrip({
  title,
  icon,
  items
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ slug: string; title: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
        {icon}
        {title}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.slice(0, 5).map((item) => (
          <li key={item.slug}>
            <Link
              href={`/produtos/${item.slug}`}
              className="block h-full rounded-lg border border-border/40 p-3 text-sm transition-colors hover:border-emerald-500/40"
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PersonalizedSections() {
  const t = useTranslations("personalized");
  const [views, setViews] = React.useState<HistoryItem[]>([]);
  const [recommended, setRecommended] = React.useState<HistoryItem[]>([]);

  React.useEffect(() => {
    const local = readViews();
    if (local.length === 0) return;
    setViews(local);

    // A1 — nicho mais visto do histórico (sem identificador, tudo local)
    const nicheCount = new Map<string, number>();
    for (const v of local) {
      if (v.niche) nicheCount.set(v.niche, (nicheCount.get(v.niche) ?? 0) + 1);
    }
    const topNiche = [...nicheCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!topNiche) return;

    fetch(`/api/catalog?path=products&limit=100`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { products?: CatalogProduct[] } | null) => {
        const products = data?.products ?? [];
        const seen = new Set(local.map((v) => v.slug));
        const inNiche = products.filter(
          (p) =>
            !seen.has(p.slug) &&
            ((p.category ?? "").toLowerCase().includes(topNiche) ||
              (p.niche ?? "").toLowerCase().includes(topNiche))
        );
        setRecommended(
          inNiche.slice(0, 5).map((p) => ({ slug: p.slug, title: p.title, niche: topNiche, ts: Date.now() }))
        );
      })
      .catch(() => {
        // recomendação é best-effort
      });
  }, []);

  if (views.length === 0 && recommended.length === 0) return null;

  return (
    <>
      <ProductStrip title={t("recentlyViewed")} icon={<Clock className="h-4 w-4" aria-hidden />} items={views} />
      <ProductStrip
        title={t("recommended")}
        icon={<Sparkles className="h-4 w-4" aria-hidden />}
        items={recommended}
      />
    </>
  );
}
