/**
 * @workspace/infrastructure/benchmarks/benchmark.test
 *
 * Tests for the benchmark suite.
 * Validates that benchmarks produce valid reports with correct metrics.
 */
/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import {
  BenchmarkRunner,
  generateProducts,
  computeLatencyStats,
  formatMs,
  formatProductsPerSecond,
  formatMoney,
  formatMB,
  formatReport,
  buildSummary,
  type BenchmarkReport,
} from "./index";

describe("Benchmark Suite", () => {

  // ── Fixtures ────────────────────────────────────────────
  describe("Fixtures", () => {
    it("should generate N products", () => {
      const products = generateProducts(100);
      expect(products.length).toBe(100);
      expect(products[0]!.externalId).toBe("bench_000000");
      expect(products[99]!.externalId).toBe("bench_000099");
    });

    it("should generate varied products", () => {
      const products = generateProducts(20);
      const titles = new Set(products.map(p => p.title));
      const brands = new Set(products.map(p => p.brand));
      expect(titles.size).toBeGreaterThan(1);
      expect(brands.size).toBeGreaterThan(1);
    });

    it("should generate products with valid prices", () => {
      const products = generateProducts(10);
      for (const p of products) {
        expect(p.price.amount).toBeGreaterThan(0);
        expect(p.price.currency).toBe("USD");
      }
    });
  });

  // ── Stats ───────────────────────────────────────────────
  describe("Stats", () => {
    it("should compute latency stats", () => {
      const samples = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const stats = computeLatencyStats(samples);
      expect(stats.avg).toBe(55);
      expect(stats.max).toBe(100);
      expect(stats.samples).toBe(10);
      // p50, p95, p99 are computed via percentile function
      // Just verify they're within valid range
      expect(stats.p50).toBeGreaterThanOrEqual(10);
      expect(stats.p50).toBeLessThanOrEqual(100);
      expect(stats.p95).toBeGreaterThanOrEqual(stats.p50);
      expect(stats.p99).toBeGreaterThanOrEqual(stats.p95);
    });

    it("should handle single sample", () => {
      const stats = computeLatencyStats([42]);
      expect(stats.avg).toBe(42);
      expect(stats.max).toBe(42);
    });

    it("should handle empty samples", () => {
      const stats = computeLatencyStats([]);
      expect(stats.avg).toBe(0);
      expect(stats.samples).toBe(0);
    });

    it("should format durations correctly", () => {
      expect(formatMs(0.5)).toBe("500μs");
      expect(formatMs(42)).toBe("42.0ms");
      expect(formatMs(1500)).toBe("1.50s");
    });

    it("should format throughput correctly", () => {
      expect(formatProductsPerSecond(0.5)).toBe("30.0/min");
      expect(formatProductsPerSecond(50)).toBe("50.0/s");
      expect(formatProductsPerSecond(1500)).toBe("1.50k/s");
    });

    it("should format money correctly", () => {
      expect(formatMoney(299, "USD")).toBe("$2.9900 USD");
      expect(formatMoney(1, "USD")).toBe("$0.0100 USD");
    });

    it("should format MB correctly", () => {
      expect(formatMB(512)).toBe("512.0MB");
      expect(formatMB(2048)).toBe("2.00GB");
    });
  });

  // ── Benchmark Runner ────────────────────────────────────
  describe("BenchmarkRunner", () => {
    it("should run a small benchmark (100 products, skip AI)", async () => {
      const runner = new BenchmarkRunner({
        productCount: 100,
        skipAI: true,
        warmupIterations: 5,
      });

      const report = await runner.run();

      expect(report.productCount).toBe(100);
      expect(report.throughput.length).toBeGreaterThan(0);
      expect(report.latency.length).toBeGreaterThan(0);
      expect(report.memory.length).toBeGreaterThan(0);
      expect(report.summary.totalProductsProcessed).toBe(100);
      expect(report.summary.endToEndMsPerProduct).toBeGreaterThan(0);
      expect(report.summary.overallThroughput).toBeGreaterThan(0);
      expect(report.summary.bottleneck).toBeTruthy();
    });

    it("should run with AI evaluation (stub)", async () => {
      const runner = new BenchmarkRunner({
        productCount: 50,
        skipAI: false,
        warmupIterations: 5,
      });

      const report = await runner.run();

      expect(report.cost).toBeDefined();
      expect(report.cost!.productsEvaluated).toBe(50);
      expect(report.cost!.model).toBe("gpt-4o-mini");
      expect(report.cost!.totalInputTokens).toBeGreaterThan(0);
      expect(report.cost!.totalOutputTokens).toBeGreaterThan(0);
      expect(report.cost!.costPerProduct.amount).toBeGreaterThanOrEqual(0);
    });

    it("should produce a formatted report string", async () => {
      const runner = new BenchmarkRunner({
        productCount: 20,
        skipAI: true,
        warmupIterations: 0,
      });

      const report = await runner.run();
      const formatted = formatReport(report);

      expect(formatted).toContain("Benchmark Report");
      expect(formatted).toContain("Throughput");
      expect(formatted).toContain("Latency");
      expect(formatted).toContain("Summary");
      expect(formatted).toContain("Bottleneck");
    });

    it("should identify the bottleneck stage", async () => {
      const runner = new BenchmarkRunner({
        productCount: 50,
        skipAI: true,
        warmupIterations: 0,
      });

      const report = await runner.run();

      // The bottleneck should be one of the measured stages
      expect(["discovery", "normalization", "evaluation"]).toContain(report.summary.bottleneck);
    });

    it("should track memory usage", async () => {
      const runner = new BenchmarkRunner({
        productCount: 50,
        skipAI: true,
        warmupIterations: 0,
      });

      const report = await runner.run();

      expect(report.memory.length).toBeGreaterThan(0);
      expect(report.summary.peakMemoryMB).toBeGreaterThan(0);
    });
  });

  // ── Report Builder ──────────────────────────────────────
  describe("Report Builder", () => {
    it("should build summary from report data", () => {
      const partialReport: Omit<BenchmarkReport, "summary"> = {
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        totalDurationMs: 5000,
        productCount: 1000,
        throughput: [
          { stage: "discovery", productsPerSecond: 500, totalProducts: 1000, durationMs: 2000 },
          { stage: "normalization", productsPerSecond: 300, totalProducts: 1000, durationMs: 3333 },
        ],
        latency: [
          { stage: "discovery", stats: { avg: 2, p50: 2, p95: 3, p99: 4, max: 5, samples: 1000 } },
          { stage: "normalization", stats: { avg: 3.3, p50: 3, p95: 5, p99: 7, max: 10, samples: 1000 } },
        ],
        cost: {
          totalInputTokens: 450000,
          totalOutputTokens: 220000,
          totalCost: { amount: 15, currency: "USD" },
          productsEvaluated: 1000,
          costPerProduct: { amount: 0, currency: "USD" },
          costPer1kProducts: { amount: 15, currency: "USD" },
          model: "gpt-4o-mini",
        },
        memory: [
          { heapUsedMB: 50, heapTotalMB: 100, externalMB: 10, rssMB: 120, timestamp: new Date().toISOString() },
          { heapUsedMB: 80, heapTotalMB: 100, externalMB: 12, rssMB: 140, timestamp: new Date().toISOString() },
        ],
      };

      const summary = buildSummary(partialReport);
      expect(summary.totalProductsProcessed).toBe(1000);
      expect(summary.endToEndMsPerProduct).toBe(5); // 5000ms / 1000 products
      expect(summary.overallThroughput).toBe(200); // 1000 / 5s
      expect(summary.bottleneck).toBe("normalization"); // avg 3.3 > 2
      expect(summary.peakMemoryMB).toBe(80);
    });
  });
});
