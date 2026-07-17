/**
 * ShopFinder — Header compare link (Sprint 12 recriação).
 *
 * Renders a "Comparar (N)" link in the header when the user has at least one
 * product in the comparison list. Hidden when the list is empty.
 *
 * Link aponta para compareUrl do CompareContext (formato /compare?slugs=a,b,c)
 * — shareable URL.
 */
"use client";

import * as React from "react";
import Link from "next/link";
import { Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCompare } from "@/contexts/compare-context";
import { Badge } from "@/components/ui/badge";

export function HeaderCompareLink() {
  const t = useTranslations("compare");
  const { items, compareUrl } = useCompare();

  if (items.length === 0) return null;

  return (
    <Link
      href={compareUrl}
      className="relative inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
      aria-label={`${t("headerCompare")} (${items.length})`}
    >
      <Scale className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{t("headerCompare")}</span>
      <Badge className="h-4 min-w-4 justify-center bg-emerald-500 px-1 text-[10px] text-white">
        {items.length}
      </Badge>
    </Link>
  );
}
