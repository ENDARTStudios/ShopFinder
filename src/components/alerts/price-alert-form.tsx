"use client";

/**
 * ShopFinder — Formulário de alerta de preço (T083).
 *
 * "Avisar quando preço ≤ R$ X" no detalhe do produto. Logado cria via
 * POST /api/alerts (409 = já existe ativo). Anônimo vê CTA de login
 * (padrão ReviewsSection — gate server-side via prop).
 */
import * as React from "react";
import { useTranslations } from "next-intl";
import { Bell, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Phase = "idle" | "sending" | "created" | "exists" | "limit" | "error";

export function PriceAlertForm({
  productId,
  isAuthenticated,
  currentPriceBrl
}: {
  productId: string;
  isAuthenticated: boolean;
  currentPriceBrl: number | null;
}) {
  const t = useTranslations("alerts");
  const [price, setPrice] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-muted-foreground">
        <Bell className="mr-1 inline h-3.5 w-3.5" aria-hidden />
        <Link href="/login" className="font-medium underline underline-offset-4">
          {t("loginCta")}
        </Link>
      </p>
    );
  }

  async function submit() {
    const value = Number(price.replace(",", "."));
    if (phase === "sending" || !Number.isFinite(value) || value <= 0) return;
    setPhase("sending");
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, targetPrice: value })
      });
      if (res.status === 409) setPhase("exists");
      else if (res.status === 201) setPhase("created");
      else if (res.status === 400) setPhase("limit");
      else setPhase("error");
    } catch {
      setPhase("error");
    }
  }

  return (
    <div className="mt-4 border-t border-border/40 pt-3">
      <Label htmlFor={`alert-price-${productId}`} className="text-xs font-medium">
        {t("formLabel")}
      </Label>
      {phase === "created" ? (
        <p role="status" className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
          {t("created")}
        </p>
      ) : phase === "exists" ? (
        <p role="status" className="mt-2 rounded-lg border border-border/40 p-3 text-sm text-muted-foreground">
          {t("exists")}
        </p>
      ) : phase === "limit" ? (
        <p role="alert" className="mt-2 text-sm text-amber-600 dark:text-amber-400">
          {t("limitReached")}
        </p>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <div className="relative w-36">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              R$
            </span>
            <Input
              id={`alert-price-${productId}`}
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder={currentPriceBrl ? currentPriceBrl.toFixed(2) : "0,00"}
              className="pl-9 text-sm"
              disabled={phase === "sending"}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={phase === "sending" || !price}
            onClick={() => void submit()}
          >
            {phase === "sending" ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Bell className="mr-1 h-3.5 w-3.5" aria-hidden />
            )}
            {phase === "sending" ? t("creating") : t("create")}
          </Button>
        </div>
      )}
      {phase === "error" && (
        <p role="alert" className="mt-2 text-xs text-red-500">
          {t("error")}
        </p>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{t("disclaimer")}</p>
    </div>
  );
}
