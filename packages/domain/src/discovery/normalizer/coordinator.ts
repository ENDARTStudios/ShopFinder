/**
 * @workspace/domain/discovery/normalizer/coordinator
 *
 * NormalizationCoordinator — bridges Raw Store output to Normalized Store.
 *
 * Flow:
 *   1. Receive RawProductsReadyForNormalization (or direct call)
 *   2. For each (RawProductRecord, NormalizedDiscoveredProduct):
 *      a. normalizer.normalize(record, product) → NormalizedProductRecord
 *      b. repository.append(record) — idempotent
 *   3. Collect metrics
 *   4. Emit 4 events:
 *      - NormalizationStarted (at start)
 *      - NormalizedProductsCreated (after all products normalized)
 *      - SemanticHashesGenerated (after semantic hashes computed)
 *      - NormalizationCompleted (at end, with metrics)
 *
 * A2.6 Similarity subscribes to NormalizedProductsCreated.
 */
import type {
  NormalizationCoordinatorInput,
  NormalizationCoordinatorResult,
  NormalizationBatchId,
  NormalizedProductRecord,
  NormalizerVersions,
  NormalizationMetrics
} from "./types";
import type { ProductNormalizer } from "./types";
import type { NormalizedProductRepository } from "./types";
import { createNormalizationMetricsCollector } from "./metrics";
import {
  makeNormalizationStartedEvent,
  makeNormalizationCompletedEvent,
  makeNormalizedProductsCreatedEvent,
  makeSemanticHashesGeneratedEvent,
  type NormalizerEvent
} from "./events";

export interface NormalizationEventPublisher {
  publish(events: ReadonlyArray<NormalizerEvent>): Promise<void>;
}

export interface NormalizationCoordinatorDeps {
  readonly normalizer: ProductNormalizer;
  readonly repository: NormalizedProductRepository;
  readonly events?: NormalizationEventPublisher;
}

export class NormalizationCoordinator {
  constructor(private readonly deps: NormalizationCoordinatorDeps) {}

  async normalizeBatch(
    input: NormalizationCoordinatorInput
  ): Promise<NormalizationCoordinatorResult> {
    const start = Date.now();
    const batchId = this.makeBatchId(
      input.executionId,
      input.versions
    ) as unknown as NormalizationBatchId;
    const metricsCollector = createNormalizationMetricsCollector();
    metricsCollector.start();

    // 1. Emit NormalizationStarted
    if (this.deps.events) {
      await this.deps.events.publish([
        makeNormalizationStartedEvent(input.versions, {
          executionId: input.executionId,
          batchId: batchId,
          rawRecordCount: input.rawRecords.length,
          startedAt: new Date().toISOString()
        })
      ]);
    }

    // 2. Normalize each product
    const normalized: NormalizedProductRecord[] = [];
    const semanticHashes: string[] = [];
    for (const { record, product } of input.rawRecords) {
      const result = await this.deps.normalizer.normalize(record, product);
      await this.deps.repository.append(result);
      normalized.push(result);
      semanticHashes.push(result.semanticHash);

      // Update metrics
      metricsCollector.incrementTitle();
      metricsCollector.incrementBrand(result.normalizedBrand !== "UNKNOWN");
      metricsCollector.incrementCategory(result.normalizedCategory !== "UNCATEGORIZED");
      metricsCollector.incrementAttributes(result.normalizedAttributes.length);
      metricsCollector.incrementImages(result.normalizedImages.length);
      metricsCollector.incrementSemanticHash();
    }

    const metrics: NormalizationMetrics = metricsCollector.snapshot();

    // 3. Emit NormalizedProductsCreated + SemanticHashesGenerated
    if (this.deps.events && normalized.length > 0) {
      const hashCounts = normalized.map((n) => ({
        semanticHash: n.semanticHash,
        phashCount: n.normalizedImages.length
      }));

      await this.deps.events.publish([
        makeNormalizedProductsCreatedEvent(input.versions, {
          executionId: input.executionId,
          batchId: batchId,
          count: normalized.length,
          normalizedProductIds: normalized.map((n) => n.id),
          semanticHashes
        }),
        makeSemanticHashesGeneratedEvent(input.versions, {
          executionId: input.executionId,
          batchId: batchId,
          count: hashCounts.length,
          hashes: hashCounts
        })
      ]);
    }

    // 4. Emit NormalizationCompleted
    if (this.deps.events) {
      await this.deps.events.publish([
        makeNormalizationCompletedEvent(input.versions, {
          executionId: input.executionId,
          batchId: batchId,
          normalizedCount: normalized.length,
          durationMs: Date.now() - start,
          metrics: {
            titlesNormalized: metrics.titlesNormalized,
            brandsResolved: metrics.brandsResolved,
            attributesMapped: metrics.attributesMapped,
            categoriesMapped: metrics.categoriesMapped,
            imagesProcessed: metrics.imagesProcessed,
            semanticHashesCreated: metrics.semanticHashesCreated,
            unknownBrands: metrics.unknownBrands,
            unknownCategories: metrics.unknownCategories,
            attributeCoverage: metrics.attributeCoverage
          }
        })
      ]);
    }

    return {
      batchId,
      normalized,
      metrics,
      durationMs: Date.now() - start
    };
  }

  /**
   * Deterministic batch ID: same (executionId, normalizerVersion) → same ID.
   * Enables idempotent re-normalization.
   */
  private makeBatchId(executionId: string, versions: NormalizerVersions): string {
    return `batch_${executionId}_${versions.normalizerVersion}`;
  }
}

export function createNormalizationCoordinator(
  deps: NormalizationCoordinatorDeps
): NormalizationCoordinator {
  return new NormalizationCoordinator(deps);
}
