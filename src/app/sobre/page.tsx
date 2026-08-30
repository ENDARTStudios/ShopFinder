import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Sobre — ShopFinder"
};

export default async function SobrePage() {
  const t = await getTranslations("about");

  const steps = [t("step1"), t("step2"), t("step3")];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-3xl font-black tracking-tight">{t("title")}</h1>

      <h2 className="mb-2 text-lg font-bold">{t("missionTitle")}</h2>
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{t("mission")}</p>

      <h2 className="mb-2 text-lg font-bold">{t("howTitle")}</h2>
      <ol className="mb-6 space-y-2 text-sm leading-relaxed text-muted-foreground">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-500">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <h2 className="mb-2 text-lg font-bold">{t("nichesTitle")}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{t("niches")}</p>
    </div>
  );
}
