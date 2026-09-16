/**
 * T107 — Página de resultados com ESTADO EM URL (/produtos).
 *
 * SSR: params validados server-side (sort/view enums; suppliers/brands contra
 * listas conhecidas; priceMin/priceMax inteiros ≥0 com min≤max — par inválido
 * é ignorado, nunca quebra a página). Ordenação por menor preço em BRL
 * (mesma taxa server-side da UI). Controles cliente atualizam a URL via
 * router.replace/pushState — sem reload — e back/forward restaura.
 * Densidade persiste em localStorage quando não há ?view= (URL vence).
 */
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@workspace/database";
import { getServerAuthSession } from "@workspace/auth";
import { getUsdBrlRate } from "@/lib/fx-server";
import { KNOWN_BRANDS, extractBrand } from "@/lib/brand";
import { UtilityHeader, Breadcrumbs } from "@/components/layout/header";
import { ResultsView, type ResultProduct } from "@/components/site/results-view";
import { buildMetadata } from "@workspace/seo/metadata";

const ALLOWED_SORT = ["relevance", "price-asc", "price-desc"] as const;
const ALLOWED_VIEW = ["grid", "list"] as const;
const MAX_Q = 80;
const MAX_ITEMS = 8;
const MAX_ITEM_LEN = 40;
const MAX_PRICE_DIGITS = 9;
const CANDIDATE_LIMIT = 2000;
const RESULT_LIMIT = 60;

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

/** CSV ou repetido → lista sanitizada (limite de itens e de comprimento). */
function csvList(v: string | string[] | undefined): string[] {
  const parts = Array.isArray(v) ? v : v ? [v] : [];
  return parts
    .flatMap((s) => s.split(","))
    .map((s) => s.trim().slice(0, MAX_ITEM_LEN))
    .filter(Boolean)
    .slice(0, MAX_ITEMS);
}

/** Inteiro ≥0 com limite de dígitos; inválido/ausente → null. */
function intParam(v: string | string[] | undefined): number | null {
  const raw = firstValue(v);
  if (raw === undefined || !/^\d{1,9}$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Resultados — ShopFinder",
    description: "Busca com filtros de preço, fornecedor, marca e estoque.",
    path: "/produtos",
    noIndex: true
  });
}

export default async function ProductsResultsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const t = await getTranslations("products");
  const tFilter = await getTranslations("filter");
  const session = await getServerAuthSession();

  // ── Params validados ────────────────────────────────────────────────────
  const q = (firstValue(sp.q) ?? "").trim().slice(0, MAX_Q);

  const sortRaw = firstValue(sp.sort) ?? "relevance";
  const sort = (ALLOWED_SORT as readonly string[]).includes(sortRaw)
    ? (sortRaw as (typeof ALLOWED_SORT)[number])
    : "relevance";

  const viewRaw = firstValue(sp.view);
  const viewParam = (ALLOWED_VIEW as readonly string[]).includes(viewRaw ?? "")
    ? (viewRaw as (typeof ALLOWED_VIEW)[number])
    : null;

  const inStock = firstValue(sp.inStock) === "1";

  const supplierSlugs = csvList(sp.suppliers);
  const brandSlugs = csvList(sp.brands);

  let priceMin = intParam(sp.priceMin);
  let priceMax = intParam(sp.priceMax);
  // Par inválido (min > max) → ignora o par, mantém a página sadia.
  if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
    priceMin = null;
    priceMax = null;
  }

  // ── Dados de referência (validação contra listas conhecidas) ───────────
  const supplierRows = await prisma.productOffer.findMany({
    where: { deletedAt: null },
    select: { supplier: { select: { code: true, name: true } } },
    distinct: ["supplierId"]
  });
  const knownSuppliers = supplierRows
    .map((r) => ({ code: r.supplier.code, name: r.supplier.name, slug: slugify(r.supplier.name) }))
    .filter((s) => s.slug);

  const knownBrands = KNOWN_BRANDS.map((b) => ({ brand: b, slug: slugify(b) }));

  // Params só valem se mapearem para itens reais (senão são ignorados)
  const supplierCodes = knownSuppliers
    .filter((s) => supplierSlugs.includes(s.slug))
    .map((s) => s.code);
  const brandNames = knownBrands
    .filter((b) => brandSlugs.includes(b.slug))
    .map((b) => b.brand);

  // ── Query ───────────────────────────────────────────────────────────────
  const rate = await getUsdBrlRate();

  const products = await prisma.product.findMany({
    where: {
      status: "published",
      deletedAt: null,

      ...(supplierCodes.length
        ? {
            offers: {
              some: { deletedAt: null, supplier: { code: { in: supplierCodes } } }
            }
          }
        : {}),
      ...(inStock
        ? { offers: { some: { deletedAt: null, inventory: { gt: 0 } } } }
        : {})
    },
    include: {
      category: { select: { name: true } },
      offers: {
        where: { deletedAt: null },
        select: {
          supplier: { select: { code: true, name: true } },
          priceMinorUnits: true,
          priceCurrencyCode: true,
          inventory: true
        }
      }
    },
    orderBy: { updatedAt: "desc" },
    take: CANDIDATE_LIMIT
  });

  // ── Filtros textuais em memória (case-insensitive; compatível sqlite/pg) ──
  const ql = q.toLowerCase();

  // ── Preço mínimo em BRL por produto (fonte única da ordenação) ─────────
  let rows: ResultProduct[] = products
    .filter((p) => {
      if (!ql) return true;
      return (
        p.title.toLowerCase().includes(ql) ||
        p.sku.toLowerCase().includes(ql) ||
        extractBrand(p.title).toLowerCase().includes(ql)
      );
    })
    .filter((p) => {
      if (brandNames.length === 0) return true;
      const b = extractBrand(p.title);
      return brandNames.some((n) => n.toLowerCase() === b.toLowerCase());
    })
    .map((p) => {
    const minOffer =
      p.offers.length > 0
        ? p.offers.reduce(
            (min, o) => (o.priceMinorUnits < min ? o.priceMinorUnits : min),
            p.offers[0].priceMinorUnits
          )
        : null;
    const baseMinor = minOffer ?? 0n;
    const priceMinBrl = (Number(baseMinor) * rate) / 100;
    const supplierNames = [...new Set(p.offers.map((o) => o.supplier.name))];
    const allEbay = p.offers.length > 0 && p.offers.every((o) => o.supplier.code === "ebay");
    const inStockNow = p.offers.some((o) => o.inventory > 0);
    return {
      slug: p.slug,
      title: p.title,
      brand: extractBrand(p.title),
      category: p.category?.name ?? "",
      priceMinBrl,
      inStock: inStockNow,
      stock: inStockNow ? "in" : allEbay ? "supplier" : "out",
      supplierNames
    } satisfies ResultProduct;
  });

  // Faixa de preço em BRL (inteiro); par inválido já foi descartado acima.
  if (priceMin !== null) rows = rows.filter((r) => r.priceMinBrl >= priceMin);
  if (priceMax !== null) rows = rows.filter((r) => r.priceMinBrl <= priceMax);

  if (sort === "price-asc") rows.sort((a, b) => a.priceMinBrl - b.priceMinBrl);
  else if (sort === "price-desc") rows.sort((a, b) => b.priceMinBrl - a.priceMinBrl);

  const total = rows.length;
  rows = rows.slice(0, RESULT_LIMIT);

  return (
    <>
      <UtilityHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: t("backToCatalog"), href: "/" }, { label: t("titleResults", { query: q || "…" }) }]} />

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            {q ? t("titleResults", { query: q }) : t("titleFeatured")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {t("resultsCount", { count: total })}
          </p>
        </div>

        <ResultsView
          products={rows}
          resolved={{ sort, view: viewParam, suppliers: supplierSlugs, brands: brandSlugs, priceMin, priceMax, inStock, q }}
          supplierOptions={knownSuppliers.map((s) => ({ slug: s.slug, name: s.name }))}
          brandOptions={knownBrands.map((b) => ({ slug: b.slug, name: b.brand }))}
          labels={{
            sort: tFilter("sort"),
            sortRelevance: tFilter("sortRelevance"),
            sortPriceAsc: tFilter("sortPriceAsc"),
            sortPriceDesc: tFilter("sortPriceDesc"),
            density: tFilter("density"),
            gridView: tFilter("gridView"),
            listView: tFilter("listView"),
            supplier: tFilter("supplier"),
            inStockOnly: tFilter("inStockOnly"),
            min: tFilter("min"),
            max: tFilter("max"),
            apply: tFilter("apply")
          }}
        />
      </div>
    </>
  );
}
