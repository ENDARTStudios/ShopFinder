/**
 * @workspace/domain/discovery/evaluation/repository
 *
 * In-memory EvaluationRepository. Append-only.
 */
import type {
  EvaluationRepository,
  InferenceArtifact,
  EvaluationResult,
  DecisionTrace,
  InferenceId,
  EvaluationId,
  CanonicalProductId
} from "./types";

class InMemoryEvaluationRepository implements EvaluationRepository {
  private readonly inferencesById = new Map<string, InferenceArtifact>();
  private readonly evaluationsById = new Map<string, EvaluationResult>();
  private readonly evaluationsByProduct = new Map<string, EvaluationResult>();
  private readonly tracesByEvaluation = new Map<string, DecisionTrace>();

  async appendInference(artifact: InferenceArtifact): Promise<InferenceArtifact> {
    if (this.inferencesById.has(artifact.id)) return this.inferencesById.get(artifact.id)!;
    this.inferencesById.set(artifact.id, artifact);
    return artifact;
  }

  async appendEvaluation(result: EvaluationResult): Promise<EvaluationResult> {
    if (this.evaluationsById.has(result.id)) return this.evaluationsById.get(result.id)!;
    this.evaluationsById.set(result.id, result);
    this.evaluationsByProduct.set(result.canonicalProductId, result);
    return result;
  }

  async appendDecisionTrace(trace: DecisionTrace): Promise<DecisionTrace> {
    if (this.tracesByEvaluation.has(trace.evaluationId))
      return this.tracesByEvaluation.get(trace.evaluationId)!;
    this.tracesByEvaluation.set(trace.evaluationId, trace);
    return trace;
  }

  async findInference(id: InferenceId): Promise<InferenceArtifact | null> {
    return this.inferencesById.get(id) ?? null;
  }

  async findEvaluation(id: EvaluationId): Promise<EvaluationResult | null> {
    return this.evaluationsById.get(id) ?? null;
  }

  async findEvaluationByProduct(productId: CanonicalProductId): Promise<EvaluationResult | null> {
    return this.evaluationsByProduct.get(productId) ?? null;
  }

  async findTraceByEvaluation(evaluationId: EvaluationId): Promise<DecisionTrace | null> {
    return this.tracesByEvaluation.get(evaluationId) ?? null;
  }

  get inferenceCount(): number {
    return this.inferencesById.size;
  }
  get evaluationCount(): number {
    return this.evaluationsById.size;
  }
  get traceCount(): number {
    return this.tracesByEvaluation.size;
  }

  clear(): void {
    this.inferencesById.clear();
    this.evaluationsById.clear();
    this.evaluationsByProduct.clear();
    this.tracesByEvaluation.clear();
  }
}

export function createEvaluationRepository(): EvaluationRepository {
  return new InMemoryEvaluationRepository();
}
