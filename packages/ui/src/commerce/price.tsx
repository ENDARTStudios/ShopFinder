"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Price — displays a Money amount with locale-aware currency formatting.
 *
 * Domain link: @workspace/domain/shared Money (amount in minor units + ISO 4217 currency).
 *
 * Props:
 *   - amount       : minor units (cents), e.g. 1999 = $19.99
 *   - currency     : ISO 4217 code, e.g. "USD"
 *   - compareAt    : optional original price (strikethrough)
 *   - locale       : BCP 47 locale for formatting (default "en-US")
 *   - size         : visual size
 *   - showFrom     : prefix with "from" (for price ranges)
 */

export interface PriceProps {
  amount: number;
  currency: string;
  compareAt?: number;
  locale?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showFrom?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<PriceProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-2xl"
};

function formatMoney(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount / 100);
  } catch {
    return `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`;
  }
}

export function Price({
  amount,
  currency,
  compareAt,
  locale = "en-US",
  size = "md",
  showFrom = false,
  className
}: PriceProps) {
  const formatted = formatMoney(amount, currency, locale);
  const hasDiscount = compareAt !== undefined && compareAt > amount;
  const discountPct = hasDiscount ? Math.round(((compareAt! - amount) / compareAt!) * 100) : 0;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      {showFrom && <span className="text-xs text-muted-foreground">from</span>}
      <span
        className={cn(
          "font-semibold tabular-nums",
          SIZE_CLASSES[size],
          hasDiscount && "text-destructive"
        )}
      >
        {formatted}
      </span>
      {hasDiscount && (
        <>
          <span
            className={cn("text-muted-foreground line-through tabular-nums", SIZE_CLASSES[size])}
          >
            {formatMoney(compareAt!, currency, locale)}
          </span>
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
            -{discountPct}%
          </span>
        </>
      )}
    </div>
  );
}

/** Money — semantic alias for Price, for non-product contexts (cart totals, etc.) */
export const Money = Price;
