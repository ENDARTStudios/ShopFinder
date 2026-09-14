"use client";

/**
 * ShopFinder — Beacon de pageview first-party cookieless (T077).
 *
 * Fire-and-forget em cada navegação: envia path, host do referrer (apenas
 * o hostname, e só se for externo) e classe de dispositivo. NÃO envia IP,
 * UA cru, cookie ou identificador — o servidor só armazena os agregados.
 * Rotas internas (/admin, /api) não são rastreadas.
 */
import * as React from "react";
import { usePathname } from "next/navigation";

function deviceFromUserAgent(ua: string): "desktop" | "mobile" | "tablet" {
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android/i.test(ua)) return "mobile";
  return "desktop";
}

export function PageViewTracker() {
  const pathname = usePathname();

  React.useEffect(() => {
    if (!pathname) return;
    // Páginas internas e de administração não são produto público.
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;

    const device = deviceFromUserAgent(navigator.userAgent);
    const referrerHost = (() => {
      try {
        return document.referrer ? new URL(document.referrer).hostname : null;
      } catch {
        return null;
      }
    })();

    const payload = JSON.stringify({ path: pathname, referrerHost, device });
    const body = fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(() => undefined);

    return () => {
      void body;
    };
  }, [pathname]);

  return null;
}
