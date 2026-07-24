"use client";

import * as React from "react";
import { useFxRate } from "@/lib/fx";

interface PriceProps {
  amount: number;
  currency: string;
  variant?: "default" | "large" | "small";
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function Price({ amount, currency, variant = "default" }: PriceProps) {
  const upper = currency.toUpperCase();
  const { rate, ready } = useFxRate();

  const brlAmount = amount * rate;

  const mainClass =
    variant === "large"
      ? "text-3xl font-bold"
      : variant === "small"
        ? "text-sm font-semibold"
        : "text-xl font-bold";

  if (upper === "BRL") {
    return <span className={`${mainClass} tabular-nums`}>{formatCurrency(amount, "BRL")}</span>;
  }

  // USD ou outra moeda: mostra R$ convertido em destaque + USD pequeno
  return (
    <span className="inline-flex flex-col items-start">
      <span className={`${mainClass} tabular-nums`}>
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