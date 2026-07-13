/** @workspace/domain/knowledge — Knowledge Layer (RAG-ready) */
export interface Embedding {
  readonly id: string;
  readonly entityId: string;
  readonly vector: number[];
  readonly model: string;
}
export interface VectorDocument {
  readonly id: string;
  readonly content: string;
  readonly metadata: Record<string, unknown>;
}
export interface KnowledgeBase {
  ingest(doc: VectorDocument): Promise<void>;
  query(text: string, topK: number): Promise<Array<{ doc: VectorDocument; score: number }>>;
}
export interface PromptTemplate {
  readonly id: string;
  readonly template: string;
  readonly version: string;
}
