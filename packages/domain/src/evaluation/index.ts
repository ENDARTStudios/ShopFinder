/** @workspace/domain/evaluation — AI Evaluation (InferenceProvider, DecisionProvider, ProductScore, ModelRegistry) */
import type { Money } from "../shared";
export interface InferenceProvider {
  readonly providerCode: string;
  readonly modelVersion: string;
  infer(req: InferenceRequest): Promise<InferenceResponse>;
}
export interface InferenceRequest {
  readonly id: string;
  readonly type: string;
  readonly product: unknown;
  readonly schemaVersion: string;
}
export interface InferenceResponse {
  readonly requestId: string;
  readonly parsedOutput: Record<string, unknown>;
  readonly confidence: number;
  readonly modelUsed: string;
  readonly latencyMs: number;
  readonly cost?: Money;
}
export interface DecisionProvider {
  readonly providerCode: string;
  decide(req: unknown): Promise<unknown>;
}
export interface ProductScore {
  readonly canonicalProductId: string;
  readonly overall: number;
  readonly commercial: number;
  readonly quality: number;
  readonly confidence: number;
  readonly risk: number;
  readonly trend: number;
  readonly competition: number;
  readonly margin: number;
  readonly supplier: number;
}
export interface AIModelVersion {
  readonly modelId: string;
  readonly modelVersion: string;
  readonly promptVersion: string;
  readonly active: boolean;
}
export interface AIModelRegistry {
  getActiveVersion(modelId: string): AIModelVersion | null;
}
