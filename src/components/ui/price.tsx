/**
 * T101 Commerce Utility — bloco de preço reutilizável.
 * Preço como protagonista: valor com tabular-nums, hierarquia clara,
 * badges SEMÂNTICOS de estoque/desconto (nunca só por cor).
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface PriceBlockProps {
  /** Valor numérico já convertido (ex.: 2834.04). */
  amount: number;
  currency: string;
  /** Fornecedor da oferta (eBay, Amazon, Newegg…). */
  provider?: string | null;
  /** Rótulo de estoque: "in-stock" | "out" | "unknown". */
  stock?: "in-stock" | "out" | "unknown";
  /** Percentual de desconto vs. preço de referência (0-100). */
  discountPercent?: number | null;
  /** Destaque como melhor oferta. */
  best?: boolean;
  size?: "md" | "lg";
  className?: string;
}

const currencyFmt = (amount: number, currency: string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amount);

export function PriceBlock({
  amount,
  currency,
  provider,
  stock = "unknown",
  discountPercent,
  best = false,
  size = "md",
  className
}: PriceBlockProps) {
  const stockBadge =
    stock === "in-stock" ? (
      <span className="bg-stock-ok/10 text-stock-ok rounded px-1.5 py-0.5 text-[11px] font-medium">
        Em estoque
      </span>
    ) : stock === "out" ? (
      <span className="bg-stock-out/10 text-stock-out rounded px-1.5 py-0.5 text-[11px] font-medium">
        Esgotado
      </span>
    ) : null;

  const dealBadge =
    discountPercent && discountPercent >= 5 ? (
      <span className="bg-deal/10 text-deal rounded px-1.5 py-0.5 text-[11px] font-semibold">
        -{Math.round(discountPercent)}%
      </span>
    ) : null;

  return (
    <div className={cn("min-w-0", className)}>
      {provider && (
        <div className="mb-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          {provider}
          {best && (
            <span className="bg-emerald-600 ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Melhor preço
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={cn(
            "price-value font-bold",
            size === "lg" ? "text-2xl sm:text-3xl" : "text-lg"
          )}
        >
          {currencyFmt(amount, currency)}
        </span>
        {stockBadge}
        {dealBadge}
      </div>
    </div>
  );
}
