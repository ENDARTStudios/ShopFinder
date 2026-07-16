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
import { CompatibleProducts } from "./compatible-products";

// ── Helpers ────────────────────────────────────────────────

function minorUnitsToUSD(minor: bigint): number {
  return Number(minor) / 100;
}

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
    case "manufacturer": return <Factory className="h-3.5 w-3.5" />;
    case "datasheet": return <FileText className="h-3.5 w-3.5" />;
    case "distributor": return <Store className="h-3.5 w-3.5" />;
    case "marketplace": return <Store className="h-3.5 w-3.5" />;
    default: return <ShieldCheck className="h-3.5 w-3.5" />;
  }
}

function getSourceColor(sourceType: string): string {
  switch (sourceType) {
    case "manufacturer": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "datasheet": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "distributor": return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30";
    case "marketplace": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    default: return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30";
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.95) return "text-emerald-500";
  if (confidence >= 0.80) return "text-blue-500";
  if (confidence >= 0.60) return "text-amber-500";
  return "text-red-500";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.95) return "Alta confiabilidade";
  if (confidence >= 0.80) return "Boa confiabilidade";
  if (confidence >= 0.60) return "Confiança média";
  return "Baixa confiabilidade";
}

// ── Metadata ───────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: { slug, deletedAt: null, status: "published" },
    select: { title: true, description: true }
  });

  if (!product) {
    return { title: "Produto não encontrado · ShopFinder" };
  }

  return {
    title: `${product.title} · ShopFinder`,
    description: product.description.slice(0, 160)
  };
}

// ── Page ───────────────────────────────────────────────────

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

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

  // Separate enriched attributes (with source) from plain ones
  const enrichedAttrs = product.attributes.filter((a) => a.source !== null);
  const plainAttrs = product.attributes.filter((a) => a.source === null);

  // Calculate price range from offers
  const prices = product.offers.map((o) => minorUnitsToUSD(o.priceMinorUnits));
  const minPrice = prices.length > 0 ? Math.min(...prices) : minorUnitsToUSD(product.basePriceMinorUnits);
  const maxPrice = prices.length > 0 ? Math.max(...prices) : minorUnitsToUSD(product.basePriceMinorUnits);
  const totalStock = product.offers.reduce((sum, o) => sum + o.inventory, 0);
  const inStock = totalStock > 0;

  // Extract manufacturer from description (pipeline format: "Manufacturer: Intel Corporation")
  const manufacturerMatch = product.description.match(/Manufacturer:\s*(.+?)\./);
  const traceMatch = product.description.match(/Trace:\s*(\S+)/);
  const manufacturerName = manufacturerMatch?.[1] ?? null;
  const traceId = traceMatch?.[1] ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao catálogo
        </Link>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Product image */}
          <div
            className="flex h-48 w-48 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: imageGradient }}
          >
            <span className="text-lg font-bold text-white/90">{imageLabel}</span>
          </div>

          {/* Title + meta */}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">{product.category?.name ?? "Sem categoria"}</Badge>
              {inStock ? (
                <Badge className="bg-emerald-500/90 text-white">Em estoque</Badge>
              ) : (
                <Badge className="bg-amber-500/90 text-white">Esgotado</Badge>
              )}
            </div>
            <h1 className="mb-2 text-3xl font-black tracking-tight">{product.title}</h1>
            {manufacturerName && (
              <p className="mb-3 text-sm text-muted-foreground">
                Fabricante: <span className="font-medium text-foreground">{manufacturerName}</span>
              </p>
            )}
            <div className="flex items-end gap-4">
              <div>
                <div className="text-3xl font-bold">${minPrice.toFixed(2)}</div>
                {maxPrice > minPrice && (
                  <div className="text-sm text-muted-foreground">
                    até ${maxPrice.toFixed(2)} em {product.offers.length} ofertas
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                {totalStock.toLocaleString()} unidades em estoque
              </div>
            </div>
            {traceId && (
              <p className="mt-2 font-mono text-[10px] text-muted-foreground/60">
                Pipeline trace: {traceId}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: Specs + Evidence */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enriched Specifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  Especificações com Autoridade
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
                              <div className="text-xs text-muted-foreground">{attr.name}</div>
                              <div className="font-medium">{attr.value}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="outline" className={`text-[10px] ${getSourceColor(attr.source ?? "")}`}>
                                {getSourceIcon(attr.source ?? "")}
                                <span className="ml-1">{attr.sourceName}</span>
                              </Badge>
                              <div className={`text-xs font-medium ${getConfidenceColor(confidence)}`}>
                                {getConfidenceLabel(confidence)}
                              </div>
                            </div>
                          </div>

                          {/* Confidence bar */}
                          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${
                                confidence >= 0.95 ? "bg-emerald-500" :
                                confidence >= 0.80 ? "bg-blue-500" :
                                confidence >= 0.60 ? "bg-amber-500" : "bg-red-500"
                              }`}
                              style={{ width: `${confidence * 100}%` }}
                            />
                          </div>

                          {/* Evidence trail (collapsible) */}
                          {evidence.length > 0 && (
                            <details className="mt-2">
                              <summary className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                <ChevronDown className="h-3 w-3" />
                                {evidence.length} fonte(s) de evidência
                              </summary>
                              <div className="mt-2 space-y-2">
                                {evidence.map((ev, i) => (
                                  <div key={i} className="flex items-start gap-2 rounded-md bg-muted/30 p-2 text-xs">
                                    <Badge variant="outline" className={`shrink-0 text-[10px] ${getSourceColor(ev.sourceType)}`}>
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
                                        Obtido em: {new Date(ev.retrievedAt).toLocaleString("pt-BR")}
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
                  <p className="text-sm text-muted-foreground">
                    Dados enriquecidos em processamento. Este produto ainda não passou pelo pipeline de enriquecimento.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Plain attributes (from seed, without evidence) */}
            {plainAttrs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Especificações adicionais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {plainAttrs.map((attr) => (
                      <div key={attr.id} className="flex justify-between rounded-md bg-muted/20 px-3 py-1.5 text-xs">
                        <span className="text-muted-foreground">{attr.name}</span>
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
                  Ofertas de Fornecedores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {product.offers.length > 0 ? (
                  <div className="space-y-3">
                    {product.offers.map((offer) => {
                      const price = minorUnitsToUSD(offer.priceMinorUnits);
                      const supplierName = offer.supplier.name;
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
                                Melhor preço
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <div className="text-xl font-bold">${price.toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">
                                {offer.inventory > 0
                                  ? `${offer.inventory.toLocaleString()} em estoque`
                                  : "Sem estoque"}
                              </div>
                            </div>
                            <div className="text-right text-[10px] text-muted-foreground">
                              <div>Envio: {offer.shipsFromCountry}</div>
                              <div>{offer.fulfillmentDaysMin}-{offer.fulfillmentDaysMax} dias</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma oferta disponível.</p>
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
                        Produto enriquecido pelo pipeline
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {enrichedAttrs.length} atributos validados com evidências de {manufacturerName ?? "fabricante"}.
                        Cada especificação tem origem rastreada e nível de confiança.
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

        <Separator className="my-8" />

        {/* Footer info */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>
            SKU: <span className="font-mono">{product.sku}</span>
          </div>
          {product.category?.description && (
            <div>
              Nicho: {(() => {
                try { return JSON.parse(product.category.description).nicheId ?? "—"; }
                catch { return "—"; }
              })()}
            </div>
          )}
          <div>
            Atualizado: {product.updatedAt.toLocaleString("pt-BR")}
          </div>
        </div>
      </div>
    </div>
  );
}
