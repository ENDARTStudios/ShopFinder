/**
 * @workspace/domain/discovery/pricing
 *
 * A2.13 — Pricing Execution.
 *
 * CatalogEntry stays immutable. PriceDecision is a separate artifact
 * enabling repricing, promotions, currency, region, marketplace variations.
 *
 * Layout:
 *   types.ts       — PricingSnapshot, PriceDecision, PricingPolicy
 *   snapshot.ts    — captureSnapshot (CatalogEntry → PricingSnapshot)
 *   policies.ts    — 3 policies (Standard, Promo, CompetitiveRepricing)
 *   events.ts      — 2 events (SnapshotCaptured, DecisionMade)
 *   repository.ts  — In-memory PricingRepository
 *   coordinator.ts — PricingCoordinator (snapshot → decide → events)
 */

export * from "./types";
export * from "./snapshot";
export * from "./policies";
export * from "./events";
export * from "./repository";
export * from "./coordinator";
