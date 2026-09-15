/**
 * Testes unitários dos builders JSON-LD de @workspace/seo/schema (#33)
 * — docs/eng/SEO-AEO-AIO-GEO.md.
 */
import { describe, expect, test } from "bun:test";
import {
  buildProductJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  jsonLdScript
} from "../../packages/seo/src/schema";

describe("buildProductJsonLd", () => {
  test("Product+Offer com campos completos", () => {
    const ld = buildProductJsonLd({
      name: "Intel Core i9-14900K",
      description: "Processador de 24 núcleos.",
      sku: "BX8071514900K",
      brand: "Intel",
      price: 19.99,
      currencyCode: "BRL",
      inStock: true,
      url: "https://example.com/produtos/i9"
    });

    expect(ld["@type"]).toBe("Product");
    expect(ld.name).toBe("Intel Core i9-14900K");
    expect(ld.brand).toEqual({ "@type": "Brand", name: "Intel" });
    expect(ld.offers).toMatchObject({
      "@type": "Offer",
      price: "19.99",
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      url: "https://example.com/produtos/i9"
    });
  });

  test("campos opcionais omitidos não viram null/undefined no JSON", () => {
    const ld = buildProductJsonLd({
      name: "Produto",
      price: 100,
      currencyCode: "USD",
      inStock: false,
      url: "https://example.com/p"
    });

    expect(ld.sku).toBeUndefined();
    expect(ld.brand).toBeUndefined();
    expect((ld.offers as Record<string, unknown>).availability).toBe(
      "https://schema.org/OutOfStock"
    );
    expect(JSON.stringify(ld)).not.toContain("null");
  });

  test("preço inteiro serializa com 2 casas", () => {
    const ld = buildProductJsonLd({
      name: "P",
      price: 42,
      currencyCode: "BRL",
      inStock: true,
      url: "https://example.com/p"
    });
    expect((ld.offers as Record<string, unknown>).price).toBe("42.00");
  });
});

describe("buildBreadcrumbJsonLd", () => {
  test("posições sequenciais a partir de 1", () => {
    const ld = buildBreadcrumbJsonLd([
      { name: "Catálogo", url: "https://example.com/" },
      { name: "CPUs" },
      { name: "Intel Core i9" }
    ]);

    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Catálogo", item: "https://example.com/" },
      { "@type": "ListItem", position: 2, name: "CPUs" },
      { "@type": "ListItem", position: 3, name: "Intel Core i9" }
    ]);
  });
});

describe("buildFaqJsonLd", () => {
  test("FAQPage com Question/acceptedAnswer", () => {
    const ld = buildFaqJsonLd([{ question: "Como funciona?", answer: "Assim." }]);

    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity).toEqual([
      {
        "@type": "Question",
        name: "Como funciona?",
        acceptedAnswer: { "@type": "Answer", text: "Assim." }
      }
    ]);
  });
});

describe("jsonLdScript", () => {
  test("escapa `<` para impedir breakout de script", () => {
    const out = jsonLdScript(buildFaqJsonLd([{ question: "</script><b>x", answer: "y" }]));
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
    // JSON permanece parseável após unescape
    expect(() => JSON.parse(out.replace(/\\u003c/g, "<"))).not.toThrow();
  });
});
