import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { company } from "@/config/company";
import { InstitutionalHeader } from "@/components/site/institutional-header";

export const metadata: Metadata = {
  title: "Contato — ShopFinder"
};

export default async function ContatoPage() {
  const t = await getTranslations("contact");

  return (
    <div className="min-h-screen">
      <InstitutionalHeader />
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="mb-6 text-3xl font-black tracking-tight">{t("title")}</h1>

        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{t("intro")}</p>

        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
          <p>
            <span className="text-muted-foreground">Email: </span>
            <a
              href={`mailto:${company.email}`}
              className="font-medium text-emerald-500 hover:underline"
            >
              {company.email}
            </a>
          </p>
          <p className="mt-2">
            <span className="text-muted-foreground">{t("responseTitle")}: </span>
            <span className="font-medium">{t("response")}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
