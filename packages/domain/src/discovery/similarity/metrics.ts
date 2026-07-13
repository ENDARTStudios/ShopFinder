/**
 * @workspace/domain/discovery/similarity/metrics
 *
 * SimilarityMetricsCollector (R9).
 * Tracks 8 quality metrics for monitoring.
 */
import type { SimilarityMetrics } from "./types";

class InMemorySimilarityMetricsCollector {
  private pairsCompared = 0;
  private pairsRejected = 0;
  private candidatesCreated = 0;
  private clustersCreated = 0;
  private totalSimilarity = 0;
  private totalImageSimilarity = 0;
  private totalTitleSimilarity = 0;
  private startTime = 0;

  start(): void {
    this.startTime = Date.now();
  }

  incrementCompared(): void {
    this.pairsCompared++;
  }
  incrementRejected(): void {
    this.pairsRejected++;
  }
  incrementCandidates(): void {
    this.candidatesCreated++;
  }
  incrementClusters(): void {
    this.clustersCreated++;
  }
  addSimilarity(overall: number, image: number, title: number): void {
    this.totalSimilarity += overall;
    this.totalImageSimilarity += image;
    this.totalTitleSimilarity += title;
  }

  get duplicatesDetected(): number {
    return this.candidatesCreated;
  }

  snapshot(): SimilarityMetrics {
    const n = this.pairsCompared || 1;
    return {
      pairsCompared: this.pairsCompared,
      pairsRejected: this.pairsRejected,
      candidatesCreated: this.candidatesCreated,
      clustersCreated: this.clustersCreated,
      averageSimilarity: this.totalSimilarity / n,
      averageImageSimilarity: this.totalImageSimilarity / n,
      averageTitleSimilarity: this.totalTitleSimilarity / n,
      duplicatesDetected: this.candidatesCreated,
      durationMs: this.startTime > 0 ? Date.now() - this.startTime : 0
    };
  }

  reset(): void {
    this.pairsCompared = 0;
    this.pairsRejected = 0;
    this.candidatesCreated = 0;
    this.clustersCreated = 0;
    this.totalSimilarity = 0;
    this.totalImageSimilarity = 0;
    this.totalTitleSimilarity = 0;
    this.startTime = 0;
  }
}

export function createSimilarityMetricsCollector(): InMemorySimilarityMetricsCollector {
  return new InMemorySimilarityMetricsCollector();
}
