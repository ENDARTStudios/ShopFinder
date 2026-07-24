"use client";

import * as React from "react";

const CACHE_KEY = "sf:fx";
const TTL_MS = 60 * 60 * 1000; // 1 hora
const FALLBACK_RATE = 5.5;

interface CacheEntry {
  rate: number;
  ts: number;
}

function getCachedRate(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (typeof entry.rate !== "number" || typeof entry.ts !== "number") return null;
    if (Date.now() - entry.ts > TTL_MS) return null;
    return entry.rate;
  } catch {
    return null;
  }
}

function setCachedRate(rate: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rate, ts: Date.now() }));
  } catch {
    // sessionStorage pode falhar em modo privado; ignora silenciosamente
  }
}

async function fetchUsdBrlRate(): Promise<number> {
  try {
    const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const bid = parseFloat(data?.USDBRL?.bid);
    if (!Number.isFinite(bid) || bid <= 0) throw new Error("bid inválido");
    return bid;
  } catch {
    return FALLBACK_RATE;
  }
}

export function useFxRate(): { rate: number; ready: boolean } {
  const [rate, setRate] = React.useState<number>(FALLBACK_RATE);
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