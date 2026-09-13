"use client";

/**
 * ShopFinder — Nota de câmbio (T063, transparência de oferta).
 *
 * Exibe a moeda da oferta, a taxa USD→BRL em uso e O MOMENTO do câmbio
 * (timestamp do cache de fx), substituindo claims absolutos por informação
 * verificável. Renderiza "—" para o momento enquanto o fx não está pronto.
 */
import { useLocale, useTranslations } from "next-intl";
import { useFxRate } from "@/lib/fx";

export function FxNote() {
  const { rate, ts } = useFxRate();
  const t = useTranslations("detail");
  const locale = useLocale();
  const dateFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short"
  });

  return (
    <p>
      {t("fxNote", {
        when: ts !== null ? dateFmt.format(new Date(ts)) : "—",
        rate: rate.toFixed(4)
      })}
    </p>
  );
}
