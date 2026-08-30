import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/* RASCUNHO — revisar antes do lançamento (conteúdo jurídico é responsabilidade do Operador) */

export const metadata: Metadata = {
  title: "Termos de Uso — ShopFinder"
};

export default async function TermosPage() {
  const t = await getTranslations("terms");

  const sections = [
    { title: t("roleTitle"), body: t("role") },
    { title: t("useTitle"), body: t("use") },
    { title: t("ipTitle"), body: t("ip") },
    { title: t("changesTitle"), body: t("changes") }
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="mb-4 text-3xl font-black tracking-tight">{t("title")}</h1>

      <p className="mb-6 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
        {t("draft")}
      </p>

      <div className="space-y-5">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="mb-1 text-base font-bold">{s.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
