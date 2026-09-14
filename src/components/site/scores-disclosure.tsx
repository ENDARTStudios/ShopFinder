"use client";

/**
 * ShopFinder — Disclosure de metodologia de scores/IA (T062).
 *
 * Conteúdo FÁTICO extraído do código (packages/domain/src/discovery/enrichment):
 * política default-authority-v1, pesos por fator, tiers, DEFAULT_MANUFACTURER_AUTHORITY.
 * NÃO descreve lógica que não existe; não altera scoring.
 * Bloco expansível (<details>) reutilizado na landing (#fabricantes) e em /sobre.
 */
import { useTranslations } from "next-intl";

export function ScoresDisclosure({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const t = useTranslations("scores");
  const items = [
    t("authorityDef"),
    t("authorityFactors"),
    t("priceAuthority"),
    t("coverageDef"),
    t("tiers"),
    t("sourcesLine"),
    t("updatedLine"),
    t("aiLine"),
    t("limitations"),
    t("notSponsored"),
    t("contest")
  ];

  return (
    <details
      className="rounded-xl border border-border/60 bg-card p-4 text-sm"
      open={defaultOpen}
    >
      <summary className="cursor-pointer font-semibold text-sm hover:text-foreground">
        {t("disclosureTitle")}
      </summary>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
