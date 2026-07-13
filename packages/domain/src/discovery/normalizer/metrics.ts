/**
 * @workspace/domain/discovery/normalizer/metrics
 *
 * NormalizationMetricsCollector (R8).
 * Tracks 9 quality counters + duration for monitoring data quality.
 */
import type { NormalizationMetrics } from "./types";

class InMemoryNormalizationMetricsCollector {
  private counters = {
    titlesNormalized: 0,
    brandsResolved: 0,
    attributesMapped: 0,
    categoriesMapped: 0,
    imagesProcessed: 0,
    semanticHashesCreated: 0,
    unknownBrands: 0,
    unknownCategories: 0
  };
  private productsWithAttributes = 0;
  private productsTotal = 0;
  private startTime = 0;

  start(): void {
    this.startTime = Date.now();
  }

  incrementTitle(): void {
    this.counters.titlesNormalized++;
  }
  incrementBrand(resolved: boolean): void {
    if (resolved) this.counters.brandsResolved++;
    else this.counters.unknownBrands++;
  }
  incrementCategory(mapped: boolean): void {
    if (mapped) this.counters.categoriesMapped++;
    else this.counters.unknownCategories++;
  }
  incrementAttributes(count: number): void {
    this.counters.attributesMapped += count;
    if (count > 0) this.productsWithAttributes++;
    this.productsTotal++;
  }
  incrementImages(count: number): void {
    this.counters.imagesProcessed += count;
  }
  incrementSemanticHash(): void {
    this.counters.semanticHashesCreated++;
  }

  snapshot(): NormalizationMetrics {
    return {
      ...this.counters,
      attributeCoverage:
        this.productsTotal > 0 ? this.productsWithAttributes / this.productsTotal : 0,
      durationMs: this.startTime > 0 ? Date.now() - this.startTime : 0
    };
  }

  reset(): void {
    this.counters = {
      titlesNormalized: 0,
      brandsResolved: 0,
      attributesMapped: 0,
      categoriesMapped: 0,
      imagesProcessed: 0,
      semanticHashesCreated: 0,
      unknownBrands: 0,
      unknownCategories: 0
    };
    this.productsWithAttributes = 0;
    this.productsTotal = 0;
    this.startTime = 0;
  }
}

export function createNormalizationMetricsCollector(): InMemoryNormalizationMetricsCollector {
  return new InMemoryNormalizationMetricsCollector();
}
