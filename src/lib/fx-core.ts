/**
 * ShopFinder — FX core (puro, testável)
 *
 * Lógica de cotação USD-BRL extraída do hook useFxRate para permitir
 * testes unitários diretos (issue #28 — meta 90% em domain/fx).
 */

export const FX_CACHE_KEY = "sf:fx";
export const FX_TTL_MS = 60 * 60 * 1000; // 1 hora
export const FX_FALLBACK_RATE = 5.5;

export interface FxCacheEntry {
  rate: number;
  ts: number;
}

/**
 * Valida o payload da awesomeapi (`/json/last/USD-BRL`).
 * Retorna o bid válido ou null (payload malformado, bid <= 0 etc.).
 */
export function parseUsdBrlBid(data: unknown): number | null {
  if (typeof data !== "object" || data === null) return null;
  const raw = (data as Record<string, unknown>).USDBRL;
  if (typeof raw !== "object" || raw === null) return null;
  const bid = (raw as Record<string, unknown>).bid;
  const parsed = typeof bid === "number" ? bid : parseFloat(String(bid));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

/** Entrada de cache válida: tipos corretos e dentro do TTL. */
export function isCacheEntryValid(entry: unknown, now: number = Date.now()): entry is FxCacheEntry {
  if (typeof entry !== "object" || entry === null) return false;
  const { rate, ts } = entry as Record<string, unknown>;
  if (typeof rate !== "number" || typeof ts !== "number") return false;
  if (!Number.isFinite(rate) || rate <= 0) return false;
  return now - ts <= FX_TTL_MS;
}
