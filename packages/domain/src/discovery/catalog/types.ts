/**
 * @workspace/domain/discovery/catalog/types
 *
 * Type contracts for Catalog Materializer + Publisher (A2.10).
 *
 * Design principle (per architectural review):
 *   Separate Materializer from Publisher.
 *   - Materializer: CanonicalProduct → CatalogEntry (SKU, slug, variants, SEO, URLs, media)
 *   - Publisher: CatalogEntry → persist + index + publish events
 *
 * This allows publishing to different destinations (internal catalog,
 * Shopify, WooCommerce, Mercado Livre, Amazon) without changing
 * materialization.
 */
import type { BrandedId } from "../../shared";
import type { Money } from "../../shared";
import type { CanonicalProductId, CanonicalProduct } from "../resolution/types";
import type { EvaluationResult } from "../evaluation/types";
import type { CompliancePostCheckResult } from "../compliance/types";

// ── Branded IDs ────────────────────────────────────────────

export type CatalogEntryId = BrandedId<"CatalogEntryId">;
export type CatalogPublicationId = BrandedId<"CatalogPublicationId">;

// ── CatalogEntry (materialized product) ────────────────────

export interface CatalogEntry {
  readonly id: CatalogEntryId;
  readonly canonicalProductId: CanonicalProductId;
  readonly sku: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly brand: string;
  readonly canonicalBrandId: string | null;
  readonly category: string;
  readonly canonicalCategoryId: string | null;
  readonly attributes: ReadonlyArray<CatalogAttribute>;
  readonly variants: ReadonlyArray<CatalogVariant>;
  readonly images: ReadonlyArray<CatalogImage>;
  readonly seo: CatalogSEO;
  readonly pricing: CatalogPricing;
  readonly supplierCount: number;
  readonly offerCount: number;
  readonly evaluationSummary: EvaluationSummary;
  readonly materializedAt: Date;
  readonly materializerVersion: string;
  readonly schemaVersion: "1.0.0";
}

export interface CatalogAttribute {
  readonly name: string;
  readonly value: string;
  readonly sourceProductId: string;
}

export interface CatalogVariant {
  readonly sku: string;
  readonly name: string;
  readonly attributes: ReadonlyArray<{ name: string; value: string }>;
  readonly price: Money;
  readonly inventory: number;
}

export interface CatalogImage {
  readonly url: string;
  readonly alt: string;
  readonly fingerprint: { algorithm: string; version: string; value: string };
  readonly isPrimary: boolean;
}

export interface CatalogSEO {
  readonly metaTitle: string;
  readonly metaDescription: string;
  readonly keywords: ReadonlyArray<string>;
  readonly canonicalUrl: string;
}

export interface CatalogPricing {
  readonly minPrice: Money;
  readonly maxPrice: Money;
  readonly currency: string;
  readonly priceRangeLabel: string;
}

export interface EvaluationSummary {
  readonly overallScore: number;
  readonly recommendation: string;
  readonly confidence: number;
  readonly complianceStatus: string;
}

// ── CatalogMaterializer ────────────────────────────────────

export interface CatalogMaterializer {
  readonly name: string;
  readonly version: string;
  materialize(
    product: CanonicalProduct,
    evaluation: EvaluationResult,
    compliance: CompliancePostCheckResult
  ): CatalogEntry;
}

// ── CatalogPublisher ───────────────────────────────────────

export type PublicationDestination =
  "internal" | "shopify" | "woocommerce" | "mercadolivre" | "amazon";

export interface CatalogPublication {
  readonly id: CatalogPublicationId;
  readonly catalogEntryId: CatalogEntryId;
  readonly destination: PublicationDestination;
  readonly status: "published" | "failed" | "pending";
  readonly publishedAt: Date;
  readonly externalId?: string;
  readonly error?: string;
}

export interface CatalogPublisher {
  readonly name: string;
  publish(entry: CatalogEntry): Promise<CatalogPublication>;
}

// ── Repository ─────────────────────────────────────────────

export interface CatalogRepository {
  appendEntry(entry: CatalogEntry): Promise<CatalogEntry>;
  appendPublication(publication: CatalogPublication): Promise<CatalogPublication>;
  findEntry(id: CatalogEntryId): Promise<CatalogEntry | null>;
  findEntryByCanonicalProductId(productId: CanonicalProductId): Promise<CatalogEntry | null>;
  findEntryBySku(sku: string): Promise<CatalogEntry | null>;
  findEntryBySlug(slug: string): Promise<CatalogEntry | null>;
  streamEntries(filter?: CatalogStreamFilter): AsyncIterable<CatalogEntry>;
  readonly entryCount: number;
  readonly publicationCount: number;
}

export interface CatalogStreamFilter {
  readonly brand?: string;
  readonly category?: string;
}

// ── Coordinator ────────────────────────────────────────────

export interface CatalogCoordinatorInput {
  readonly batchId: string;
  readonly approved: ReadonlyArray<{
    product: CanonicalProduct;
    evaluation: EvaluationResult;
    compliance: CompliancePostCheckResult;
  }>;
  readonly destinations: ReadonlyArray<PublicationDestination>;
}

export interface CatalogCoordinatorResult {
  readonly batchId: string;
  readonly entries: ReadonlyArray<CatalogEntry>;
  readonly publications: ReadonlyArray<CatalogPublication>;
  readonly metrics: CatalogMetrics;
  readonly durationMs: number;
}

export interface CatalogMetrics {
  readonly productsMaterialized: number;
  readonly entriesCreated: number;
  readonly publicationsCreated: number;
  readonly publicationsFailed: number;
  readonly durationMs: number;
}

export type {
  CanonicalProductId,
  CanonicalProduct,
  EvaluationResult,
  CompliancePostCheckResult,
  Money
};
