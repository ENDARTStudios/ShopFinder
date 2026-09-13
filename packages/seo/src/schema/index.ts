/**
 * @workspace/seo/schema
 *
 * Schema.org JSON-LD builders (docs/eng/SEO-AEO-AIO-GEO.md):
 * Product+Offer, BreadcrumbList e FAQPage. Objetos puros (sem dependência
 * de React/Next) para rodar em server components, scripts e testes.
 */

export interface JsonLdObject {
  "@context": "https://schema.org";
  "@type": string;
  [key: string]: unknown;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

/** URL absoluta de uma rota do site (para `item`/`url` de schema.org). */
export function siteUrl(path = "/"): string {
  return `${SITE_URL}${path}`;
}

export function buildProductJsonLd(params: {
  name: string;
  description?: string;
  sku?: string;
  brand?: string;
  image?: string;
  /** Preço em major units (ex.: 19.99) — sempre serializado com 2 casas. */
  price: number;
  /** ISO 4217 (ex.: BRL, USD). */
  currencyCode: string;
  inStock: boolean;
  url: string;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: params.name,
    ...(params.description ? { description: params.description } : {}),
    ...(params.sku ? { sku: params.sku } : {}),
    ...(params.image ? { image: [params.image] } : {}),
    ...(params.brand ? { brand: { "@type": "Brand", name: params.brand } } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: params.currencyCode,
      price: params.price.toFixed(2),
      availability: params.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: params.url
    }
  };
}

export function buildBreadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; url?: string }>
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {})
    }))
  };
}

export function buildFaqJsonLd(
  faqs: ReadonlyArray<{ question: string; answer: string }>
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer }
    }))
  };
}

/**
 * Serializa JSON-LD para `<script type="application/ld+json">`.
 * Escapa `<` para impedir breakout de `</script>` (dados vêm do catálogo).
 */
export function jsonLdScript(obj: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
