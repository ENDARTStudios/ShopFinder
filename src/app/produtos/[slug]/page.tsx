/**
 * ShopFinder — Product Detail Page
 *
 * Shows enriched product data with:
 *   - Specifications with authority badges (manufacturer/distributor/marketplace)
 *   - Confidence indicators per attribute
 *   - Evidence trail (collapsible) showing source URL, confidence, retrievedAt
 *   - Offers from multiple suppliers with price/stock/source type
 *   - Manufacturer info (if available from pipeline)
 *
 * This is the materialization of the Catalog Intelligence proposition:
 *   the user sees WHERE each piece of data came from and HOW MUCH to trust it.
 */
import { notFound } from "next/navigation";
import { prisma } from "@workspace/database/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@workspace/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck,
  Factory,
  Store,
  FileText,
  ChevronDown,
  Star,
  TrendingUp,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Network
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@workspace/seo/metadata";
import {
  buildProductJsonLd,
  buildBreadcrumbJsonLd,
  jsonLdScript,
  siteUrl
} from "@workspace/seo/schema";
import { CompatibleProducts } from "./compatible-products";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { PriceAlertForm } from "@/components/alerts/price-alert-form";
import { ProductViewRecorder, WishlistButton } from "@/components/site/product-extras";
import { CompareButton } from "@/components/site/compare-button";
import { AddToCartButton } from "@/components/site/add-to-cart-button";
import { Price, PriceRange } from "@/components/site/price";
import { ProductImage } from "@/components/site/product-image";
import { FadeIn } from "@/components/motion/fade-in";
import { FxNote } from "@/components/site/fx-note";
import { computePriceRange, minorUnitsToNumber } from "@/lib/price";
import { getUsdBrlRate } from "@/lib/fx-server";
import { buildAmazonOfferUrl } from "@/lib/amazon-affiliate";
import { formatInventoryCount, humanizeSpecName, supplierDisplayName } from "@/lib/spec-labels";
import { getLocale, getTranslations } from "next-intl/server";
import { preconnect } from "react-dom";

// ── Helpers ────────────────────────────────────────────────

interface EvidenceEntry {
  sourceType: string;
  sourceName: string;
  confidence: number;
  extractedValue: string;
  normalizedValue: string;
  url: string;
  retrievedAt: string;
}

function parseEvidence(jsonStr: string | null): EvidenceEntry[] {
  if (!jsonStr) return [];
  try {
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
}

function getSourceIcon(sourceType: string) {
  switch (sourceType) {
    case "manufacturer":
      return <Factory className="h-3.5 w-3.5" />;
    case "datasheet":
      return <FileText className="h-3.5 w-3.5" />;
    case "distributor":
      return <Store className="h-3.5 w-3.5" />;
    case "marketplace":
      return <Store className="h-3.5 w-3.5" />;
    default:
      return <ShieldCheck className="h-3.5 w-3.5" />;
  }
}

function getSourceColor(sourceType: string): string {
  switch (sourceType) {
    case "manufacturer":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "datasheet":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "distributor":
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30";
    case "marketplace":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    default:
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30";
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.95) return "text-emerald-500";
  if (confidence >= 0.8) return "text-blue-500";
  if (confidence >= 0.6) return "text-amber-500";
  return "text-red-500";
}

function getConfidenceLabelKey(confidence: number): string {
  if (confidence >= 0.95) return "confidenceHigh";
  if (confidence >= 0.8) return "confidenceGood";
  if (confidence >= 0.6) return "confidenceMedium";
  return "confidenceLow";
}

// ── Metadata ───────────────────────────────────────────────

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: { slug, deletedAt: null, status: "published" },
    select: {
      title: true,
      description: true,
      basePriceMinorUnits: true,
      offers: { where: { deletedAt: null }, select: { priceMinorUnits: true } }
    }
  });

  // Defesa em profundidade: o gate primário do 404 real (pré-flush do
  // streaming shell) vive no layout.tsx deste segmento (T032).
  if (!product) {
    notFound();
  }

  // T076 — og:title com nome + preço (a partir do menor preço das ofertas,
  // convertido pela taxa server-side com fallback).
  const prices = product.offers
    .map((o) => minorUnitsToNumber(o.priceMinorUnits))
    .filter((x) => x > 0);
  const minUsd =
    prices.length > 0 ? Math.min(...prices) : minorUnitsToNumber(product.basePriceMinorUnits);
  const rate = await getUsdBrlRate().catch(() => 5.5);
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    minUsd * rate
  );

  const meta = buildMetadata({
    title: product.title,
    description: product.description.slice(0, 160),
    path: `/produtos/${slug}`,
    image: siteUrl(`/produtos/${slug}/opengraph-image`)
  });

  return {
    ...meta,
    openGraph: {
      ...(meta.openGraph ?? {}),
      title: `${product.title} — a partir de ${brl}`
    }
  };
}

// ── Page ───────────────────────────────────────────────────

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  // T078 — pré-conexão aos hosts de imagem/foto (LCP das fotos nos cards de
  // oferta e na imagem principal).
  preconnect("https://mm.digikey.com");
  preconnect("https://i.ebayimg.com");
  preconnect("https://upload.wikimedia.org");
  const { slug } = await params;
  // T081 — sessão resolvida no servidor: o form de review só renderiza para
  // autenticado (SessionProvider só existe em /admin; aqui o gate é server-side).
  const session = await getServerSession(authOptions);
  const locale = await getLocale();
  const tDetail = await getTranslations("detail");

  const product = await prisma.product.findFirst({
    where: { slug, deletedAt: null, status: "published" },
    include: {
      category: true,
      variants: { where: { deletedAt: null } },
      media: { orderBy: { position: "asc" } },
      attributes: { orderBy: { name: "asc" } },
      offers: {
        include: { supplier: true },
        where: { deletedAt: null },
        orderBy: { priceMinorUnits: "asc" }
      }
    }
  });

  if (!product) {
    notFound();
  }

  const primaryMedia = product.media.find((m) => m.isPrimary) ?? product.media[0];
  const imageGradient = primaryMedia?.url?.startsWith("data:gradient;")
    ? primaryMedia.url.replace("data:gradient;", "")
    : "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)";
  const imageLabel = primaryMedia?.altText ?? product.title;
  // T071 — imagem real de ProductMedia tem prioridade sobre a busca Wikimedia
  const imageUrl = primaryMedia?.url?.startsWith("http") ? primaryMedia.url : null;

  // Separate enriched attributes (with source) from plain ones
  const enrichedAttrs = product.attributes.filter((a) => a.source !== null);
  const plainAttrs = product.attributes.filter((a) => a.source === null);

  // Calculate price range from offers
  const prices = product.offers.map((o) => minorUnitsToNumber(o.priceMinorUnits));
  const { min: minPrice, max: maxPrice } = computePriceRange(
    prices,
    minorUnitsToNumber(product.basePriceMinorUnits)
  );
  const totalStock = product.offers.reduce((sum, o) => sum + o.inventory, 0);
  const inStock = totalStock > 0;
  // T083 — preço corrente em BRL para a dica do alerta de preço (mesma taxa
  // server-side do FxNote/OG; cache de 1h).
  const rate = await getUsdBrlRate().catch(() => 5.5);
  const currentPriceBrl = minPrice * rate;
  // T069 — ofertas de marketplace (eBay) não expõem quantidade: sem dado de
  // estoque, não assertamos "Esgotado".
  const knownStock = product.offers.some((o) => (o.externalProvider ?? "") !== "ebay");

  // T063 — transparência: momento da última atualização dos dados exibidos.
  const updatedAtFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short"
  }).format(product.updatedAt);

  // Extract manufacturer from description (pipeline format: "Manufacturer: Intel Corporation")
  const manufacturerMatch = product.description.match(/Manufacturer:\s*(.+?)\./);
  const traceMatch = product.description.match(/Trace:\s*(\S+)/);
  const manufacturerName = manufacturerMatch?.[1] ?? null;
  const traceId = traceMatch?.[1] ?? null;
  const imageQuery =
    manufacturerName && !product.title.toLowerCase().startsWith(manufacturerName.toLowerCase())
      ? `${manufacturerName} ${product.title}`
      : product.title;

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD — docs/eng/SEO-AEO-AIO-GEO.md */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            buildProductJsonLd({
              name: product.title,
              description: product.description.slice(0, 500),
              sku: product.sku,
              brand: manufacturerName ?? undefined,
              price: minPrice,
              currencyCode: product.basePriceCurrencyCode || "USD",
              inStock,
              url: siteUrl(`/produtos/${product.slug}`)
            }),
            buildBreadcrumbJsonLd([
              { name: "Catálogo", url: siteUrl("/") },
              ...(product.category
                ? [{ name: product.category.name, url: siteUrl(`/#categorias`) }]
                : []),
              { name: product.title }
            ])
          ])
        }}
      />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {tDetail("backToCatalog")}
        </Link>

        {/* Header */}
        <FadeIn>
          <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Product image */}
            <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-2xl">
              <ProductImage
                query={imageQuery}
                gradient={imageGradient}
                label={imageLabel}
                src={imageUrl}
                className="absolute inset-0"
              />
            </div>

            {/* Title + meta */}
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline">{product.category?.name ?? tDetail("noCategory")}</Badge>
                {inStock ? (
                  <Badge className="bg-emerald-500/90 text-white">{tDetail("inStock")}</Badge>
                ) : knownStock ? (
                  <Badge className="bg-amber-500/90 text-white">{tDetail("outOfStock")}</Badge>
                ) : (
                  <Badge variant="outline">{tDetail("stockAtSupplier")}</Badge>
                )}
              </div>
              <h1 className="mb-2 text-3xl font-black tracking-tight">{product.title}</h1>
              {manufacturerName && (
                <p className="mb-3 text-sm text-muted-foreground">
                  {tDetail("manufacturer")}{" "}
                  <span className="font-medium text-foreground">{manufacturerName}</span>
                </p>
              )}
              <div className="flex items-end gap-4">
                <div>
                  <PriceRange min={minPrice} max={maxPrice} currency="USD" size="large" />
                  <span className="text-xs text-muted-foreground">
                    {tDetail("offersCount", { count: product.offers.length })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  {tDetail("unitsInStock", { count: formatInventoryCount(totalStock, locale) })}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <AddToCartButton
                  sku={product.sku}
                  title={product.title}
                  price={minPrice}
                  currency={product.basePriceCurrencyCode || "USD"}
                  imageLabel={imageLabel}
                  size="default"
                  className="bg-emerald-500 hover:bg-emerald-600"
                />
                <CompareButton slug={product.slug} size="default" navigateOnAdd />
              </div>
              {/* T083 — alerta de preço: "avisar quando ≤ R$ X" (in-app) */}
              <PriceAlertForm
                productId={product.id}
                isAuthenticated={Boolean(session)}
                currentPriceBrl={currentPriceBrl}
              />
              {/* NOVA_DIRECAO A3 — wishlist por conta */}
              <div className="mt-3">
                <WishlistButton productId={product.id} isAuthenticated={Boolean(session)} />
              </div>
              {/* NOVA_DIRECAO A2 — grava o view no histórico local */}
              <ProductViewRecorder
                slug={product.slug}
                title={product.title}
                category={product.category?.name ?? null}
              />
              {traceId && (
                <p className="mt-2 font-mono text-[10px] text-muted-foreground/60">
                  {tDetail("pipelineTrace")} {traceId}
                </p>
              )}
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: Specs + Evidence */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enriched Specifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  {tDetail("enrichedSpecs")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {enrichedAttrs.length > 0 ? (
                  <div className="space-y-3">
                    {enrichedAttrs.map((attr) => {
                      const evidence = parseEvidence(attr.evidence);
                      const confidence = attr.confidence ?? 0;
                      return (
                        <div key={attr.id} className="rounded-lg border border-border/40 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="text-xs text-muted-foreground">
                                {humanizeSpecName(attr.name, locale)}
                              </div>
                              <div className="font-medium">{attr.value}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${getSourceColor(attr.source ?? "")}`}
                              >
                                {getSourceIcon(attr.source ?? "")}
                                <span className="ml-1">{attr.sourceName}</span>
                              </Badge>
                              <div
                                className={`text-xs font-medium ${getConfidenceColor(confidence)}`}
                              >
                                {tDetail(getConfidenceLabelKey(confidence))}
                              </div>
                            </div>
                          </div>

                          {/* Confidence bar */}
                          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${
                                confidence >= 0.95
                                  ? "bg-emerald-500"
                                  : confidence >= 0.8
                                    ? "bg-blue-500"
                                    : confidence >= 0.6
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                              }`}
                              style={{ width: `${confidence * 100}%` }}
                            />
                          </div>

                          {/* Evidence trail (collapsible) */}
                          {evidence.length > 0 && (
                            <details className="mt-2">
                              <summary className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                <ChevronDown className="h-3 w-3" />
                                {tDetail("evidenceSources", { count: evidence.length })}
                              </summary>
                              <div className="mt-2 space-y-2">
                                {evidence.map((ev, i) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-2 rounded-md bg-muted/30 p-2 text-xs"
                                  >
                                    <Badge
                                      variant="outline"
                                      className={`shrink-0 text-[10px] ${getSourceColor(ev.sourceType)}`}
                                    >
                                      {getSourceIcon(ev.sourceType)}
                                      <span className="ml-1">{ev.sourceName}</span>
                                    </Badge>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{ev.normalizedValue}</span>
                                        <span className={getConfidenceColor(ev.confidence)}>
                                          {(ev.confidence * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                      <a
                                        href={ev.url}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-blue-500 hover:underline"
                                      >
                                        <ExternalLink className="h-2.5 w-2.5" />
                                        {ev.url.length > 60 ? ev.url.slice(0, 60) + "..." : ev.url}
                                      </a>
                                      <div className="text-[10px] text-muted-foreground">
                                        {tDetail("retrievedAt")}{" "}
                                        {new Date(ev.retrievedAt).toLocaleString(locale)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{tDetail("noEnrichment")}</p>
                )}
              </CardContent>
            </Card>

            {/* Plain attributes (from seed, without evidence) */}
            {plainAttrs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{tDetail("additionalSpecs")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {plainAttrs.map((attr) => (
                      <div
                        key={attr.id}
                        className="flex justify-between rounded-md bg-muted/20 px-3 py-1.5 text-xs"
                      >
                        <span className="text-muted-foreground">
                          {humanizeSpecName(attr.name, locale)}
                        </span>
                        <span className="font-medium">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column: Offers */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Store className="h-4 w-4" />
                  {tDetail("supplierOffers")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {product.offers.length > 0 ? (
                  <div className="space-y-3">
                    {product.offers.map((offer) => {
                      const price = minorUnitsToNumber(offer.priceMinorUnits);
                      const supplierName = supplierDisplayName(offer.supplier.name);
                      const isLowest = price === minPrice;
                      return (
                        <div
                          key={offer.id}
                          className={`rounded-lg border p-3 ${isLowest ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/40"}`}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-medium text-sm">{supplierName}</span>
                            {isLowest && (
                              <Badge className="bg-emerald-500/90 text-white text-[10px]">
                                {tDetail("bestPrice")}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <Price amount={price} currency="USD" />
                              <div className="text-xs text-muted-foreground">
                                {offer.inventory > 0
                                  ? tDetail("inStockCount", {
                                      count: formatInventoryCount(offer.inventory, locale)
                                    })
                                  : (offer.externalProvider ?? "") === "ebay"
                                    ? tDetail("stockAtSupplier")
                                    : tDetail("outOfStockCount")}
                              </div>
                            </div>
                            <div className="text-right text-[10px] text-muted-foreground">
                              <div>
                                {tDetail("shipsFrom")} {offer.shipsFromCountry}
                              </div>
                              <div>
                                {tDetail("fulfillmentDays", {
                                  min: offer.fulfillmentDaysMin,
                                  max: offer.fulfillmentDaysMax
                                })}
                              </div>
                            </div>
                          </div>
                          {/* T071 — link de saída com tag de Associado (somente
                              Amazon; URL montada idempotentemente server-side). */}
                          {(() => {
                            const offerUrl =
                              (offer.externalProvider ?? "") === "amazon"
                                ? buildAmazonOfferUrl(offer.externalId ?? "")
                                : null;
                            return offerUrl ? (
                              <a
                                href={offerUrl}
                                target="_blank"
                                rel="sponsored noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-500 hover:underline"
                              >
                                {tDetail("viewOnAmazon")}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : null;
                          })()}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{tDetail("noOffers")}</p>
                )}

                {/* T071 — disclosure de afiliado (CDC art. 36): publicidade
                    identificável quando a oferta é Amazon/Associado. */}
                {product.offers.some((o) => (o.externalProvider ?? "") === "amazon") && (
                  <p className="mt-4 border-t border-border/40 pt-3 text-[11px] leading-relaxed text-muted-foreground">
                    {tDetail("affiliateDisclosure")}
                  </p>
                )}

                {/* T063 — transparência da oferta: fonte por oferta (nome do
                    fornecedor em cada card), momento do câmbio usado na conversão
                    para BRL e timestamp da última atualização dos dados. */}
                {product.offers.length > 0 && (
                  <div className="mt-4 space-y-1 border-t border-border/40 pt-3 text-[11px] leading-relaxed text-muted-foreground">
                    <FxNote />
                    <p>{tDetail("shippingNote")}</p>
                    <p>{tDetail("updatedAt", { when: updatedAtFmt })}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trust indicator */}
            {enrichedAttrs.length > 0 && (
              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {tDetail("enrichedBadge")}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {tDetail("enrichedDescription", {
                          count: enrichedAttrs.length,
                          manufacturer: manufacturerName ?? tDetail("noManufacturer")
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Separator className="my-8" />

        {/* Knowledge Graph: Compatible Products */}
        <CompatibleProducts slug={slug} />

        {/* T081 — reviews com moderação básica (1 review/user/produto) */}
        <Separator className="my-8" />
        <ReviewsSection productId={product.id} isAuthenticated={Boolean(session)} />

        <Separator className="my-8" />

        {/* Footer info */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>
            {tDetail("sku")} <span className="font-mono">{product.sku}</span>
          </div>
          {product.category?.description && (
            <div>
              {tDetail("niche")}{" "}
              {(() => {
                try {
                  return JSON.parse(product.category.description).nicheId ?? "—";
                } catch {
                  return "—";
                }
              })()}
            </div>
          )}
          <div>{tDetail("updatedAt", { when: updatedAtFmt })}</div>
        </div>
      </div>
    </div>
  );
}
