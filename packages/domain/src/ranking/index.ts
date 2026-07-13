/** @workspace/domain/ranking — Ranking Engine */
export interface RankingSignal {
  readonly id: string;
  readonly entityType: "product" | "supplier" | "niche";
  readonly entityId: string;
  readonly signalType: string;
  readonly value: number;
  readonly weight: number;
}
export interface RankingResult {
  readonly entityId: string;
  readonly rank: number;
  readonly score: number;
}
export interface RankingEngine {
  rank(params: { entityType: string; limit?: number }): Promise<RankingResult[]>;
  getTopRanked(type: string, limit?: number): Promise<RankingResult[]>;
}
