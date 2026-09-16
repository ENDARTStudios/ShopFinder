"use client";

import * as React from "react";
import { useFxRate } from "@/lib/fx";

interface PriceProps {
  amount: number;
  currency: string;
  variant?: "default" | "large" | "small";
  className?: string;
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function Price({ amount, currency, variant = "default", className }: PriceProps) {
  const upper = currency.toUpperCase();
  const { rate, ready } = useFxRate();

  const brlAmount = amount * rate;

  const mainClass =
    variant === "large"
      ? "text-3xl font-bold"
      : variant === "small"
        ? "text-sm font-semibold"
        : "text-xl font-bold";

  const cls = [mainClass, "tabular-nums", className].filter(Boolean).join(" ");

  if (upper === "BRL") {
    return <span className={cls}>{formatCurrency(amount, "BRL")}</span>;
  }

  // USD ou outra moeda: mostra R$ convertido em destaque + USD pequeno
  return (
    <span className="inline-flex flex-col items-start">
      <span className={cls}>
        {ready ? formatCurrency(brlAmount, "BRL") : formatCurrency(amount, "USD")}
      </span>
      {ready && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatCurrency(amount, "USD")}
        </span>
      )}
    </span>
  );
}
interface PriceRangeProps {
  min: number;
  max: number;
  currency: string;
  size?: "default" | "large";
}

/**
 * Faixa de preço legível: UMA linha "R$ min – R$ max" (travessão com
 * espaços) + UMA linha pequena "US$ min – US$ max" abaixo (produtos em
 * moeda estrangeira). Quando min === max, exibe um único valor por linha.
 */
export function PriceRange({ min, max, currency, size = "default" }: PriceRangeProps) {
  const upper = currency.toUpperCase();
  const { rate, ready } = useFxRate();

  const mainClass =
    size === "large" ? "text-2xl font-bold" : "text-sm font-semibold text-foreground";

  const single = min === max;
  // T071 — converte pela taxa antes de rotular BRL (antes: USD relabelado R$).
  const brlLine = single
    ? formatCurrency(min * rate, "BRL")
    : `${formatCurrency(min * rate, "BRL")} – ${formatCurrency(max * rate, "BRL")}`;

  if (upper === "BRL") {
    return <span className={`${mainClass} tabular-nums`}>{brlLine}</span>;
  }

  const usdLine = single
    ? formatCurrency(min, "USD")
    : `${formatCurrency(min, "USD")} – ${formatCurrency(max, "USD")}`;

  return (
    <span className="inline-flex flex-col items-start">
      <span className={`${mainClass} tabular-nums`}>{ready ? brlLine : usdLine}</span>
      {ready && <span className="text-xs text-muted-foreground tabular-nums">{usdLine}</span>}
    </span>
  );
}
