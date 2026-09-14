"use client";

/**
 * ShopFinder — Formulário de review (T081).
 *
 * Renderizado só para usuários logados (ReviewsSection faz o gate).
 * 1 review por usuário por produto (409 → mensagem de duplicado).
 * flagged (moderação) confirma envio com aviso de que está em revisão.
 */
import * as React from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Phase = "idle" | "sending" | "done" | "flagged" | "duplicate" | "error";

export function ReviewForm({
  productId,
  onSubmitted
}: {
  productId: string;
  onSubmitted?: () => void;
}) {
  const t = useTranslations("reviews");
  const [rating, setRating] = React.useState(5);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [hovered, setHovered] = React.useState<number | null>(null);

  async function submit() {
    if (phase === "sending" || body.trim().length === 0) return;
    setPhase("sending");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || undefined,
          body: body.trim()
        })
      });
      if (res.status === 409) {
        setPhase("duplicate");
        return;
      }
      if (!res.ok) {
        setPhase("error");
        return;
      }
      const data = (await res.json()) as { flagged?: boolean };
      setPhase(data.flagged ? "flagged" : "done");
      onSubmitted?.();
    } catch {
      setPhase("error");
    }
  }

  if (phase === "done" || phase === "flagged") {
    return (
      <div
        role="status"
        className={`rounded-lg border p-4 text-sm ${
          phase === "flagged"
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-emerald-500/30 bg-emerald-500/5"
        }`}
      >
        {phase === "flagged" ? t("reviewFlagged") : t("reviewSubmitted")}
      </div>
    );
  }

  if (phase === "duplicate") {
    return (
      <div
        role="status"
        className="rounded-lg border border-border/40 p-3 text-sm text-muted-foreground"
      >
        {t("reviewDuplicate")}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium">{t("yourRating")}</Label>
        <span className="flex" role="radiogroup" aria-label={t("yourRating")}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={t("starRating", { rating: value })}
              className="p-0.5"
              disabled={phase === "sending"}
              onMouseEnter={() => setHovered(value)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setRating(value)}
            >
              <Star
                aria-hidden
                className={`h-5 w-5 ${
                  value <= (hovered ?? rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
        </span>
      </div>

      <div>
        <Label htmlFor={`review-title-${productId}`} className="text-xs font-medium">
          {t("titleLabel")}
        </Label>
        <Input
          id={`review-title-${productId}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          className="mt-1 text-sm"
          disabled={phase === "sending"}
        />
      </div>

      <div>
        <Label htmlFor={`review-body-${productId}`} className="text-xs font-medium">
          {t("reviewLabel")}
        </Label>
        <Textarea
          id={`review-body-${productId}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("reviewPlaceholder")}
          rows={3}
          maxLength={2000}
          className="mt-1 text-sm"
          disabled={phase === "sending"}
          required
        />
      </div>

      {phase === "error" && (
        <p role="alert" className="text-xs text-red-500">
          {t("reviewError")}
        </p>
      )}

      <Button type="submit" size="sm" disabled={phase === "sending" || body.trim().length === 0}>
        {phase === "sending" ? t("reviewSending") : t("reviewSubmit")}
      </Button>
    </form>
  );
}
