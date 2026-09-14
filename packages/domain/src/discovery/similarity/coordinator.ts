/**
 * @workspace/domain/discovery/similarity/coordinator
 *
 * SimilarityCoordinator — compares NormalizedProductRecords pairwise,
 * creates DuplicateCandidates for pairs that pass the SimilarityPolicy,
 * and forms SimilarityClusters from connected candidates.
 *
 * Flow:
 *   1. Receive NormalizedProductsCreated (or direct call)
 *   2. For each pair (i, j):
 *      a. Run 5 similarity algorithms (title/brand/image/attribute/price)
 *      b. Compute weighted overall similarity
 *      c. Evaluate against SimilarityPolicy thresholds
 *      d. If pass → create DuplicateCandidate with SimilarityEvidence
 *   3. Form SimilarityClusters from candidates (Union-Find)
 *   4. Emit 4 events (Started, CandidatesDetected, ClustersCreated, Completed)
 *
 * R10: A2.6 discovers only — never resolves. A2.7 consumes candidates.
 */
import type {
  SimilarityCoordinatorInput,
  SimilarityCoordinatorResult,
  SimilarityBatchId,
  DuplicateCandidate,
  DuplicateCandidateId,
  SimilarityCluster,
  SimilarityEvidence,
  SimilarityAlgorithm,
  SimilarityRepository,
  SimilarityPolicy
} from "./types";
import type { NormalizedProductRecord, NormalizedProductRecordId } from "../normalizer/types";
import { DefaultSimilarityAlgorithm } from "./algorithms";
import { evaluatePolicy, computeOverallSimilarity } from "./policy";
import { formClusters } from "./clustering";
import { createSimilarityMetricsCollector } from "./metrics";
import {
  makeSimilarityStartedEvent,
  makeSimilarityCompletedEvent,
  makeDuplicateCandidatesDetectedEvent,
  makeSimilarityClustersCreatedEvent,
  type SimilarityEvent
} from "./events";

export interface SimilarityEventPublisher {
  publish(events: ReadonlyArray<SimilarityEvent>): Promise<void>;
}

export interface SimilarityCoordinatorDeps {
  readonly repository: SimilarityRepository;
  readonly algorithm?: SimilarityAlgorithm;
  readonly events?: SimilarityEventPublisher;
}

export class SimilarityCoordinator {
  private readonly algorithm: SimilarityAlgorithm;

  constructor(private readonly deps: SimilarityCoordinatorDeps) {
    this.algorithm = deps.algorithm ?? new DefaultSimilarityAlgorithm();
  }

  async compare(input: SimilarityCoordinatorInput): Promise<SimilarityCoordinatorResult> {
    const start = Date.now();
    const batchId = input.batchId as unknown as SimilarityBatchId;
    const metrics = createSimilarityMetricsCollector();
    metrics.start();

    const versions = {
      algorithmVersion: this.algorithm.name,
      policyVersion: "1.0.0"
    };

    // 1. Emit Started
    if (this.deps.events) {
      await this.deps.events.publish([
        makeSimilarityStartedEvent(versions, {
          batchId: input.batchId,
          productCount: input.products.length,
          startedAt: new Date().toISOString()
        })
      ]);
    }

    // 2. Compare all pairs
    const candidates: DuplicateCandidate[] = [];
    const products = input.products;
    const policy = input.policy;

    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const a = products[i]!;
        const b = products[j]!;
        metrics.incrementCompared();

        const evidence = this.comparePair(a, b, policy);
        metrics.addSimilarity(
          evidence.overallSimilarity,
          evidence.imageSimilarity,
          evidence.titleSimilarity
        );

        const evaluation = evaluatePolicy(evidence, policy);
        if (evaluation.pass) {
          const candidate = this.makeCandidate(a.id, b.id, evidence, batchId);
          candidates.push(candidate);
          await this.deps.repository.appendCandidate(candidate);
          metrics.incrementCandidates();
        } else {
          metrics.incrementRejected();
        }
      }
    }

    // 3. Form clusters
    const clusters = formClusters(candidates, batchId);
    for (const cluster of clusters) {
      await this.deps.repository.appendCluster(cluster);
      metrics.incrementClusters();
    }

    // 4. Emit CandidatesDetected + ClustersCreated + Completed
    if (this.deps.events) {
      const events: SimilarityEvent[] = [];

      if (candidates.length > 0) {
        events.push(
          makeDuplicateCandidatesDetectedEvent(versions, {
            batchId: input.batchId,
            count: candidates.length,
            candidateIds: candidates.map((c) => c.id)
          })
        );
      }

      if (clusters.length > 0) {
        events.push(
          makeSimilarityClustersCreatedEvent(versions, {
            batchId: input.batchId,
            count: clusters.length,
            clusterIds: clusters.map((c) => c.id),
            totalMembers: clusters.reduce((s, c) => s + c.memberCount, 0)
          })
        );
      }

      const metricsSnapshot = metrics.snapshot();
      events.push(
        makeSimilarityCompletedEvent(versions, {
          batchId: input.batchId,
          candidatesCreated: candidates.length,
          clustersCreated: clusters.length,
          durationMs: Date.now() - start,
          metrics: {
            pairsCompared: metricsSnapshot.pairsCompared,
            pairsRejected: metricsSnapshot.pairsRejected,
            averageSimilarity: metricsSnapshot.averageSimilarity,
            duplicatesDetected: metricsSnapshot.duplicatesDetected
          }
        })
      );

      await this.deps.events.publish(events);
    }

    return {
      batchId,
      candidates,
      clusters,
      metrics: metrics.snapshot(),
      durationMs: Date.now() - start
    };
  }

  private comparePair(
    a: NormalizedProductRecord,
    b: NormalizedProductRecord,
    policy: SimilarityPolicy
  ): SimilarityEvidence {
    const titleSim = this.algorithm.compareTitle(a.normalizedTitle, b.normalizedTitle);
    const brandSim = this.algorithm.compareBrand(
      a.normalizedBrand,
      b.normalizedBrand,
      a.canonicalBrandId,
      b.canonicalBrandId
    );
    const imageSim = this.algorithm.compareImages(a.normalizedImages, b.normalizedImages);
    const attrSim = this.algorithm.compareAttributes(
      a.normalizedAttributes,
      b.normalizedAttributes
    );
    const priceSim = this.algorithm.comparePrice(a.normalizedPrice, b.normalizedPrice);

    const overall = computeOverallSimilarity(
      { title: titleSim, brand: brandSim, image: imageSim, attribute: attrSim, price: priceSim },
      policy.weights
    );

    const topFactors = [
      { name: "title", val: titleSim },
      { name: "brand", val: brandSim },
      { name: "image", val: imageSim },
      { name: "attribute", val: attrSim },
      { name: "price", val: priceSim }
    ]
      .sort((a, b) => b.val - a.val)
      .slice(0, 3)
      .map((f) => `${f.name}=${f.val.toFixed(2)}`)
      .join(", ");

    return {
      titleSimilarity: titleSim,
      brandSimilarity: brandSim,
      imageSimilarity: imageSim,
      attributeSimilarity: attrSim,
      priceSimilarity: priceSim,
      overallSimilarity: overall,
      weights: policy.weights,
      explanation: `overall=${overall.toFixed(2)} (top: ${topFactors})`
    };
  }

  private makeCandidate(
    aId: NormalizedProductRecordId,
    bId: NormalizedProductRecordId,
    evidence: SimilarityEvidence,
    batchId: SimilarityBatchId
  ): DuplicateCandidate {
    const id = `cand_${batchId}_${aId}_${bId}` as unknown as DuplicateCandidateId;
    return {
      id,
      productAId: aId,
      productBId: bId,
      evidence,
      status: "pending",
      createdAt: new Date(),
      batchId
    };
  }
}

export function createSimilarityCoordinator(
  deps: SimilarityCoordinatorDeps
): SimilarityCoordinator {
  return new SimilarityCoordinator(deps);
}
