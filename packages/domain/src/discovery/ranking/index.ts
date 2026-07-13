/**
 * @workspace/domain/discovery/ranking
 *
 * A2.14 — Ranking.
 *
 * The catalog stays static. RankingRecord is a separate artifact that
 * can change as many times as needed.
 *
 * Layout:
 *   types.ts       — RankingRecord, RankingPolicy, RankingFactor
 *   policies.ts    — Default + MarginFocused policies
 *   events.ts      — 2 events (BatchCompleted, RecordCreated)
 *   repository.ts  — In-memory RankingRepository (sorted by position)
 *   coordinator.ts — RankingCoordinator (score → sort → assign positions)
 */

export * from "./types";
export * from "./policies";
export * from "./events";
export * from "./repository";
export * from "./coordinator";
