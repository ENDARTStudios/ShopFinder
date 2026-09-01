/**
 * ShopFinder — FilterBar component (Sprint 11 recriação).
 *
 * Sidebar/drawer de filtros paramétricos que refinam resultados da busca.
 * Estado dos filtros vive no componente pai (Landing) e é compartilhado
 * entre FilterBar (escrita) e ProductsSection → useProductSearch (leitura).
 *
 * Dimensões de filtro:
 *   1. Fabricantes — checkboxes (top 10 por frequência + expansor "Mostrar todos")
 *   2. Faixa de preço — inputs numéricos min/max em BRL (primário, T063);
 *      commit converte pela taxa fx para os bounds USD do /api/catalog
 *   3. Atributos dinâmicos — linhas com select (nome do atributo) + input de valor
 *      substring; múltiplas linhas via botão "+ Adicionar filtro"
 *
 * Layout:
 *   - Desktop (lg+): sidebar vertical sticky 256px ao lado dos resultados
 *   - Mobile: botão "Filtros" abre Sheet (drawer) da esquerda
 *
 * Acessibilidade: role="region" + aria-label no container, aria-label em
 * cada input, aria-pressed nos botões de toggle.
 *
 * NOTA: textos via useTranslations('filter') — i18n configurado em B3.
 * Enquanto i18n não está montado, usa fallback hardcoded PT-BR para
 * não quebrar o render. Após B3+B4, todos os strings viram useTranslations.
 */
"use client";

import * as React from "react";
import { SlidersHorizontal, X, Plus, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useFxRate } from "@/lib/fx";

import type { ApiProduct } from "@/components/site/landing";
import type { ProductFilter } from "@/hooks/use-product-search";
import { EMPTY_FILTER } from "@/hooks/use-product-search";

// ── Derived option lists ───────────────────────────────────

interface ManufacturerOption {
  code: string;
  count: number;
}

interface AttributeOption {
  id: string;
  label: string;
  count: number;
}

function useManufacturerOptions(products: ApiProduct[]): ManufacturerOption[] {
  return React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);
}

function useAttributeOptions(products: ApiProduct[]): AttributeOption[] {
  return React.useMemo(() => {
    const counts = new Map<string, number>();
    const labels = new Map<string, string>();
    for (const p of products) {
      for (const spec of p.specs) {
        const id = spec.name;
        counts.set(id, (counts.get(id) ?? 0) + 1);
        if (!labels.has(id)) labels.set(id, spec.name);
      }
    }
    return Array.from(counts.entries())
      .map(([id, count]) => ({ id, label: labels.get(id) ?? id, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);
}

// ── FilterBar body (shared between desktop sidebar and mobile sheet) ──

interface FilterBarBodyProps {
  products: ApiProduct[];
  filters: ProductFilter;
  onChange: (f: ProductFilter) => void;
  /** Translation strings — pass from parent or use defaults. */
  labels?: {
    title: string;
    active: string;
    manufacturer: string;
    price: string;
    min: string;
    max: string;
    priceHint: string;
    specs: string;
    valuePlaceholder: string;
    addAttribute: string;
    removeAttribute: string;
    clear: string;
    showAll: string;
    showLess: string;
    apply: string;
  };
}

const DEFAULT_LABELS = {
  title: "Filtros",
  active: "ativo(s)",
  manufacturer: "Marca",
  price: "Preço",
  min: "Min",
  max: "Max",
  priceHint: "Valores em BRL (referência); a busca converte pelo câmbio do momento.",
  specs: "Especificações",
  valuePlaceholder: "Valor",
  addAttribute: "Adicionar filtro",
  removeAttribute: "Remover filtro",
  clear: "Limpar filtros",
  showAll: "Mostrar todos",
  showLess: "Mostrar menos",
  apply: "Aplicar filtros"
};

function FilterBarBody({
  products,
  filters,
  onChange,
  labels = DEFAULT_LABELS
}: FilterBarBodyProps) {
  const t = { ...DEFAULT_LABELS, ...labels };
  const allManufacturers = useManufacturerOptions(products);
  const allAttributes = useAttributeOptions(products);

  // T063 — o filtro é primário em BRL (moeda prometida ao consumidor). O
  // usuário digita reais; o commit converte pela taxa USD→BRL em uso para os
  // bounds USD que o /api/catalog aplica sobre as ofertas.
  const { rate } = useFxRate();

  const [showAllManufacturers, setShowAllManufacturers] = React.useState(false);
  const visibleManufacturers = showAllManufacturers
    ? allManufacturers
    : allManufacturers.slice(0, 10);

  // Numeric inputs keep their own string state so the user can type freely
  // (e.g. clearing the field, partial decimals) without the parent state
  // snapping back to NaN. Exibidos em BRL; filters guarda USD.
  const [minStr, setMinStr] = React.useState<string>(filters.priceMin?.toString() ?? "");
  const [maxStr, setMaxStr] = React.useState<string>(filters.priceMax?.toString() ?? "");

  React.useEffect(() => {
    setMinStr(filters.priceMin !== undefined ? (filters.priceMin * rate).toFixed(2) : "");
    setMaxStr(filters.priceMax !== undefined ? (filters.priceMax * rate).toFixed(2) : "");
    // rate no closure: o efeito reexecuta a cada render com o valor corrente
    // quando os filtros mudam (deps abaixo); intencional não depender de rate
    // para não sobrescrever o valor enquanto o usuário digita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.priceMin, filters.priceMax]);

  const commitPrice = () => {
    const minBrl = minStr.trim() === "" ? undefined : Number(minStr);
    const maxBrl = maxStr.trim() === "" ? undefined : Number(maxStr);
    const toUsd = (v: number | undefined) =>
      typeof v === "number" && !Number.isNaN(v) && v >= 0 ? v / rate : undefined;
    onChange({
      ...filters,
      priceMin: toUsd(minBrl),
      priceMax: toUsd(maxBrl)
    });
  };

  const toggleManufacturer = (code: string) => {
    const set = new Set(filters.manufacturers);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    onChange({ ...filters, manufacturers: Array.from(set) });
  };

  const addAttributeRow = () => {
    const used = new Set(Object.keys(filters.attributes));
    const next = allAttributes.find((a) => !used.has(a.id));
    if (!next) return;
    onChange({
      ...filters,
      attributes: { ...filters.attributes, [next.id]: "" }
    });
  };

  const updateAttributeRow = (oldId: string, newId: string) => {
    const next = { ...filters.attributes };
    const value = next[oldId] ?? "";
    delete next[oldId];
    next[newId] = value;
    onChange({ ...filters, attributes: next });
  };

  const setAttributeValue = (id: string, value: string) => {
    onChange({
      ...filters,
      attributes: { ...filters.attributes, [id]: value }
    });
  };

  const removeAttributeRow = (id: string) => {
    const next = { ...filters.attributes };
    delete next[id];
    onChange({ ...filters, attributes: next });
  };

  const clearAll = () => onChange({ ...EMPTY_FILTER });

  const activeCount =
    filters.manufacturers.length +
    (filters.priceMin !== undefined || filters.priceMax !== undefined ? 1 : 0) +
    Object.values(filters.attributes).filter((v) => v && v.trim() !== "").length;

  return (
    <div className="flex h-full flex-col gap-5" role="region" aria-label={t.title}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          <h3 className="text-sm font-bold tracking-tight">{t.title}</h3>
        </div>
        {activeCount > 0 && (
          <Badge
            variant="secondary"
            className="text-[10px]"
            aria-label={`${activeCount} ${t.active}`}
          >
            {activeCount} {t.active}
          </Badge>
        )}
      </div>

      {/* Manufacturers */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t.manufacturer}
        </Label>
        <div className="space-y-1.5">
          {visibleManufacturers.map((m) => {
            const checked = filters.manufacturers.includes(m.code);
            return (
              <label
                key={m.code}
                htmlFor={`mfr-${m.code}`}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-muted/60"
              >
                <Checkbox
                  id={`mfr-${m.code}`}
                  checked={checked}
                  onCheckedChange={() => toggleManufacturer(m.code)}
                />
                <span className="flex-1 truncate">{m.code}</span>
                <span className="text-[10px] text-muted-foreground">{m.count}</span>
              </label>
            );
          })}
        </div>
        {allManufacturers.length > 10 && (
          <button
            type="button"
            onClick={() => setShowAllManufacturers((v) => !v)}
            className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            {showAllManufacturers ? t.showLess : `${t.showAll} (${allManufacturers.length})`}
          </button>
        )}
      </div>

      <Separator />

      {/* Price range */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t.price} (BRL)
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder={t.min}
            aria-label={`${t.price} ${t.min}`}
            value={minStr}
            onChange={(e) => setMinStr(e.target.value)}
            onBlur={commitPrice}
            className="h-9 text-sm"
          />
          <span className="text-xs text-muted-foreground" aria-hidden="true">
            —
          </span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder={t.max}
            aria-label={`${t.price} ${t.max}`}
            value={maxStr}
            onChange={(e) => setMaxStr(e.target.value)}
            onBlur={commitPrice}
            className="h-9 text-sm"
          />
        </div>
        {(filters.priceMin !== undefined || filters.priceMax !== undefined) && (
          <p className="text-[10px] text-muted-foreground">{t.priceHint}</p>
        )}
      </div>

      <Separator />

      {/* Attributes */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t.specs}
        </Label>
        <div className="space-y-2">
          {Object.entries(filters.attributes).map(([attrId, value]) => (
            <div key={attrId} className="flex items-center gap-1.5">
              <Select value={attrId} onValueChange={(newId) => updateAttributeRow(attrId, newId)}>
                <SelectTrigger className="h-9 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allAttributes.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.label} ({a.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={t.valuePlaceholder}
                aria-label={`${t.specs} ${attrId} ${t.valuePlaceholder}`}
                value={value}
                onChange={(e) => setAttributeValue(attrId, e.target.value)}
                className="h-9 w-24 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => removeAttributeRow(attrId)}
                aria-label={t.removeAttribute}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={addAttributeRow}
        >
          <Plus className="mr-1 h-3 w-3" />
          {t.addAttribute}
        </Button>
      </div>

      <div className="mt-auto space-y-2">
        <Separator />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={clearAll}
          disabled={activeCount === 0}
        >
          {t.clear}
        </Button>
      </div>
    </div>
  );
}

// ── Public FilterBar ───────────────────────────────────────

interface FilterBarProps {
  products: ApiProduct[];
  filters: ProductFilter;
  onChange: (f: ProductFilter) => void;
  labels?: FilterBarBodyProps["labels"];
}

export function FilterBar({ products, filters, onChange, labels }: FilterBarProps) {
  const t = { ...DEFAULT_LABELS, ...labels };
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const activeCount =
    filters.manufacturers.length +
    (filters.priceMin !== undefined || filters.priceMax !== undefined ? 1 : 0) +
    Object.values(filters.attributes).filter((v) => v && v.trim() !== "").length;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-border/60 bg-card p-4">
          <FilterBarBody
            products={products}
            filters={filters}
            onChange={onChange}
            labels={labels}
          />
        </div>
      </aside>

      {/* Mobile trigger + drawer */}
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              {t.title}
              {activeCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 justify-center px-1 text-[10px]"
                >
                  {activeCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[320px] sm:w-[380px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-emerald-500" />
                {t.title}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 overflow-y-auto px-4 pb-4">
              <FilterBarBody
                products={products}
                filters={filters}
                onChange={onChange}
                labels={labels}
              />
            </div>
            <SheetFooter>
              <Button onClick={() => setMobileOpen(false)} className="w-full">
                {t.apply}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
