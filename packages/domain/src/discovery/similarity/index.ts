/**
 * @workspace/domain/discovery/similarity
 *
 * Barrel exports for the Product Similarity & Duplicate Detection module (A2.6).
 *
 * Design principles:
 *   - R6: SimilarityEvidence — per-dimension scores for explainability
 *   - R7: SimilarityPolicy — configurable thresholds (never hardcoded)
 *   - R8: Candidate Clusters — Union-Find forms groups, not just pairs
 *   - R9: 8 similarity metrics tracked
 *   - R10: Discovers only, never resolves (A2.7 resolves)
 *
 * Roadmap: A2.7 = Duplicate Resolution, A2.8 = AI Evaluation (inverted).
 * The IA evaluates only the canonical product, reducing inference cost.
 *
 * Layout:
 *   types.ts         — DuplicateCandidate, SimilarityCluster, SimilarityEvidence, SimilarityPolicy
 *   algorithms.ts    — 5 similarity algorithms (title/brand/image/attribute/price)
 *   policy.ts        — evaluatePolicy + computeOverallSimilarity
 *   clustering.ts    — Union-Find cluster formation
 *   metrics.ts       — 8 similarity metrics
 *   events.ts        — 4 events (Started/Completed/CandidatesDetected/ClustersCreated)
 *   repository.ts    — In-memory SimilarityRepository (append-only)
 *   coordinator.ts   — SimilarityCoordinator (compare pairs → candidates → clusters)
 *   similarity.test.ts — Tests covering all 10 refinements
 */

export * from "./types";
export * from "./algorithms";
export * from "./policy";
export * from "./clustering";
export * from "./metrics";
export * from "./events";
export * from "./repository";
export * from "./coordinator";
