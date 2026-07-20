/**
 * ShopFinder — Language selector (Sprint 11 recriação).
 *
 * Compact PT | EN toggle rendered in the header. Persists the choice in a
 * `locale` cookie (read by `src/i18n/request.ts` on the server) and reloads
 * the page so the new locale takes effect immediately.
 *
 * Why reload instead of client-side swap? Server components resolve messages
 * via `getTranslations`, and `<html lang>` also needs to update. A clean
 * reload is the simplest and most reliable way to apply the new locale.
 */
"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOCALE_COOKIE = "locale";
const ONE_YEAR = 60 * 60 * 24 * 365;

function readCurrentLocale(): "pt-BR" | "en" {
  if (typeof document === "undefined") return "pt-BR";
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
  return match?.split("=")[1] === "en" ? "en" : "pt-BR";
}

export function LanguageSelector() {
  const [locale, setLocale] = React.useState<"pt-BR" | "en">("pt-BR");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setLocale(readCurrentLocale());
    setMounted(true);
  }, []);

  const switchTo = (next: "pt-BR" | "en") => {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
    // Reload to pick up server-side locale change (layout, server components).
    window.location.reload();
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" disabled>
        <Globe className="mr-1 h-3.5 w-3.5" />
        PT | EN
      </Button>
    );
  }

  return (
    <div
      className="flex items-center rounded-md border border-border/60 bg-background p-0.5"
      role="group"
      aria-label="Language selector"
    >
      <button
        type="button"
        onClick={() => switchTo("pt-BR")}
        aria-pressed={locale === "pt-BR"}
        aria-label="Português"
        title="Português"
        className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
          locale === "pt-BR"
            ? "bg-emerald-500 text-white"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        PT
      </button>
      <button
        type="button"
        onClick={() => switchTo("en")}
        aria-pressed={locale === "en"}
        aria-label="English"
        title="English"
        className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
          locale === "en"
            ? "bg-emerald-500 text-white"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
    </div>
  );
}
