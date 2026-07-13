/**
 * @workspace/domain/discovery/ranking/repository
 */
import type { RankingRepository, RankingRecord, RankingRecordId, CatalogEntryId } from "./types";

class InMemoryRankingRepository implements RankingRepository {
  private readonly byId = new Map<string, RankingRecord>();
  private readonly byProduct = new Map<string, RankingRecord[]>();
  private allRecords: RankingRecord[] = [];

  async appendBatch(records: ReadonlyArray<RankingRecord>): Promise<ReadonlyArray<RankingRecord>> {
    const appended: RankingRecord[] = [];
    for (const r of records) {
      if (this.byId.has(r.id)) continue;
      this.byId.set(r.id, r);
      const list = this.byProduct.get(r.productId) ?? [];
      list.push(r);
      this.byProduct.set(r.productId, list);
      appended.push(r);
    }
    this.allRecords = [...this.byId.values()].sort((a, b) => a.rankingPosition - b.rankingPosition);
    return appended;
  }

  async findRecord(id: RankingRecordId): Promise<RankingRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async findRecordsByProduct(productId: CatalogEntryId): Promise<ReadonlyArray<RankingRecord>> {
    return this.byProduct.get(productId) ?? [];
  }

  async getTopRanked(limit: number): Promise<ReadonlyArray<RankingRecord>> {
    return this.allRecords.slice(0, limit);
  }

  get recordCount(): number {
    return this.byId.size;
  }
}

export function createRankingRepository(): RankingRepository {
  return new InMemoryRankingRepository();
}
