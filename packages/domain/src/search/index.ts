/** @workspace/domain/search — Search Index Pipeline */
export interface SearchIndexEntry {
  readonly id: string;
  readonly entityId: string;
  readonly status: "pending" | "indexed" | "failed";
  readonly indexVersion: number;
}
export interface SearchIndexPipeline {
  index(entry: SearchIndexEntry): Promise<void>;
  remove(entityId: string): Promise<void>;
  reindexAll(): Promise<void>;
}
export interface VectorSearchService {
  embed(text: string): Promise<number[]>;
  search(vector: number[], limit?: number): Promise<Array<{ id: string; score: number }>>;
}
