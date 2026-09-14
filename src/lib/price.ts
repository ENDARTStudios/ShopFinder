/**
 * ShopFinder — Matemática de preço (minor units) — fonte única.
 * Testes em tests/unit/price.test.ts (meta de cobertura 90%, docs/eng/TESTING.md).
 */

/** Converte minor units (BigInt, centavos) para valor decimal da moeda. */
export function minorUnitsToNumber(minor: bigint): number {
  return Number(minor) / 100;
}

export interface PriceRange {
  min: number;
  max: number;
  fromOffers: boolean;
}

/**
 * Faixa de preço a partir das ofertas; sem ofertas usa o preço base.
 */
export function computePriceRange(
  offerPrices: number[],
  basePrice: number
): PriceRange {
  if (offerPrices.length === 0) {
    return { min: basePrice, max: basePrice, fromOffers: false };
  }
  return {
    min: Math.min(...offerPrices),
    max: Math.max(...offerPrices),
    fromOffers: true
  };
}

/**
 * Escapa e formata valor monetário para exibição estável (evita
 * surpresas de float em arredondamento de exibição).
 */
export function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    amount
  );
}
