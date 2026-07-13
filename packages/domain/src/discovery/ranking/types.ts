/**
 * @workspace/domain/discovery/ranking/types
 *
 * A2.14 — Ranking.
 *
 * The catalog stays static. Ranking is a separate RankingRecord artifact
 * that can change as many times as needed without recreating the catalog.
 */
import type { BrandedId } from "../../shared";
import type { CatalogEntryId, CatalogEntry } from "../catalog/types";
import type { ProductScore } from "../evaluation/types";

export type RankingRecordId = BrandedId<"RankingRecordId">;
export type RankingBatchId = BrandedId<"RankingBatchId">;

export interface RankingRecord {
  readonly id: RankingRecordId;
  readonly productId: CatalogEntryId;
  readonly score: ProductScore;
  readonly rankingPosition: number;
  readonly rankingVersion: string;
  readonly factors: ReadonlyArray<RankingFactor>;
  readonly generatedAt: Date;
  readonly batchId: RankingBatchId;
  readonly schemaVersion: "1.0.0";
}

export interface RankingFactor {
  readonly name: string;
  readonly weight: number;
  readonly value: number;
  readonly contribution: number;
}

export interface RankingPolicy {
  readonly id: string;
  readonly version: string;
  score(entry: CatalogEntry): { score: ProductScore; factors: ReadonlyArray<RankingFactor> };
}

export interface RankingRepository {
  appendBatch(records: ReadonlyArray<RankingRecord>): Promise<ReadonlyArray<RankingRecord>>;
  findRecord(id: RankingRecordId): Promise<RankingRecord | null>;
  findRecordsByProduct(productId: CatalogEntryId): Promise<ReadonlyArray<RankingRecord>>;
  getTopRanked(limit: number): Promise<ReadonlyArray<RankingRecord>>;
  readonly recordCount: number;
}

export interface RankingCoordinatorInput {
  readonly batchId: string;
  readonly catalogEntries: ReadonlyArray<CatalogEntry>;
}

export interface RankingCoordinatorResult {
  readonly batchId: RankingBatchId;
  readonly records: ReadonlyArray<RankingRecord>;
  readonly metrics: RankingMetrics;
  readonly durationMs: number;
}

export interface RankingMetrics {
  readonly productsRanked: number;
  readonly averageScore: number;
  readonly topScore: number;
  readonly durationMs: number;
}

export type { CatalogEntryId, CatalogEntry, ProductScore };
