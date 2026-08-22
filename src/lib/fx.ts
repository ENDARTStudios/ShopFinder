"use client";

import * as React from "react";
import {
  FX_CACHE_KEY,
  FX_FALLBACK_RATE,
  parseUsdBrlBid,
  isCacheEntryValid,
  type FxCacheEntry
} from "./fx-core";

function getCachedRate(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(FX_CACHE_KEY);
    if (!raw) return null;
    const entry: unknown = JSON.parse(raw);
    if (isCacheEntryValid(entry)) return entry.rate;
    return null;
  } catch {
    return null;
  }
}

function setCachedRate(rate: number): void {
  if (typeof window === "undefined") return;
  try {
    const entry: FxCacheEntry = { rate, ts: Date.now() };
    sessionStorage.setItem(FX_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage pode falhar em modo privado; ignora silenciosamente
  }
}

async function fetchUsdBrlRate(): Promise<number> {
  try {
    const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: unknown = await res.json();
    const bid = parseUsdBrlBid(data);
    if (bid === null) throw new Error("bid inválido");
    return bid;
  } catch {
    return FX_FALLBACK_RATE;
  }
}

export function useFxRate(): { rate: number; ready: boolean } {
  const [rate, setRate] = React.useState<number>(FX_FALLBACK_RATE);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const cached = getCachedRate();
    if (cached !== null) {
      setRate(cached);
      setReady(true);
      return;
    }
    fetchUsdBrlRate().then((r) => {
      setCachedRate(r);
      setRate(r);
      setReady(true);
    });
  }, []);

  // SSR: retorna fallback imediatamente (sem fetch no servidor)
  return { rate, ready };
}
