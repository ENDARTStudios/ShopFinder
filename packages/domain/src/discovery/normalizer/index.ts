/**
 * @workspace/domain/discovery/normalizer
 *
 * Barrel exports for the Product Normalizer module (A2.5).
 *
 * Design principles:
 *   - Produces a NEW artifact (NormalizedProductRecord), never modifies Raw
 *   - semanticHash lives here, not on Raw
 *   - Full normalizer versioning (normalizer + taxonomy + dictionary + translation)
 *   - 7 swappable stages (Title/Brand/Category/Attribute/Image/Price/SemanticHasher)
 *   - Marketplace-agnostic canonical attributes (COLOR, not AliExpressColor)
 *   - Price normalized to bands (0-10, 10-20, ...) not absolute
 *   - Perceptual hash (phash) for image deduplication
 *   - 9 quality metrics tracked
 *   - 4 events: Started, Completed, ProductsCreated, SemanticHashesGenerated
 *
 * Layout:
 *   types.ts                 — NormalizedProductRecord + interfaces
 *   canonical-attributes.ts  — Marketplace-agnostic attribute dictionary
 *   price-bands.ts           — Price band classification
 *   image-hash.ts            — Perceptual hash (phash) interface + stub
 *   stages.ts                — 7 stage interfaces + default implementations
 *   events.ts                — 4 event types + factories
 *   metrics.ts               — NormalizationMetricsCollector (9 counters)
 *   repository.ts            — InMemoryNormalizedProductRepository (append-only)
 *   normalizer.ts            — DefaultProductNormalizer (orchestrates 7 stages)
 *   coordinator.ts           — NormalizationCoordinator (batch + events)
 *   normalizer.test.ts       — Tests covering all 10 refinements
 */

export * from "./types";
export * from "./canonical-attributes";
export * from "./price-bands";
export * from "./image-hash";
export * from "./stages";
export * from "./events";
export * from "./metrics";
export * from "./repository";
export * from "./normalizer";
export * from "./coordinator";
