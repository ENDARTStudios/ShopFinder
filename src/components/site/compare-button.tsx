/**
 * ShopFinder — Compare button (Sprint 12 recriação).
 *
 * Shared client component used by the landing-page product cards and the
 * product detail page to add/remove a product from the comparison list.
 *
 * Behaviour:
 *   - When the product is NOT in the list: shows "Comparar" with a + icon
 *     and adds it on click. If the list is full (4 items), button is
 *     disabled with tooltip "max reached".
 *   - When the product IS in the list: shows "Adicionado" with a checkmark
 *     and a subtle emerald outline; clicking removes it.
 *
 * `e.preventDefault()` + `e.stopPropagation()` prevent the click from
 * bubbling up to a parent <a href="..."> wrapper (the landing page wraps
 * each card in an <a>).
 *
 * Accessibility: aria-pressed, aria-label dinâmico (headerAdd/headerRemove/
 * headerFull via i18n), title tooltip.
 */
"use client";

import * as React from "react";
import { Check, Plus, GitCompare } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useCompare } from "@/contexts/compare-context";

export interface CompareButtonProps {
  slug: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  /** When true, navigates to /compare after adding (default false). */
  navigateOnAdd?: boolean;
  onFull?: () => void;
}

export function CompareButton({
  slug,
  variant = "default",
  size = "sm",
  className,
  navigateOnAdd = false,
  onFull
}: CompareButtonProps) {
  const t = useTranslations("compare");
  const { items, addItem, removeItem, hasItem, isFull, compareUrl } = useCompare();
  const selected = hasItem(slug);

  const handleClick = (e: React.MouseEvent) => {
    // Prevent the click from bubbling up to a parent <a href="..."> wrapper
    // (the landing page wraps each card in an <a>).
    e.preventDefault();
    e.stopPropagation();

    if (selected) {
      removeItem(slug);
      return;
    }
    if (isFull) {
      onFull?.();
      return;
    }
    addItem(slug);
    if (navigateOnAdd) {
      // Use a tiny delay so the user perceives the "added" state before nav.
      window.setTimeout(() => {
        window.location.href = compareUrl;
      }, 150);
    }
  };

  if (selected) {
    return (
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={handleClick}
        className={`border-emerald-500/50 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 ${className ?? ""}`}
        aria-pressed={true}
        aria-label={t("headerRemove")}
        title={t("headerRemove")}
      >
        <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
        {t("headerCompare")}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isFull}
      className={className}
      aria-pressed={false}
      aria-label={isFull ? t("headerFull") : t("headerAdd")}
      title={isFull ? t("headerFull") : t("headerAdd")}
    >
      {isFull ? (
        <GitCompare className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
      )}
      {t("headerCompare")}
      {items.length > 0 && !selected && (
        <span className="ml-1 text-[10px] font-normal opacity-70">({items.length}/4)</span>
      )}
    </Button>
  );
}
