import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Zap } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { GUIDES, getGuide } from "@/content/guides";
import { buildMetadata } from "@workspace/seo/metadata";

type Locale = "pt-BR" | "en" | "es-ES";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  return buildMetadata({
    title: guide ? guide.title["pt-BR"] : "Guias",
    description: guide?.summary["pt-BR"] ?? "Guias de compra ShopFinder",
    path: `/guias/${slug}`,
    noIndex: false
  });
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const locale = ((await getLocale()) as Locale) ?? "pt-BR";
  const t = await getTranslations("guides");
  const title = guide.title[locale] ?? guide.title["pt-BR"];
  const summary = guide.summary[locale] ?? guide.summary["pt-BR"];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/guias"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToGuides")}
      </Link>

      <h1 className="mb-2 text-3xl font-black tracking-tight">{title}</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {summary} · {t("minutes", { count: guide.minutes })}
      </p>

      <article className="space-y-4">
        {guide.body.map((paragraph, i) => (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground first:text-foreground">
            {paragraph}
          </p>
        ))}
      </article>

      <div className="mt-10 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
        {t("ctaCatalog")}{" "}
        <Link href="/" className="font-medium underline underline-offset-4">
          {t("ctaCatalogLink")}
        </Link>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}
