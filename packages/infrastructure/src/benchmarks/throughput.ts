/**
 * @workspace/infrastructure/benchmarks/throughput
 *
 * Measures products/second for each pipeline stage.
 */
import type { ThroughputResult } from "./types";
import { formatProductsPerSecond, formatMs } from "./stats";

export class ThroughputBenchmark {
  private results: ThroughputResult[] = [];

  async measure(
    stage: string,
    productCount: number,
    fn: () => Promise<void>
  ): Promise<ThroughputResult> {
    const start = Date.now();
    await fn();
    const durationMs = Date.now() - start;
    const pps = productCount / (durationMs / 1000);

    const result: ThroughputResult = {
      stage,
      productsPerSecond: Math.round(pps * 100) / 100,
      totalProducts: productCount,
      durationMs,
    };

    this.results.push(result);
    console.log(`  ${stage}: ${formatProductsPerSecond(pps)} (${formatMs(durationMs)} for ${productCount} products)`);
    return result;
  }

  getResults(): ReadonlyArray<ThroughputResult> {
    return [...this.results];
  }

  reset(): void {
    this.results = [];
  }
}
