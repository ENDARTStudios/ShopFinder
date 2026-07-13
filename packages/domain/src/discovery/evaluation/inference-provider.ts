/**
 * @workspace/domain/discovery/evaluation/inference-provider
 *
 * InferenceProvider interface + StubInferenceProvider.
 *
 * The InferenceProvider knows the model (OpenAI, Ollama, Gemini, vLLM).
 * It produces an InferenceArtifact — the raw AI output with model metadata
 * and cost. The artifact is NEVER consumed directly by the domain.
 *
 * Production implementations:
 *   - OpenAIInferenceProvider (gpt-4, gpt-4o)
 *   - OllamaInferenceProvider (local models)
 *   - GeminiInferenceProvider
 *   - VLLMInferenceProvider (self-hosted)
 *
 * All implement the same interface — swap without touching DecisionProvider
 * or PolicyEngine.
 */
import type { InferenceProvider, InferenceArtifact, InferenceId } from "./types";
import type { CanonicalProduct } from "../resolution/types";

/**
 * Stub inference provider — returns a deterministic fake response.
 * Used for tests and initial development. Production MUST swap in a real
 * implementation. The stub simulates a structured response that the
 * DecisionProvider can parse.
 */
export class StubInferenceProvider implements InferenceProvider {
  readonly modelId = "stub-model";
  readonly modelVersion = "1.0.0";
  readonly promptVersion = "v1";

  async infer(product: CanonicalProduct): Promise<InferenceArtifact> {
    const startedAt = new Date();
    const completedAt = new Date(startedAt.getTime() + 50); // 50ms latency

    // Simulated model response — structured JSON the DecisionProvider parses
    const rawResponse = {
      model: this.modelId,
      version: this.modelVersion,
      product: {
        title: product.title,
        brand: product.brand,
        category: product.category
      },
      scores: {
        commercial: 75,
        quality: 80,
        confidence: 85,
        risk: 20,
        trend: 70,
        competition: 60,
        supplier: 75,
        margin: 65,
        compliance: 90
      },
      factors: [
        { name: "demand_signal", value: 78, explanation: "strong search trend" },
        { name: "profit_potential", value: 65, explanation: "good margin opportunity" },
        { name: "supplier_reliability", value: 75, explanation: "established supplier" },
        { name: "competition_level", value: 60, explanation: "moderate competition" },
        { name: "quality_indicator", value: 80, explanation: "good reviews expected" }
      ],
      recommendation: "publish",
      confidence: 0.85,
      explanation: [
        "Strong commercial viability with good margin potential",
        "Supplier reliability is above average",
        "Compliance score is high"
      ]
    };

    return {
      id: `inference_${product.id}_${Date.now()}` as unknown as InferenceId,
      canonicalProductId: product.id,
      modelId: this.modelId,
      modelVersion: this.modelVersion,
      promptVersion: this.promptVersion,
      schemaVersion: "1.0.0",
      startedAt,
      completedAt,
      latencyMs: 50,
      inputTokens: 500,
      outputTokens: 200,
      estimatedCost: { amount: 2, currency: "USD" }, // $0.02 in cents
      rawResponse
    };
  }
}

export function createStubInferenceProvider(): InferenceProvider {
  return new StubInferenceProvider();
}
