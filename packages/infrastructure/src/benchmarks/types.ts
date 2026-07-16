/**
 * @workspace/infrastructure/benchmarks/types
 *
 * Type contracts for the benchmark suite.
 */
import type { Money } from "@workspace/domain/shared";

export type BenchmarkCategory = "throughput" | "latency" | "cost" | "memory";

export interface LatencyStats {
  readonly avg: number;       // milliseconds
  readonly p50: number;       // median
  readonly p95: number;
  readonly p99: number;
  readonly max: number;
  readonly samples: number;
}

export interface StageLatency {
  readonly stage: string;
  readonly stats: LatencyStats;
}

export interface ThroughputResult {
  readonly stage: string;
  readonly productsPerSecond: number;
  readonly totalProducts: number;
  readonly durationMs: number;
}

export interface CostResult {
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalCost: Money;
  readonly productsEvaluated: number;
  readonly costPerProduct: Money;
  readonly costPer1kProducts: Money;
  readonly model: string;
}

export interface MemorySnapshot {
  readonly heapUsedMB: number;
  readonly heapTotalMB: number;
  readonly externalMB: number;
  readonly rssMB: number;
  readonly timestamp: string;
}

export interface BenchmarkReport {
  readonly startedAt: string;
  readonly completedAt: string;
  readonly totalDurationMs: number;
  readonly productCount: number;
  readonly throughput: ReadonlyArray<ThroughputResult>;
  readonly latency: ReadonlyArray<StageLatency>;
  readonly cost?: CostResult;
  readonly memory: ReadonlyArray<MemorySnapshot>;
  readonly summary: BenchmarkSummary;
}

export interface BenchmarkSummary {
  readonly totalProductsProcessed: number;
  readonly endToEndMsPerProduct: number;
  readonly overallThroughput: number;       // products/s
  readonly costPerProduct?: Money;
  readonly peakMemoryMB: number;
  readonly bottleneck: string;              // slowest stage
}

export interface BenchmarkConfig {
  readonly productCount: number;
  readonly stages: ReadonlyArray<string>;
  readonly skipAI?: boolean;
  readonly warmupIterations?: number;
}
