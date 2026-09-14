/**
 * ShopFinder — taxa USD→BRL server-side (T076).
 *
 * Para contexts sem acesso ao hook client (OG images, metadados). Busca a
 * cotação da awesomeapi com cache de 1 hora em memória e fallback 5.5
 * (mesma fonte do hook client — src/lib/fx.ts / fx-core.ts).
 */

const FX_FALLBACK = 5.5;
const FX_TTL_MS = 60 * 60 * 1000;

let cache: { rate: number; ts: number } | null = null;

export async function getUsdBrlRate(): Promise<number> {
  if (cache && Date.now() - cache.ts <= FX_TTL_MS) return cache.rate;
  try {
    const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", {
      signal: AbortSignal.timeout(2500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { USDBRL?: { bid?: string } };
    const bid = Number(data?.USDBRL?.bid);
    if (!Number.isFinite(bid) || bid <= 0) throw new Error("bid inválido");
    cache = { rate: bid, ts: Date.now() };
    return bid;
  } catch {
    return cache?.rate ?? FX_FALLBACK;
  }
}
