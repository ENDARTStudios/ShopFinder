/**
 * @workspace/domain/discovery/resolution
 *
 * Barrel exports for Duplicate Resolution (A2.7).
 *
 * Design principle: Resolution answers ONLY "which records represent the
 * same entity?" — it does NOT answer "what should the canonical product
 * look like?" That's the CanonicalBuilder's job.
 *
 * 5 contracts:
 *   1. CanonicalIdentity   — consolidated identity (id + members + primary)
 *   2. ResolutionEvidence  — explainability (which source for each field)
 *   3. ResolutionPolicy    — swappable strategy (5 implementations)
 *   4. ConflictRecord      — clusters that can't be auto-resolved
 *   5. CanonicalBuilder    — materializes CanonicalProduct from identity
 *
 * Flow: DuplicateCandidatesDetected → SimilarityClusterCreated →
 *   CanonicalIdentityResolved (or ConflictDetected) →
 *   CanonicalProductBuilt → CanonicalProductReadyForEvaluation →
 *   A2.8 AI Evaluation (consumes only canonical products)
 *
 * Layout:
 *   types.ts         — 5 contract interfaces
 *   policies.ts      — 5 ResolutionPolicy implementations
 *   conflicts.ts     — ConflictDetector (6 conflict reasons)
 *   builder.ts       — DefaultCanonicalBuilder
 *   events.ts        — 4 events
 *   repository.ts    — In-memory ResolutionRepository (append-only)
 *   coordinator.ts   — ResolutionCoordinator (resolve → identity/conflict → build)
 *   resolution.test.ts — Tests covering all acceptance criteria
 */

export * from "./types";
export * from "./policies";
export * from "./conflicts";
export * from "./builder";
export * from "./events";
export * from "./repository";
export * from "./coordinator";
