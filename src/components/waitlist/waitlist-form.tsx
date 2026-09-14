"use client";

/**
 * ShopFinder — Formulário da waitlist (T075).
 *
 * POST /api/waitlist — idempotente por email (repetida → alreadyRegistered).
 * Estados: idle → sending → success | already | error. Nunca pré-marca
 * nada; nenhum cookie envolvido.
 */
import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Phase = "idle" | "sending" | "success" | "already" | "error";

export function WaitlistForm() {
  const t = useTranslations("waitlist");
  const [email, setEmail] = React.useState("");
  const [niche, setNiche] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [registeredEmail, setRegisteredEmail] = React.useState("");

  async function submit() {
    if (phase === "sending") return;
    setPhase("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, niche: niche || undefined, locale: undefined })
      });
      if (!res.ok) {
        setPhase("error");
        return;
      }
      setRegisteredEmail(email);
      const data = (await res.json()) as { alreadyRegistered?: boolean };
      setPhase(data.alreadyRegistered ? "already" : "success");
    } catch {
      setPhase("error");
    }
  }

  if (phase === "success" || phase === "already") {
    return (
      <div
        role="status"
        className="mx-auto max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center"
      >
        <p className="text-lg font-semibold">
          {phase === "already" ? t("alreadyTitle") : t("successTitle")}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("successBody", { email: registeredEmail })}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="mx-auto flex max-w-md flex-col gap-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <Label htmlFor="waitlist-email" className="sr-only">
            {t("emailLabel")}
          </Label>
          <Input
            id="waitlist-email"
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            aria-label={t("emailLabel")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={phase === "sending"}
            className="h-11 bg-background"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={phase === "sending"}
          className="h-11 bg-emerald-500 px-6 text-white hover:bg-emerald-600"
        >
          {phase === "sending" ? t("ctaLoading") : t("cta")}
        </Button>
      </div>
      <select
        aria-label={t("nicheLabel")}
        value={niche}
        onChange={(e) => setNiche(e.target.value)}
        disabled={phase === "sending"}
        className="h-11 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">{t("nicheAny")}</option>
        <option value="pc-hardware">{t("nichePc")}</option>
        <option value="electronic-components">{t("nicheComponents")}</option>
        <option value="consumer-electronics">{t("nicheConsumer")}</option>
      </select>
      {phase === "error" && (
        <p role="alert" className="text-sm text-red-500">
          {t("errorMsg")}{" "}
          <button
            type="button"
            onClick={() => void submit()}
            className="underline hover:no-underline"
          >
            {t("ctaRetry")}
          </button>
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
    </form>
  );
}
