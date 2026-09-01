"use client";

import * as React from "react";
import {
  Search,
  Cpu,
  Monitor,
  HardDrive,
  MemoryStick,
  Zap,
  Box,
  ShoppingCart,
  Star,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CircuitBoard,
  Smartphone,
  Headphones,
  Watch,
  Home
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { ModeToggle } from "@/components/site/mode-toggle";
import { LanguageSelector } from "@/components/site/language-selector";
import { HeaderCompareLink } from "@/components/site/header-compare-link";
import { CompareButton } from "@/components/site/compare-button";
import { Price, PriceRange } from "@/components/site/price";
import { ProductImage } from "@/components/site/product-image";
import { UserMenu } from "@/components/site/user-menu";
import { supplierDisplayName } from "@/lib/spec-labels";
import { useCart } from "@/context/cart-context";
import { PROJECT_META } from "@/components/site/data";
import { useProductSearch, EMPTY_FILTER, type ProductFilter } from "@/hooks/use-product-search";
import { FilterBar } from "@/components/site/filter-bar";
import { FadeIn, FadeInStagger, FadeInItem } from "@/components/motion/fade-in";
import {
  NicheGridSkeleton,
  CategoryGridSkeleton,
  TierGridSkeleton,
  LandingProductGridSkeleton
} from "@/components/site/landing-skeletons";
import { Hero3DMount } from "@/components/site/hero-3d-mount";
import { useTranslations } from "next-intl";

// ── Types matching the API response ────────────────────────

interface ApiNiche {
  id: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
  productCount: number;
  supplierCount: number;
  topBrands: string[];
  popularSearches: string[];
}

interface ApiCategory {
  id: string;
  slug: string;
  name: string;
  nicheId: string;
  productCount: number;
}

export interface ApiProduct {
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
  rating: number;
  reviewCount: number;
  imageGradient: string;
  imageLabel: string;
  specs: Array<{ name: string; value: string }>;
  mpn: string;
  offers: Array<{
    id: string;
    supplier: { id: string; code: string; name: string };
    price: number;
    currency: string;
    inventory: number;
    inStock: boolean;
    shipsFrom: string;
    fulfillmentDays: number[];
  }>;
}

const SEARCH_SUGGESTIONS = [
  "Intel i9",
  "STM32",
  "RTX 4090",
  "iPhone 15",
  "SSD NVMe",
  "AirPods Pro"
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  cpu: <Cpu className="h-6 w-6" />,
  gpu: <Monitor className="h-6 w-6" />,
  motherboard: <Cpu className="h-6 w-6" />,
  ssd: <HardDrive className="h-6 w-6" />,
  ram: <MemoryStick className="h-6 w-6" />,
  psu: <Zap className="h-6 w-6" />,
  case: <Box className="h-6 w-6" />,
  monitor: <Monitor className="h-6 w-6" />,
  chip: <CircuitBoard className="h-6 w-6" />,
  smartphone: <Smartphone className="h-6 w-6" />,
  audio: <Headphones className="h-6 w-6" />,
  watch: <Watch className="h-6 w-6" />,
  home: <Home className="h-6 w-6" />
};

const NICHE_ICONS: Record<string, React.ReactNode> = {
  cpu: <Cpu className="h-7 w-7" />,
  chip: <CircuitBoard className="h-7 w-7" />,
  smartphone: <Smartphone className="h-7 w-7" />
};

// ── API hooks ──────────────────────────────────────────────

function useFetch<T>(url: string): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}

// ── Header ─────────────────────────────────────────────────

function CartButton() {
  const { itemCount, openCart } = useCart();
  const t = useTranslations("cart");
  return (
    <Button
      variant="ghost"
      size="sm"
      className="hidden sm:inline-flex relative"
      onClick={openCart}
      aria-label={t("title")}
    >
      <ShoppingCart className="mr-1.5 h-4 w-4" />
      {t("title")}
      {itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
          {itemCount}
        </span>
      )}
    </Button>
  );
}

function SiteHeader() {
  const t = useTranslations("nav");
  const tHero = useTranslations("hero");
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <img
            src="/icon.svg"
            alt="ShopFinder"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg"
          />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight">{PROJECT_META.name}</span>
            <span className="text-[10px] tracking-widest text-muted-foreground">
              {tHero("tagline")}
            </span>
          </div>
        </div>
        <nav className="hidden items-center gap-6 md:flex">
          <a
            href="#nichos"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("niches")}
          </a>
          <a
            href="#categorias"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("categories")}
          </a>
          <a
            href="#fabricantes"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("manufacturers")}
          </a>
          <a
            href="#produtos"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("products")}
          </a>
          <a
            href="#confianca"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("howItWorks")}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <HeaderCompareLink />
          <CartButton />
          <UserMenu />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}

// ── Hero with real search ──────────────────────────────────

function Hero({ onSearch }: { onSearch: (q: string) => void }) {
  const t = useTranslations("hero");
  const [query, setQuery] = React.useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
    // Scroll to products section
    document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative isolate overflow-hidden border-b border-border/60">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(60rem 30rem at 80% -10%, rgba(16,185,129,0.15), transparent 60%), radial-gradient(40rem 20rem at 0% 100%, rgba(16,185,129,0.08), transparent 60%)"
        }}
      />
      {/* Hero 3D (R3F) — lazy, gated por visibilidade + reduced-motion (#32).
          O gradiente acima permanece como fallback/base estática. */}
      <Hero3DMount />
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
        <FadeInStagger className="flex flex-col items-center text-center gap-8" itemCount={4}>
          <FadeInItem className="flex flex-col items-center gap-3">
            <h1 className="text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
              {PROJECT_META.name}
            </h1>
            <p className="text-lg font-medium text-emerald-500 tracking-wide">{t("tagline")}</p>
          </FadeInItem>

          <FadeInItem>
            <p className="max-w-2xl text-xl text-muted-foreground sm:text-2xl">{t("subtitle")}</p>
          </FadeInItem>

          {/* Search bar — queries the real API */}
          <FadeInItem className="w-full max-w-2xl">
            <form onSubmit={handleSearch} className="w-full" role="search">
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  aria-label={t("searchPlaceholder")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-14 rounded-2xl border-2 pl-12 pr-32 text-base shadow-lg focus-visible:ring-emerald-500"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-emerald-500 hover:bg-emerald-600"
                  aria-label={t("searchButton")}
                >
                  <Search className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  {t("searchButton")}
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-muted-foreground">{t("popular")}</span>
                {SEARCH_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setQuery(s);
                      onSearch(s);
                      document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </form>
          </FadeInItem>

          <FadeInItem className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              {t("statProducts")}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              {t("statNiches")}
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              {t("statAi")}
            </span>
          </FadeInItem>
        </FadeInStagger>
      </div>
    </section>
  );
}

// ── Niches section (from API) ──────────────────────────────

function NichesSection() {
  const t = useTranslations("niches");
  const { data, loading } = useFetch<{ niches: ApiNiche[] }>("/api/catalog?path=niches");

  return (
    <section id="nichos" className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        {loading ? (
          <NicheGridSkeleton />
        ) : (
          <FadeInStagger
            className="grid grid-cols-1 gap-5 md:grid-cols-3"
            itemCount={data?.niches.length}
          >
            {(data?.niches ?? []).map((niche) => (
              <FadeInItem key={niche.id}>
                <a
                  href="#produtos"
                  className="group relative block h-full overflow-hidden rounded-2xl border border-border/60 p-6 transition-all hover:border-emerald-500/40 hover:shadow-xl"
                >
                  <div
                    className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl text-white"
                    style={{ background: niche.gradient }}
                  >
                    {NICHE_ICONS[niche.icon]}
                  </div>

                  <h3 className="mb-1 text-lg font-bold">{niche.name}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">{niche.description}</p>

                  <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      {t("productCount", { count: niche.productCount.toLocaleString() })}
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      {t("supplierCount", { count: niche.supplierCount })}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {niche.topBrands.slice(0, 4).map((brand) => (
                      <Badge key={brand} variant="secondary" className="text-[10px]">
                        {brand}
                      </Badge>
                    ))}
                    {niche.topBrands.length > 4 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{niche.topBrands.length - 4}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border/40 pt-4">
                    {niche.popularSearches.map((search) => (
                      <span
                        key={search}
                        className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {search}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {t("explore")}
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </a>
              </FadeInItem>
            ))}
          </FadeInStagger>
        )}
      </div>
    </section>
  );
}

// ── Categories (from API, filtered by niche) ───────────────

function CategoriesSection() {
  const t = useTranslations("categories");
  const { data, loading } = useFetch<{ categories: ApiCategory[] }>("/api/catalog?path=categories");
  const [activeNiche, setActiveNiche] = React.useState<string>("all");

  const categories = data?.categories ?? [];
  const filtered =
    activeNiche === "all" ? categories : categories.filter((c) => c.nicheId === activeNiche);

  const nicheTabs = [
    { id: "all", name: t("tabs.all") },
    { id: "pc-hardware", name: t("tabs.pcHardware") },
    { id: "electronic-components", name: t("tabs.components") },
    { id: "consumer-electronics", name: t("tabs.consumer") }
  ];

  return (
    <section id="categorias" className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {nicheTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveNiche(tab.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeNiche === tab.id
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <CategoryGridSkeleton />
        ) : (
          <FadeInStagger
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            itemCount={filtered.length}
          >
            {filtered.map((cat) => (
              <FadeInItem key={cat.id}>
                <a
                  href="#produtos"
                  className="group block h-full rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-emerald-500/40 hover:shadow-lg"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
                    {CATEGORY_ICONS[cat.slug] ?? <CircuitBoard className="h-6 w-6" />}
                  </div>
                  <h3 className="font-semibold">{cat.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("productCount", { count: cat.productCount.toLocaleString() })}
                  </p>
                </a>
              </FadeInItem>
            ))}
          </FadeInStagger>
        )}
      </div>
    </section>
  );
}

// ── Manufacturers (rich model from API) ────────────────────

interface ApiManufacturer {
  code: string;
  name: string;
  officialName: string;
  country: string;
  countryName: string;
  status: string;
  authorityScore: number;
  coverageScore: number;
  tier: string;
  segments: string[];
  segmentLabels: string[];
  aliases: string[];
  brands: string[];
  officialWebsite: string | null;
  certifications: string[];
}

interface ApiCoverage {
  segment: string;
  label: string;
  count: number;
}

interface ApiCountryCoverage {
  country: string;
  name: string;
  count: number;
}

function ManufacturersSection() {
  const t = useTranslations("manufacturers");
  const { data, loading } = useFetch<{
    manufacturers: ApiManufacturer[];
    tiers: Array<{
      tier: string;
      label: string;
      authorityRange: string;
      manufacturers: ApiManufacturer[];
    }>;
    totalManufacturers: number;
    segmentCoverage: ApiCoverage[];
    countryCoverage: ApiCountryCoverage[];
  }>("/api/catalog?path=manufacturers");

  const manufacturers = data?.manufacturers ?? [];
  const tiers = data?.tiers ?? [];

  const tierColorClasses: Record<string, string> = {
    A: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    B: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    C: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
    D: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
  };

  const countryFlag: Record<string, string> = {
    "United States": "🇺🇸",
    China: "🇨🇳",
    Taiwan: "🇹🇼",
    Japan: "🇯🇵",
    "South Korea": "🇰🇷",
    Germany: "🇩🇪",
    Netherlands: "🇳🇱",
    Other: "🌍"
  };

  return (
    <section id="fabricantes" className="border-b border-border/60 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {data ? t("title", { count: data.totalManufacturers }) : t("titleLoading")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Country coverage bar */}
        {data && (
          <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
            {data.countryCoverage
              .sort((a, b) => b.count - a.count)
              .map((c) => (
                <div
                  key={c.country}
                  className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5"
                >
                  <span>{countryFlag[c.name] ?? "🌍"}</span>
                  <span className="text-xs font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.count}</span>
                </div>
              ))}
          </div>
        )}

        {/* Segment coverage */}
        {data && (
          <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {data.segmentCoverage
              .sort((a, b) => b.count - a.count)
              .map((s) => (
                <div
                  key={s.segment}
                  className="rounded-lg border border-border/40 bg-card p-3 text-center"
                >
                  <div className="text-lg font-bold text-emerald-500">{s.count}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
          </div>
        )}

        {loading ? (
          <TierGridSkeleton />
        ) : (
          <FadeInStagger
            className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4"
            itemCount={tiers.length}
          >
            {tiers.map((tier) => (
              <FadeInItem key={tier.tier} className="h-full">
                <div className="h-full rounded-2xl border border-border/60 bg-card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg font-black ${tierColorClasses[tier.tier] ?? tierColorClasses.D}`}
                    >
                      {tier.tier}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("authorityLabel", { range: tier.authorityRange })}
                    </span>
                  </div>

                  <h3 className="mb-1 font-bold text-sm">{tier.label}</h3>
                  <div className="mb-3 text-xs text-muted-foreground">
                    {t("manufacturersCount", { count: tier.manufacturers.length })}
                  </div>

                  <div className="space-y-2">
                    {tier.manufacturers.slice(0, 8).map((m) => (
                      <div key={m.code} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span>{countryFlag[m.countryName] ?? "🌍"}</span>
                          <span className="font-medium">{m.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span className="text-emerald-500 font-medium">{m.authorityScore}</span>
                          <span>/</span>
                          <span className="text-blue-500 font-medium">{m.coverageScore}</span>
                        </div>
                      </div>
                    ))}
                    {tier.manufacturers.length > 8 && (
                      <div className="text-center text-xs text-muted-foreground pt-1">
                        {t("more", { count: tier.manufacturers.length - 8 })}
                      </div>
                    )}
                  </div>
                </div>
              </FadeInItem>
            ))}
          </FadeInStagger>
        )}
      </div>
    </section>
  );
}

// ── Products (from API + MiniSearch ontology-enhanced search) ──

function ProductsSection({
  searchQuery,
  nicheFilter,
  onNicheChange,
  filters,
  onFiltersChange
}: {
  searchQuery: string | null;
  nicheFilter: string | null;
  onNicheChange: (niche: string | null) => void;
  filters: ProductFilter;
  onFiltersChange: (f: ProductFilter) => void;
}) {
  const t = useTranslations("products");
  const tFilter = useTranslations("filter");
  // Fetch ALL products once (no server-side filtering — MiniSearch handles it)
  const { data, loading } = useFetch<{ products: ApiProduct[]; total: number }>(
    `/api/catalog?path=products&limit=100`
  );

  const allProducts = data?.products ?? [];

  // Use MiniSearch with ontology-aware term resolution + parametric filters
  const { results: searchResults, indexed } = useProductSearch(
    allProducts,
    searchQuery ?? "",
    nicheFilter,
    filters
  );

  const products = searchResults;
  const nicheTabs = [
    { id: null, name: t("tabs.all") },
    { id: "pc-hardware", name: t("tabs.pcHardware") },
    { id: "electronic-components", name: t("tabs.components") },
    { id: "consumer-electronics", name: t("tabs.consumer") }
  ];

  // Labels para o FilterBar (vindos do i18n 'filter' namespace)
  const filterLabels = {
    title: tFilter("title"),
    active: tFilter("active"),
    manufacturer: tFilter("manufacturer"),
    price: tFilter("price"),
    min: tFilter("min"),
    max: tFilter("max"),
    priceHint: tFilter("priceHint"),
    specs: tFilter("specs"),
    valuePlaceholder: tFilter("valuePlaceholder"),
    addAttribute: tFilter("addAttribute"),
    removeAttribute: tFilter("removeAttribute"),
    clear: tFilter("clear"),
    showAll: tFilter("showAll"),
    showLess: tFilter("showLess"),
    apply: tFilter("apply")
  };

  return (
    <section id="produtos" className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {searchQuery ? t("titleResults", { query: searchQuery }) : t("titleFeatured")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
              {loading
                ? t("loading")
                : !indexed
                  ? t("indexing")
                  : t("resultsCount", { count: products.length })}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {nicheTabs.map((tab) => (
              <button
                key={tab.id ?? "all"}
                onClick={() => onNicheChange(tab.id)}
                aria-pressed={nicheFilter === tab.id}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  nicheFilter === tab.id
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile filter trigger sits inline with the section; the desktop
            sidebar is rendered as part of the products grid below. */}
        <div className="flex flex-col gap-6 lg:flex-row">
          <FilterBar
            products={allProducts}
            filters={filters}
            onChange={onFiltersChange}
            labels={filterLabels}
          />

          <div className="flex-1 min-w-0">
            {loading ? (
              <LandingProductGridSkeleton count={6} />
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-lg font-medium text-muted-foreground">{t("noResults")}</p>
                <p className="text-sm text-muted-foreground">{t("noResultsHint")}</p>
              </div>
            ) : (
              /* Entrada em bloco: grid pode ter dezenas de itens e o
                 stagger completo violaria o total < 400ms (regra 1/3). */
              <FadeIn>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <a key={product.id} href={`/produtos/${product.slug}`} className="block">
                      <Card className="group overflow-hidden transition-all hover:shadow-xl hover:border-emerald-500/40">
                        <div className="relative flex h-40 items-center justify-center">
                          <ProductImage
                            query={
                              product.title.toLowerCase().startsWith(product.brand.toLowerCase())
                                ? product.title
                                : `${product.brand} ${product.title}`.trim()
                            }
                            gradient={product.imageGradient}
                            label={product.imageLabel}
                            className="absolute inset-0"
                          />
                          {product.inStock ? (
                            <Badge className="absolute right-3 top-3 bg-emerald-500/90 text-white">
                              {t("inStock")}
                            </Badge>
                          ) : (
                            <Badge className="absolute right-3 top-3 bg-amber-500/90 text-white">
                              {t("outOfStock")}
                            </Badge>
                          )}
                          <div
                            className={`absolute left-3 top-3 h-2 w-2 rounded-full ${
                              product.nicheId === "pc-hardware"
                                ? "bg-emerald-400"
                                : product.nicheId === "electronic-components"
                                  ? "bg-blue-400"
                                  : "bg-violet-400"
                            }`}
                          />
                        </div>

                        <CardContent className="p-4">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              {product.brand}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {product.category}
                            </span>
                          </div>
                          <h3 className="mb-2 line-clamp-2 font-semibold leading-tight">
                            {product.title}
                          </h3>

                          <div className="mb-3 flex flex-wrap gap-1">
                            {product.specs.slice(0, 3).map((spec) => (
                              <Badge
                                key={spec.name}
                                variant="outline"
                                className="text-[10px] font-normal"
                              >
                                {spec.value}
                              </Badge>
                            ))}
                          </div>

                          <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-medium text-foreground">{product.rating}</span>
                            <span>({product.reviewCount.toLocaleString()})</span>
                            <span className="mx-1">·</span>
                            <span>{t("suppliers", { count: product.suppliers })}</span>
                          </div>

                          <div className="flex items-end justify-between">
                            <div>
                              <span className="block text-[10px] text-muted-foreground">
                                {t("from")}
                              </span>
                              <Price amount={product.priceRange.min} currency={product.currency} />
                              <PriceRange
                                min={product.priceRange.min}
                                max={product.priceRange.max}
                                currency={product.currency}
                              />
                            </div>
                            <CompareButton
                              slug={product.slug}
                              size="sm"
                              variant="default"
                              className="bg-emerald-500 hover:bg-emerald-600"
                            />
                          </div>

                          {/* Offers detail */}
                          {product.offers.length > 0 && (
                            <div className="mt-3 border-t border-border/40 pt-3">
                              <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                                Ofertas de {product.offers.length} fornecedores:
                              </p>
                              <div className="space-y-1">
                                {product.offers.slice(0, 3).map((offer) => (
                                  <div
                                    key={offer.id}
                                    className="flex items-center justify-between text-[10px]"
                                  >
                                    <span className="text-muted-foreground">
                                      {supplierDisplayName(offer.supplier.code)}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <Price
                                        amount={offer.price}
                                        currency={offer.currency}
                                        variant="small"
                                      />
                                      <span
                                        className={
                                          offer.inStock
                                            ? "text-emerald-500"
                                            : "text-muted-foreground"
                                        }
                                      >
                                        {offer.inStock ? `${offer.inventory} un.` : "sem estoque"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              </FadeIn>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── FAQ section (FAQPage JSON-LD é emitido no page.tsx) ────

interface FaqItem {
  q: string;
  a: string;
}

function FaqSection() {
  const t = useTranslations("faq");
  const items = t.raw("items") as FaqItem[];

  return (
    <section id="faq" className="border-b border-border/60">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <FadeIn>
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-semibold sm:text-base">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Trust section ──────────────────────────────────────────

function TrustSection() {
  const t = useTranslations("trust");
  // T063 — apenas claims verificáveis: 7 fornecedores (contagem no catálogo);
  // validação descrita sem número absoluto (pipeline ainda não quantificável).
  const stats = [
    { label: t("statConnectors"), value: "7" },
    { label: t("statPipeline"), value: t("statPipelineValue") }
  ];

  return (
    <section id="confianca" className="bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center gap-8">
          <div className="flex flex-col items-center gap-3">
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              {t("badge")}
            </Badge>
            <h2 className="max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
              {t("title")}
            </h2>
            <p className="max-w-2xl text-muted-foreground">{t("description")}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-10">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1">
                <span className="text-3xl font-black text-emerald-500">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <span>{t("sources")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Landing ────────────────────────────────────────────────

export function Landing() {
  const [searchQuery, setSearchQuery] = React.useState<string | null>(null);
  const [nicheFilter, setNicheFilter] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<ProductFilter>(EMPTY_FILTER);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero onSearch={setSearchQuery} />
        <NichesSection />
        <CategoriesSection />
        <ManufacturersSection />
        <ProductsSection
          searchQuery={searchQuery}
          nicheFilter={nicheFilter}
          onNicheChange={setNicheFilter}
          filters={filters}
          onFiltersChange={setFilters}
        />
        <FaqSection />
        <TrustSection />
      </main>
    </>
  );
}
