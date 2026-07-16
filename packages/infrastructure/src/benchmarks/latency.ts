/**
 * @workspace/infrastructure/benchmarks/latency
 *
 * Measures per-stage latency (avg, P50, P95, P99, max).
 */
import type { StageLatency, LatencyStats } from "./types";
import { computeLatencyStats, formatMs } from "./stats";

export class LatencyBenchmark {
  private stageSamples = new Map<string, number[]>();

  record(stage: string, durationMs: number): void {
    const samples = this.stageSamples.get(stage) ?? [];
    samples.push(durationMs);
    this.stageSamples.set(stage, samples);
  }

  async measure<T>(
    stage: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    const result = await fn();
    const durationMs = Date.now() - start;
    this.record(stage, durationMs);
    return result;
  }

  getResults(): ReadonlyArray<StageLatency> {
    const results: StageLatency[] = [];

    for (const [stage, samples] of this.stageSamples) {
      const stats: LatencyStats = computeLatencyStats(samples);
      results.push({ stage, stats });
      console.log(
        `  ${stage}: avg=${formatMs(stats.avg)} p95=${formatMs(stats.p95)} p99=${formatMs(stats.p99)} max=${formatMs(stats.max)} (n=${stats.samples})`
      );
    }

    return results;
  }

  getSlowestStage(): string {
    let slowest = "";
    let maxAvg = 0;

    for (const [stage, samples] of this.stageSamples) {
      const stats = computeLatencyStats(samples);
      if (stats.avg > maxAvg) {
        maxAvg = stats.avg;
        slowest = stage;
      }
    }

    return slowest;
  }

  reset(): void {
    this.stageSamples.clear();
  }
}
