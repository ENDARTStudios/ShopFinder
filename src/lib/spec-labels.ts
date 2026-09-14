/**
 * ShopFinder — helpers de exibição da vitrine (T031).
 *
 * Labels de especificação humanizados (PT/EN), numerais de estoque
 * localizados via Intl e nomes de fornecedor canônicos.
 */

const SPEC_LABELS: Record<string, { pt: string; en: string }> = {
  capacity: { pt: "Capacidade", en: "Capacity" },
  interface: { pt: "Interface", en: "Interface" },
  read_speed: { pt: "Leitura", en: "Read speed" },
  write_speed: { pt: "Gravação", en: "Write speed" }
};

/** Converte um locale ("pt-BR" | "en" | …) na tag Intl correspondente. */
export function intlLocale(locale: string): string {
  return locale.toLowerCase().startsWith("pt") ? "pt-BR" : "en-US";
}

/** Label legível de especificação: mapa PT/EN + fallback Capitalize com espaços. */
export function humanizeSpecName(name: string, locale: string): string {
  const entry = SPEC_LABELS[name.toLowerCase()];
  if (entry) {
    return locale.toLowerCase().startsWith("pt") ? entry.pt : entry.en;
  }
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Numeral de estoque no formato do locale ativo (pt-BR → "3.421"). */
export function formatInventoryCount(count: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(count);
}

/** Nome canônico de fornecedor: aliexpress → AliExpress, ebay → eBay, etc. */
export function supplierDisplayName(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (key === "aliexpress") return "AliExpress";
  if (key === "ebay") return "eBay";
  if (key === "amazon") return "Amazon";
  if (key === "digikey") return "DigiKey";
  if (key === "newegg") return "Newegg";
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}
