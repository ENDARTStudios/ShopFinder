/**
 * @workspace/domain/discovery/evaluation/coordinator
 *
 * EvaluationCoordinator — orchestrates the full evaluation flow:
 *
 *   For each CanonicalProduct:
 *     1. Compliance PreCheck → (eligible | blocked | requires_review)
 *        blocked/review → emit EvaluationRejected, skip inference
 *     2. Cache check → (hit | miss)
 *        hit → emit EvaluationCached, reuse EvaluationResult
 *     3. InferenceProvider.infer(product) → InferenceArtifact
 *        emit InferenceStarted + InferenceCompleted
 *     4. DecisionProvider.decide(artifact, product) → EvaluationResult
 *     5. PolicyEngine.evaluate(result) → ApprovalDecision + DecisionTrace
 *     6. Emit EvaluationCompleted
 *
 * The coordinator does NOT know the model — it delegates to InferenceProvider.
 * The coordinator does NOT decide — it delegates to PolicyEngine.
 */
import type {
  EvaluationCoordinatorInput,
  EvaluationCoordinatorResult,
  EvaluationBatchId,
  EvaluationResult,
  ApprovalDecision,
  DecisionTrace,
  EvaluationMetrics,
  InferenceArtifact,
  InferenceProvider,
  DecisionProvider,
  PolicyEngine,
  EvaluationRepository,
  CanonicalProduct
} from "./types";
import type { Money } from "../../shared";
import { DefaultCompliancePreCheck } from "./compliance-check";
import type { InMemoryInferenceCache } from "./cache";
import {
  makeInferenceStartedEvent,
  makeInferenceCompletedEvent,
  makeEvaluationCompletedEvent,
  makeEvaluationCachedEvent,
  makeEvaluationRejectedEvent,
  type EvaluationEvent
} from "./events";

export interface EvaluationEventPublisher {
  publish(events: ReadonlyArray<EvaluationEvent>): Promise<void>;
}

export interface EvaluationCoordinatorDeps {
  readonly repository: EvaluationRepository;
  readonly inferenceProvider: InferenceProvider;
  readonly decisionProvider: DecisionProvider;
  readonly policyEngine: PolicyEngine;
  readonly cache: InMemoryInferenceCache;
  readonly events?: EvaluationEventPublisher;
}

export class EvaluationCoordinator {
  private readonly complianceCheck = new DefaultCompliancePreCheck();

  constructor(private readonly deps: EvaluationCoordinatorDeps) {}

  async evaluate(input: EvaluationCoordinatorInput): Promise<EvaluationCoordinatorResult> {
    const start = Date.now();
    const batchId = input.batchId as unknown as EvaluationBatchId;
    const versions = {
      modelVersion: this.deps.inferenceProvider.modelVersion,
      promptVersion: this.deps.inferenceProvider.promptVersion,
      decisionProviderVersion: this.deps.decisionProvider.version,
      policyVersion: this.deps.policyEngine.version
    };

    const evaluations: EvaluationResult[] = [];
    const decisions: Array<{
      result: EvaluationResult;
      decision: ApprovalDecision;
      trace: DecisionTrace;
    }> = [];
    const blocked: Array<{ product: CanonicalProduct; reason: string }> = [];
    const cached: Array<{
      product: CanonicalProduct;
      evaluationId: import("./types").EvaluationId;
    }> = [];

    let inferencesRun = 0;
    let inferencesCached = 0;
    let productsBlocked = 0;
    let totalCost: Money = { amount: 0, currency: "USD" };
    let totalConfidence = 0;
    let publishCount = 0;
    let reviewCount = 0;
    let rejectCount = 0;

    for (const product of input.products) {
      // 1. Compliance PreCheck
      const compliance = this.complianceCheck.check(product);
      if (compliance.status === "blocked") {
        productsBlocked++;
        blocked.push({ product, reason: compliance.reason });
        if (this.deps.events) {
          await this.deps.events.publish([
            makeEvaluationRejectedEvent(versions, {
              canonicalProductId: product.id,
              reason: compliance.reason,
              violations: compliance.violations
            })
          ]);
        }
        continue;
      }

      // 2. Cache check
      const cacheKey = this.deps.cache.buildKey({
        canonicalProductVersion: `${product.id}_${product.schemaVersion}`,
        modelVersion: versions.modelVersion,
        promptVersion: versions.promptVersion,
        schemaVersion: "1.0.0"
      });
      const cachedEntry = this.deps.cache.get(cacheKey);
      if (cachedEntry) {
        inferencesCached++;
        const cachedEval = await this.deps.repository.findEvaluation(cachedEntry.evaluationId);
        if (cachedEval) {
          cached.push({ product, evaluationId: cachedEval.id });
          evaluations.push(cachedEval);
          // Run policy on cached result too
          const { decision, trace } = this.deps.policyEngine.evaluate(cachedEval);
          await this.deps.repository.appendDecisionTrace(trace);
          decisions.push({ result: cachedEval, decision, trace });
          this.countDecision(
            decision.action,
            () => publishCount++,
            () => reviewCount++,
            () => rejectCount++
          );
          totalConfidence += cachedEval.confidence;

          if (this.deps.events) {
            await this.deps.events.publish([
              makeEvaluationCachedEvent(versions, {
                canonicalProductId: product.id,
                evaluationId: cachedEval.id,
                cachedAt: new Date().toISOString()
              })
            ]);
          }
          continue;
        }
      }

      // 3. Inference
      if (this.deps.events) {
        await this.deps.events.publish([
          makeInferenceStartedEvent(versions, {
            canonicalProductId: product.id,
            inferenceId: "", // will be set after inference
            modelId: this.deps.inferenceProvider.modelId,
            startedAt: new Date().toISOString()
          })
        ]);
      }

      const artifact = await this.deps.inferenceProvider.infer(product);
      inferencesRun++;
      await this.deps.repository.appendInference(artifact);
      totalCost = {
        amount: totalCost.amount + artifact.estimatedCost.amount,
        currency: totalCost.currency
      };

      if (this.deps.events) {
        await this.deps.events.publish([
          makeInferenceCompletedEvent(versions, {
            inferenceId: artifact.id,
            canonicalProductId: product.id,
            latencyMs: artifact.latencyMs,
            inputTokens: artifact.inputTokens,
            outputTokens: artifact.outputTokens,
            estimatedCost: {
              amount: artifact.estimatedCost.amount,
              currency: artifact.estimatedCost.currency
            }
          })
        ]);
      }

      // 4. Decision (deterministic transform)
      const result = this.deps.decisionProvider.decide(artifact, product);
      await this.deps.repository.appendEvaluation(result);
      evaluations.push(result);
      totalConfidence += result.confidence;

      // Cache the result
      this.deps.cache.set(cacheKey, artifact.id, result.id, product.id);

      // 5. Policy decision
      const { decision, trace } = this.deps.policyEngine.evaluate(result);
      await this.deps.repository.appendDecisionTrace(trace);
      decisions.push({ result, decision, trace });
      this.countDecision(
        decision.action,
        () => publishCount++,
        () => reviewCount++,
        () => rejectCount++
      );

      // 6. Emit EvaluationCompleted
      if (this.deps.events) {
        await this.deps.events.publish([
          makeEvaluationCompletedEvent(versions, {
            evaluationId: result.id,
            canonicalProductId: product.id,
            inferenceId: artifact.id,
            recommendation: result.recommendation,
            confidence: result.confidence,
            overallScore: result.productScore.overall,
            decision: decision.action,
            decisionReason: decision.reason
          })
        ]);
      }
    }

    const metrics: EvaluationMetrics = {
      productsProcessed: input.products.length,
      inferencesRun,
      inferencesCached,
      productsBlocked,
      evaluationsCompleted: evaluations.length,
      publishDecisions: publishCount,
      reviewDecisions: reviewCount,
      rejectDecisions: rejectCount,
      totalInferenceCost: totalCost,
      averageConfidence: evaluations.length > 0 ? totalConfidence / evaluations.length : 0,
      durationMs: Date.now() - start
    };

    return {
      batchId,
      evaluations,
      decisions,
      blocked,
      cached,
      metrics,
      durationMs: Date.now() - start
    };
  }

  private countDecision(
    action: string,
    onPublish: () => void,
    onReview: () => void,
    onReject: () => void
  ): void {
    if (action === "publish") onPublish();
    else if (action === "review") onReview();
    else onReject();
  }
}

export function createEvaluationCoordinator(
  deps: EvaluationCoordinatorDeps
): EvaluationCoordinator {
  return new EvaluationCoordinator(deps);
}
