/**
 * @workspace/domain/discovery/normalizer/price-bands
 *
 * Price normalization to bands (R6).
 *
 * Prices change daily. Normalizing to bands makes products comparable
 * across time and providers without being sensitive to daily fluctuations.
 *
 * Bands (in the price's minor currency units):
 *   0-10, 10-20, 20-50, 50-100, 100-250, 250-500, 500-1000,
 *   1000-2500, 2500-5000, 5000+
 */
import type { PriceBand, NormalizedPrice } from "./types";

const BAND_BOUNDARIES: ReadonlyArray<{ band: PriceBand; min: number; max: number }> = [
  { band: "0-10", min: 0, max: 10 },
  { band: "10-20", min: 10, max: 20 },
  { band: "20-50", min: 20, max: 50 },
  { band: "50-100", min: 50, max: 100 },
  { band: "100-250", min: 100, max: 250 },
  { band: "250-500", min: 250, max: 500 },
  { band: "500-1000", min: 500, max: 1000 },
  { band: "1000-2500", min: 1000, max: 2500 },
  { band: "2500-5000", min: 2500, max: 5000 }
];

/**
 * Classify a price amount into a band.
 * Amount is in minor units (cents) of the given currency.
 * For simplicity, bands are defined in absolute minor units —
 * production should convert to a common currency first.
 */
export function classifyPriceBand(amount: number): PriceBand {
  if (amount < 0) return "0-10"; // defensive
  for (const b of BAND_BOUNDARIES) {
    if (amount >= b.min && amount < b.max) return b.band;
  }
  return "5000+";
}

/**
 * Normalize a price to band form.
 */
export function normalizePrice(amount: number, currency: string): NormalizedPrice {
  return {
    band: classifyPriceBand(amount),
    currency: currency.toUpperCase(),
    originalAmount: amount
  };
}

/**
 * Get all price bands in order.
 */
export function getAllPriceBands(): ReadonlyArray<PriceBand> {
  return BAND_BOUNDARIES.map((b) => b.band).concat(["5000+"]);
}
