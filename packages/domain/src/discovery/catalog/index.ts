/**
 * @workspace/domain/discovery/catalog
 *
 * Barrel exports for Catalog Materializer + Publisher (A2.10).
 *
 * Separation:
 *   - Materializer: CanonicalProduct → CatalogEntry (SKU, slug, variants, SEO)
 *   - Publisher: CatalogEntry → persist + index + publish events
 *
 * This allows publishing to different destinations (internal, Shopify,
 * WooCommerce, Mercado Livre, Amazon) without changing materialization.
 *
 * Layout:
 *   types.ts         — CatalogEntry, CatalogMaterializer, CatalogPublisher
 *   materializer.ts  — DefaultCatalogMaterializer (SKU/slug/variants/SEO/pricing)
 *   publisher.ts     — DefaultCatalogPublisher (multi-destination)
 *   events.ts        — 3 events (EntryCreated/Published/PublicationFailed)
 *   repository.ts    — In-memory CatalogRepository (append-only)
 *   coordinator.ts   — CatalogCoordinator (materialize → publish → events)
 */

export * from "./types";
export * from "./materializer";
export * from "./publisher";
export * from "./events";
export * from "./repository";
export * from "./coordinator";
