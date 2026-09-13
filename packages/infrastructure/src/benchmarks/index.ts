/**
 * @workspace/infrastructure/benchmarks
 *
 * Benchmark suite for ShopFinder.
 *
 * Measures:
 *   1. Throughput: products/s per pipeline stage
 *   2. Latency: avg/P50/P95/P99/max per stage
 *   3. Cost: tokens and $ per product (AI evaluation)
 *   4. Memory: heap usage during execution
 *
 * Usage:
 *   const runner = new BenchmarkRunner({ productCount: 1000 });
 *   const report = await runner.run();
 *   console.log(formatReport(report));
 */

export * from "./types";
export * from "./stats";
export * from "./fixtures";
export * from "./throughput";
export * from "./latency";
export * from "./cost";
export * from "./memory";
export * from "./report";
export * from "./runner";
