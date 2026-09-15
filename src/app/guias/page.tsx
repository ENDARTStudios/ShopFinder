import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { getLocale } from "next-intl/server";
import { GUIDES } from "@/content/guides";
import { buildMetadata } from "@workspace/seo/metadata";

type Locale = "pt-BR" | "en" | "es-ES";

export const metadata: Metadata = buildMetadata({
  title: "Guias de compra",
  description: "Conteúdo editorial ShopFinder: como comparar e escolher com segurança.",
  path: "/guias"
});

export default async function GuiasPage() {
  const locale = ((await getLocale()) as Locale) ?? "pt-BR";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        ShopFinder
      </Link>

      <h1 className="mb-2 text-3xl font-black tracking-tight">Guias de compra</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Conteúdo editorial independente para ajudar você a decidir antes de comparar preços.
      </p>

      <ul className="space-y-4">
        {GUIDES.map((guide) => {
          const title = guide.title[locale] ?? guide.title["pt-BR"];
          const summary = guide.summary[locale] ?? guide.summary["pt-BR"];
          return (
            <li key={guide.slug}>
              <Link
                href={`/guias/${guide.slug}`}
                className="block rounded-lg border border-border/40 p-4 transition-colors hover:border-emerald-500/40"
              >
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                  <Zap className="h-4 w-4 text-emerald-500" aria-hidden />
                  {title}
                </div>
                <p className="text-sm text-muted-foreground">{summary}</p>
                <p className="mt-1 text-xs text-muted-foreground">{guide.minutes} min</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
