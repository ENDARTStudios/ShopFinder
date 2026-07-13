/**
 * @workspace/domain/discovery/marketplace-publication
 *
 * A2.12 — Marketplace Publication.
 *
 * Introduces PublicationPlan as intermediate artifact. Shopify, Amazon,
 * Mercado Livre, WooCommerce consume the same contract.
 *
 * Layout:
 *   types.ts       — PublicationPlan, MarketplaceListing, ListingPolicy, MarketplacePublisher
 *   planner.ts     — PublicationPlanner (CatalogEntry → PublicationPlan[])
 *   publisher.ts   — StubMarketplacePublisher (per-destination)
 *   events.ts      — 3 events (PlanCreated, ListingPublished, ListingFailed)
 *   repository.ts  — In-memory PublicationRepository
 *   coordinator.ts — PublicationCoordinator (plan → publish → events)
 */

export * from "./types";
export * from "./planner";
export * from "./publisher";
export * from "./events";
export * from "./repository";
export * from "./coordinator";
