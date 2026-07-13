/**
 * @workspace/domain/discovery/evaluation/decision-provider
 *
 * DecisionProvider — transforms a raw InferenceArtifact into a clean,
 * deterministic EvaluationResult. This is where model-specific JSON
 * parsing happens. The domain never sees raw model output.
 *
 * The DecisionProvider is DETERMINISTIC: same artifact + product →
 * same EvaluationResult. No randomness, no external calls.
 */
import type {
  DecisionProvider,
  InferenceArtifact,
  EvaluationResult,
  EvaluationId,
  ProductScore,
  AIScoreFactor
} from "./types";
import type { CanonicalProduct } from "../resolution/types";
import { factorsToScore, buildProductScore } from "./scores";

interface StubModelResponse {
  scores: Record<string, number>;
  factors: Array<{ name: string; value: number; explanation: string }>;
  recommendation: "publish" | "review" | "reject";
  confidence: number;
  explanation: string[];
}

export class DefaultDecisionProvider implements DecisionProvider {
  readonly name = "default-decision-provider";
  readonly version = "1.0.0";

  decide(artifact: InferenceArtifact, product: CanonicalProduct): EvaluationResult {
    // Parse the raw response — this is the ONLY place that knows the model's
    // output shape. Different models would have different DecisionProviders.
    const raw = artifact.rawResponse as StubModelResponse;

    // Convert factors to AIScoreFactor[]
    const aiScoreFactors: AIScoreFactor[] = (raw.factors ?? []).map((f) => ({
      name: f.name,
      value: f.value,
      weight: 1 / Math.max(raw.factors.length, 1),
      explanation: f.explanation
    }));

    // Build ProductScore from the model's score components
    const components = {
      commercial: raw.scores?.commercial ?? 50,
      quality: raw.scores?.quality ?? 50,
      confidence: raw.scores?.confidence ?? 50,
      risk: raw.scores?.risk ?? 50,
      trend: raw.scores?.trend ?? 50,
      competition: raw.scores?.competition ?? 50,
      supplier: raw.scores?.supplier ?? 50,
      margin: raw.scores?.margin ?? 50,
      compliance: raw.scores?.compliance ?? 50
    };
    const productScore = buildProductScore(components);

    return {
      id: `eval_${artifact.id}` as unknown as EvaluationId,
      canonicalProductId: product.id,
      inferenceId: artifact.id,
      productScore,
      aiScoreFactors,
      recommendation: raw.recommendation ?? "review",
      confidence: raw.confidence ?? 0.5,
      explanation: raw.explanation ?? [],
      evaluatedAt: new Date(),
      schemaVersion: "1.0.0"
    };
  }
}

export function createDefaultDecisionProvider(): DecisionProvider {
  return new DefaultDecisionProvider();
}
