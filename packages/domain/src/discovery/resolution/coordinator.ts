/**
 * @workspace/domain/discovery/resolution/coordinator
 *
 * ResolutionCoordinator — consumes SimilarityClusters, resolves each
 * cluster into either a CanonicalIdentity (success) or a ConflictRecord
 * (ambiguity), then builds the CanonicalProduct for each identity.
 *
 * Flow per cluster:
 *   1. detectConflict(cluster, products)
 *      - If conflict → create ConflictRecord, emit ConflictDetected
 *      - If no conflict → proceed to resolution
 *   2. policy.resolve(cluster, products) → primaryProductId + reason
 *   3. build ResolutionEvidence (which product sourced each field)
 *   4. create CanonicalIdentity (immutable, versioned)
 *   5. builder.build(identity, products) → CanonicalProduct
 *   6. emit IdentityResolved + ProductBuilt + ReadyForEvaluation
 *
 * R10 from A2.6: Resolution does NOT call IA, does NOT access marketplaces,
 * does NOT modify NormalizedProductRecord, does NOT create catalog listings.
 */
import type {
  ResolutionCoordinatorInput,
  ResolutionCoordinatorResult,
  ResolutionBatchId,
  CanonicalIdentity,
  CanonicalIdentityId,
  CanonicalProductId,
  ConflictRecord,
  CanonicalProduct,
  ResolutionMetrics,
  ResolutionPolicy,
  CanonicalBuilder,
  ResolutionRepository,
  ResolutionEvidence
} from "./types";
import type {
  SimilarityCluster,
  NormalizedProductRecordId,
  NormalizedProductRecord
} from "./types";
import { detectConflict, buildConflictRecord } from "./conflicts";
import {
  makeCanonicalIdentityResolvedEvent,
  makeCanonicalIdentityConflictDetectedEvent,
  makeCanonicalProductBuiltEvent,
  makeCanonicalProductReadyForEvaluationEvent,
  type ResolutionEvent
} from "./events";

export interface ResolutionEventPublisher {
  publish(events: ReadonlyArray<ResolutionEvent>): Promise<void>;
}

export interface ResolutionCoordinatorDeps {
  readonly repository: ResolutionRepository;
  readonly builder: CanonicalBuilder;
  readonly events?: ResolutionEventPublisher;
}

export class ResolutionCoordinator {
  constructor(private readonly deps: ResolutionCoordinatorDeps) {}

  async resolve(input: ResolutionCoordinatorInput): Promise<ResolutionCoordinatorResult> {
    const start = Date.now();
    const batchId = input.batchId as unknown as ResolutionBatchId;
    const policy = input.policy;
    const versions = {
      resolutionStrategy: policy.name,
      policyVersion: "1.0.0"
    };

    const identities: CanonicalIdentity[] = [];
    const conflicts: ConflictRecord[] = [];
    const canonicalProducts: CanonicalProduct[] = [];
    let totalConfidence = 0;

    for (const cluster of input.clusters) {
      // 1. Detect conflicts
      const detection = detectConflict(cluster, input.products);

      if (detection.hasConflict) {
        const conflict = buildConflictRecord(cluster, detection, batchId);
        await this.deps.repository.appendConflict(conflict);
        conflicts.push(conflict);

        if (this.deps.events) {
          await this.deps.events.publish([
            makeCanonicalIdentityConflictDetectedEvent(versions, {
              conflictId: conflict.id,
              clusterId: cluster.id,
              reason: conflict.reason,
              candidateCount: conflict.candidates.length,
              details: conflict.details
            })
          ]);
        }
        continue;
      }

      // 2. Resolve: pick primary
      const resolution = policy.resolve(cluster, input.products);

      // 3. Build evidence
      const evidence = this.buildEvidence(
        cluster,
        input.products,
        resolution.primaryProductId,
        resolution.reason
      );

      // 4. Create CanonicalIdentity
      const identity = this.makeIdentity(cluster, resolution, evidence, batchId);
      await this.deps.repository.appendIdentity(identity);
      identities.push(identity);
      totalConfidence += resolution.confidence;

      // 5. Build CanonicalProduct
      const product = this.deps.builder.build(identity, input.products);
      await this.deps.repository.appendCanonicalProduct(product);
      canonicalProducts.push(product);

      // 6. Emit events
      if (this.deps.events) {
        await this.deps.events.publish([
          makeCanonicalIdentityResolvedEvent(versions, {
            identityId: identity.id,
            canonicalProductId: identity.canonicalProductId,
            clusterId: cluster.id,
            memberCount: cluster.memberCount,
            primaryProductId: resolution.primaryProductId,
            confidence: resolution.confidence
          }),
          makeCanonicalProductBuiltEvent(versions, {
            canonicalProductId: product.id,
            identityId: identity.id,
            title: product.title,
            brand: product.brand,
            offerCount: product.offerCount,
            supplierCount: product.supplierCodes.length
          }),
          makeCanonicalProductReadyForEvaluationEvent(versions, {
            canonicalProductId: product.id,
            identityId: identity.id
          })
        ]);
      }
    }

    const metrics: ResolutionMetrics = {
      clustersProcessed: input.clusters.length,
      identitiesCreated: identities.length,
      conflictsDetected: conflicts.length,
      canonicalProductsBuilt: canonicalProducts.length,
      averageConfidence: identities.length > 0 ? totalConfidence / identities.length : 0,
      durationMs: Date.now() - start
    };

    return {
      batchId,
      identities,
      conflicts,
      canonicalProducts,
      metrics,
      durationMs: Date.now() - start
    };
  }

  private buildEvidence(
    cluster: SimilarityCluster,
    products: ReadonlyMap<NormalizedProductRecordId, NormalizedProductRecord>,
    primaryProductId: NormalizedProductRecordId,
    primaryReason: string
  ): ResolutionEvidence {
    const members: NormalizedProductRecord[] = [];
    for (const pid of cluster.memberIds) {
      const p = products.get(pid);
      if (p) members.push(p);
    }

    // Title source: primary
    const titleSource = primaryProductId;

    // Brand source: member with highest confidence brand (non-UNKNOWN)
    let brandSource = primaryProductId;
    let bestBrandConf = -1;
    for (const p of members) {
      if (p.normalizedBrand !== "UNKNOWN" && p.confidenceScore > bestBrandConf) {
        bestBrandConf = p.confidenceScore;
        brandSource = p.id;
      }
    }

    // Image source: member with most images
    let imageSource = primaryProductId;
    let maxImages = 0;
    for (const p of members) {
      if (p.normalizedImages.length > maxImages) {
        maxImages = p.normalizedImages.length;
        imageSource = p.id;
      }
    }

    // Category source: member with canonicalCategoryId (first found)
    let categorySource = primaryProductId;
    for (const p of members) {
      if (p.canonicalCategoryId) {
        categorySource = p.id;
        break;
      }
    }

    // Attribute sources: best confidence per attribute name
    const attributeSources: Record<string, NormalizedProductRecordId> = {};
    const attrConfidence = new Map<string, number>();
    for (const p of members) {
      for (const attr of p.normalizedAttributes) {
        const existing = attrConfidence.get(attr.name) ?? -1;
        if (attr.confidence > existing) {
          attrConfidence.set(attr.name, attr.confidence);
          attributeSources[attr.name] = p.id;
        }
      }
    }

    return {
      titleSource,
      imageSource,
      brandSource,
      categorySource,
      attributeSources,
      primaryOfferReason: primaryReason,
      confidence:
        members.length > 0 ? members.reduce((s, p) => s + p.confidenceScore, 0) / members.length : 0
    };
  }

  private makeIdentity(
    cluster: SimilarityCluster,
    resolution: { primaryProductId: NormalizedProductRecordId; reason: string; confidence: number },
    evidence: ResolutionEvidence,
    batchId: ResolutionBatchId
  ): CanonicalIdentity {
    const identityId = `ident_${cluster.id}` as unknown as CanonicalIdentityId;
    const canonicalProductId = `canon_${cluster.id}` as unknown as CanonicalProductId;

    return {
      id: identityId,
      canonicalProductId,
      clusterId: cluster.id,
      normalizedProductIds: cluster.memberIds,
      primaryProductId: resolution.primaryProductId,
      resolutionStrategy: resolution.reason.split(":")[0] ?? "unknown",
      confidence: resolution.confidence,
      evidence,
      createdAt: new Date(),
      batchId,
      schemaVersion: "1.0.0"
    };
  }
}

export function createResolutionCoordinator(
  deps: ResolutionCoordinatorDeps
): ResolutionCoordinator {
  return new ResolutionCoordinator(deps);
}
