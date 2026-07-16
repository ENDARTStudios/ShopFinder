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
  Home,
  Loader2
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/site/mode-toggle";
import { PROJECT_META } from "@/components/site/data";
import { useProductSearch } from "@/hooks/use-product-search";

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

interface ApiProduct {
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

function SiteHeader() {
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
              {PROJECT_META.tagline}
            </span>
          </div>
        </div>
        <nav className="hidden items-center gap-6 md:flex">
          <a
            href="#nichos"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Nichos
          </a>
          <a
            href="#categorias"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Categorias
          </a>
          <a
            href="#fabricantes"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Fabricantes
          </a>
          <a
            href="#produtos"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Produtos
          </a>
          <a
            href="#confianca"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Como funciona
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
            <ShoppingCart className="mr-1.5 h-4 w-4" />
            Entrar
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}

// ── Hero with real search ──────────────────────────────────

function Hero({ onSearch }: { onSearch: (q: string) => void }) {
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
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
        <div className="flex flex-col items-center text-center gap-8">
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
              {PROJECT_META.name}
            </h1>
            <p className="text-lg font-medium text-emerald-500 tracking-wide">
              {PROJECT_META.tagline}
            </p>
          </div>

          <p className="max-w-2xl text-xl text-muted-foreground sm:text-2xl">
            Encontre qualquer produto entre milhares de fornecedores. Do componente eletrônico ao
            smartphone — compare preços, specs e estoque em tempo real.
          </p>

          {/* Search bar — queries the real API */}
          <form onSubmit={handleSearch} className="w-full max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Pesquisar produtos, MPN, marcas..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-14 rounded-2xl border-2 pl-12 pr-32 text-base shadow-lg focus-visible:ring-emerald-500"
              />
              <Button
                type="submit"
                size="lg"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-emerald-500 hover:bg-emerald-600"
              >
                <Search className="mr-1.5 h-4 w-4" />
                Buscar
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-muted-foreground">Populares:</span>
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

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              36.000+ produtos
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />3 nichos · 7 fornecedores
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              Powered by AI
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Niches section (from API) ──────────────────────────────

function NichesSection() {
  const { data, loading } = useFetch<{ niches: ApiNiche[] }>("/api/catalog?path=niches");

  return (
    <section id="nichos" className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Escolha seu nicho</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O ShopFinder cobre 3 grandes áreas de produtos com fontes especializadas
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {(data?.niches ?? []).map((niche) => (
              <a
                key={niche.id}
                href="#produtos"
                className="group relative overflow-hidden rounded-2xl border border-border/60 p-6 transition-all hover:border-emerald-500/40 hover:shadow-xl"
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
                    {niche.productCount.toLocaleString()} produtos
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    {niche.supplierCount} fornecedores
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
                  Explorar nicho
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Categories (from API, filtered by niche) ───────────────

function CategoriesSection() {
  const { data, loading } = useFetch<{ categories: ApiCategory[] }>("/api/catalog?path=categories");
  const [activeNiche, setActiveNiche] = React.useState<string>("all");

  const categories = data?.categories ?? [];
  const filtered =
    activeNiche === "all" ? categories : categories.filter((c) => c.nicheId === activeNiche);

  const nicheTabs = [
    { id: "all", name: "Todos" },
    { id: "pc-hardware", name: "PC Hardware" },
    { id: "electronic-components", name: "Componentes" },
    { id: "consumer-electronics", name: "Consumo" }
  ];

  return (
    <section id="categorias" className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Categorias</h2>
            <p className="mt-1 text-sm text-muted-foreground">Navegue por tipo de produto</p>
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
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((cat) => (
              <a
                key={cat.id}
                href="#produtos"
                className="group rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-emerald-500/40 hover:shadow-lg"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
                  {CATEGORY_ICONS[cat.slug] ?? <CircuitBoard className="h-6 w-6" />}
                </div>
                <h3 className="font-semibold">{cat.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {cat.productCount.toLocaleString()} produtos
                </p>
              </a>
            ))}
          </div>
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
            {data ? `${data.totalManufacturers} fabricantes` : "Fabricantes"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Dois eixos: <strong>Authority</strong> (confiança) e <strong>Coverage</strong>{" "}
            (completude de dados). Separados por país e segmento — do fabricante primário ao
            emergente.
          </p>
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
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier) => (
              <div key={tier.tier} className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg font-black ${tierColorClasses[tier.tier] ?? tierColorClasses.D}`}
                  >
                    {tier.tier}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Authority {tier.authorityRange}
                  </span>
                </div>

                <h3 className="mb-1 font-bold text-sm">{tier.label}</h3>
                <div className="mb-3 text-xs text-muted-foreground">
                  {tier.manufacturers.length} fabricantes
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
                      +{tier.manufacturers.length - 8} mais
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Products (from API + MiniSearch ontology-enhanced search) ──

function ProductsSection({
  searchQuery,
  nicheFilter,
  onNicheChange
}: {
  searchQuery: string | null;
  nicheFilter: string | null;
  onNicheChange: (niche: string | null) => void;
}) {
  // Fetch ALL products once (no server-side filtering — MiniSearch handles it)
  const { data, loading } = useFetch<{ products: ApiProduct[]; total: number }>(
    `/api/catalog?path=products&limit=100`
  );

  const allProducts = data?.products ?? [];

  // Use MiniSearch with ontology-aware term resolution
  const { results: searchResults, indexed } = useProductSearch(
    allProducts,
    searchQuery ?? "",
    nicheFilter
  );

  const products = searchResults;
  const nicheTabs = [
    { id: null, name: "Todos" },
    { id: "pc-hardware", name: "PC Hardware" },
    { id: "electronic-components", name: "Componentes" },
    { id: "consumer-electronics", name: "Consumo" }
  ];

  return (
    <section id="produtos" className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {searchQuery ? `Resultados para "${searchQuery}"` : "Produtos em destaque"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? "Carregando..." : !indexed ? "Indexando..." : `${products.length} produtos encontrados`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {nicheTabs.map((tab) => (
              <button
                key={tab.id ?? "all"}
                onClick={() => onNicheChange(tab.id)}
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

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">Nenhum produto encontrado</p>
            <p className="text-sm text-muted-foreground">Tente outra busca ou nicho</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <a
                key={product.id}
                href={`/produtos/${product.slug}`}
                className="block"
              >
                <Card
                  className="group overflow-hidden transition-all hover:shadow-xl hover:border-emerald-500/40"
                >
                  <div
                    className="relative flex h-40 items-center justify-center"
                    style={{ background: product.imageGradient }}
                  >
                    <span className="text-base font-bold text-white/90">{product.imageLabel}</span>
                  {product.inStock ? (
                    <Badge className="absolute right-3 top-3 bg-emerald-500/90 text-white">
                      Em estoque
                    </Badge>
                  ) : (
                    <Badge className="absolute right-3 top-3 bg-amber-500/90 text-white">
                      Esgotado
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
                    <span className="text-xs text-muted-foreground">{product.category}</span>
                  </div>
                  <h3 className="mb-2 line-clamp-2 font-semibold leading-tight">{product.title}</h3>

                  <div className="mb-3 flex flex-wrap gap-1">
                    {product.specs.slice(0, 3).map((spec) => (
                      <Badge key={spec.name} variant="outline" className="text-[10px] font-normal">
                        {spec.value}
                      </Badge>
                    ))}
                  </div>

                  <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-foreground">{product.rating}</span>
                    <span>({product.reviewCount.toLocaleString()})</span>
                    <span className="mx-1">·</span>
                    <span>{product.suppliers} forn.</span>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xl font-bold">${product.price.toFixed(2)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        ${product.priceRange.min.toFixed(2)} – ${product.priceRange.max.toFixed(2)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      Comparar
                    </Button>
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
                            <span className="text-muted-foreground capitalize">
                              {offer.supplier.code}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">${offer.price.toFixed(2)}</span>
                              <span
                                className={
                                  offer.inStock ? "text-emerald-500" : "text-muted-foreground"
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
        )}
      </div>
    </section>
  );
}

// ── Trust section ──────────────────────────────────────────

function TrustSection() {
  const stats = [
    { label: "estágios de pipeline", value: "15" },
    { label: "conectores ativos", value: "7" },
    { label: "testes automatizados", value: "628" },
    { label: "violações arquiteturais", value: "0" }
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
              Powered by Catalog Intelligence
            </Badge>
            <h2 className="max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
              Cada produto passa por 15 estágios de validação
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Ofertas de marketplaces, distribuidores e fabricantes são consolidadas, enriquecidas
              com dados oficiais e validadas por IA antes de chegarem ao catálogo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1">
                <span className="text-3xl font-black text-emerald-500">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <span>Fontes: Marketplace · Distributor · Retailer · Manufacturer</span>
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
        />
        <TrustSection />
      </main>
    </>
  );
}
