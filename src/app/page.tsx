import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@workspace/seo/metadata";
import { buildFaqJsonLd, jsonLdScript } from "@workspace/seo/schema";
import { Landing } from "@/components/site/landing";
import { PROJECT_META } from "@/components/site/data";
// Workspace alias sanity import — verifies @workspace/* resolution at build time.
// Remove when the first real consumer lands.
import "@workspace/shared";

interface FaqItem {
  q: string;
  a: string;
}

// ── Metadata (docs/eng/SEO-AEO-AIO-GEO.md) ─────────────────

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hero");
  return buildMetadata({
    title: `${PROJECT_META.name} — ${t("tagline")}`,
    description: t("subtitle"),
    path: "/",
    keywords: [
      "comparador de preços",
      "hardware",
      "eletrônicos",
      "componentes eletrônicos",
      "catalog intelligence"
    ]
  });
}

// ── Page ───────────────────────────────────────────────────

export default async function Home() {
  // FAQPage JSON-LD espelha a seção visível na landing (mesma fonte
  // de mensagens i18n) — requisito do Google para rich results.
  const t = await getTranslations("faq");
  const faqs = (t.raw("items") as FaqItem[]).map(({ q, a }) => ({
    question: q,
    answer: a
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(buildFaqJsonLd(faqs)) }}
      />
      <Landing />
    </>
  );
}
