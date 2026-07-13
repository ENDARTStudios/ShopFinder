/**
 * @workspace/domain/discovery — Discovery Pipeline (modular)
 * Split into submodules per user recommendation to avoid circular imports.
 *
 * Submodules:
 *   types.ts                  — All discovery contracts (jobs, signals, plans, events)
 *   planner.ts                — A2.1 Discovery Planner (signals → plans)
 *   orchestrator/             — A2.2 Discovery Orchestrator (plans → jobs)
 *   workers/                  — A2.3 Discovery Workers (jobs → NormalizedDiscoveredProduct[])
 *   raw-store/                — A2.4 Raw Product Store (append-only, payloadHash, compressed)
 *   normalizer/               — A2.5 Product Normalizer (Raw → NormalizedProductRecord, 7 stages)
 *   similarity/               — A2.6 Similarity & Duplicate Detection (evidence + clusters, discover only)
 *   resolution/               — A2.7 Duplicate Resolution (identity + builder, no catalog details)
 *   evaluation/               — A2.8 AI Evaluation (inference + decision + policy, separated)
 *   compliance/               — A2.9 Compliance PostCheck (score/documentation/certification/regional rules)
 *   catalog/                  — A2.10 Catalog Materializer + Publisher (SKU/slug/variants/SEO + multi-destination)
 *   search/                   — A2.11 Search Index (consumes events, independent from Publisher)
 *   marketplace-publication/  — A2.12 Marketplace Publication (PublicationPlan → MarketplaceListing)
 *   pricing/                  — A2.13 Pricing Execution (PricingSnapshot → PriceDecision, catalog immutable)
 *   ranking/                  — A2.14 Ranking (RankingRecord, catalog stays static)
 *   monitoring/               — A2.15 Monitoring (StageMetrics → BusinessMetrics aggregator)
 */

// Re-export everything from submodules
export * from "./types";
export * from "./traceability";
export * from "./planner";
export * from "./orchestrator";
export * from "./workers";
export * from "./raw-store";
export * from "./normalizer";
export * from "./similarity";
export * from "./resolution";
export * from "./evaluation";
export * from "./compliance";
export * from "./catalog";
export * from "./search";
export * from "./marketplace-publication";
export * from "./pricing";
export * from "./ranking";
export * from "./monitoring";
