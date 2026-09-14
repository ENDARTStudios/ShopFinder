"use client";

/**
 * ShopFinder — Registro do Service Worker (T085).
 *
 * Montado no root layout; só registra em produção (NODE_ENV=production —
 * `next dev` nunca registra) e se o browser suporta. Kill-switch: remover
 * este componente do layout + bump de CACHE_VERSION no public/sw.js
 * (MANUAL_DO_OPERADOR.md §PWA).
 */
import * as React from "react";

export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registro é best-effort; falha nunca quebra o app
    });
  }, []);

  return null;
}
