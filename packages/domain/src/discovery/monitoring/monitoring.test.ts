/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import { createStageMetricsCollector } from "./collector";
import { DefaultBusinessMetricsAggregator, createBusinessMetricsAggregator } from "./aggregator";
import type { StageMetrics, PipelineStage } from "./types";

function makeStageMetrics(stage: PipelineStage, o?: Partial<StageMetrics>): StageMetrics {
  return {
    id: `sm_${stage}_${Date.now()}` as any,
    stage,
    batchId: "b1",
    itemsProcessed: 100,
    itemsSucceeded: 95,
    itemsFailed: 5,
    durationMs: 1000,
    throughput: 100,
    errorRate: 0.05,
    customMetrics: {},
    capturedAt: new Date(),
    schemaVersion: "1.0.0",
    ...o
  };
}

describe("A2.15 Monitoring", () => {
  describe("StageMetricsCollector", () => {
    it("should record and retrieve metrics", () => {
      const collector = createStageMetricsCollector();
      collector.record("planner", {
        stage: "planner",
        batchId: "b1",
        itemsProcessed: 50,
        itemsSucceeded: 48,
        itemsFailed: 2,
        durationMs: 500,
        throughput: 100,
        errorRate: 0.04,
        customMetrics: { plansCreated: 48 }
      });

      expect(collector.getAll().length).toBe(1);
      expect(collector.getByStage("planner").length).toBe(1);
    });

    it("should clear metrics", () => {
      const collector = createStageMetricsCollector();
      collector.record("worker", {
        stage: "worker",
        batchId: "b1",
        itemsProcessed: 1,
        itemsSucceeded: 1,
        itemsFailed: 0,
        durationMs: 100,
        throughput: 10,
        errorRate: 0,
        customMetrics: {}
      });
      collector.clear();
      expect(collector.getAll().length).toBe(0);
    });
  });

  describe("BusinessMetricsAggregator", () => {
    it("should aggregate stage metrics into business metrics", () => {
      const aggregator = createBusinessMetricsAggregator();
      const stageMetrics: StageMetrics[] = [
        makeStageMetrics("planner"),
        makeStageMetrics("worker", { itemsProcessed: 200, itemsFailed: 10, errorRate: 0.05 }),
        makeStageMetrics("normalizer", { itemsProcessed: 150, itemsFailed: 3, errorRate: 0.02 })
      ];

      const snapshot = aggregator.aggregate(stageMetrics);

      expect(snapshot.metrics.length).toBeGreaterThan(0);
      expect(snapshot.pipelineHealth).toBe("healthy");
      expect(snapshot.schemaVersion).toBe("1.0.0");
    });

    it("should detect degraded pipeline (>10% error rate)", () => {
      const aggregator = createBusinessMetricsAggregator();
      const stageMetrics: StageMetrics[] = [
        makeStageMetrics("worker", { itemsProcessed: 100, itemsFailed: 15, errorRate: 0.15 })
      ];

      const snapshot = aggregator.aggregate(stageMetrics);
      expect(snapshot.pipelineHealth).toBe("degraded");
    });

    it("should detect critical pipeline (>25% error rate)", () => {
      const aggregator = createBusinessMetricsAggregator();
      const stageMetrics: StageMetrics[] = [
        makeStageMetrics("worker", { itemsProcessed: 100, itemsFailed: 30, errorRate: 0.3 })
      ];

      const snapshot = aggregator.aggregate(stageMetrics);
      expect(snapshot.pipelineHealth).toBe("critical");
    });

    it("should produce per-stage throughput metrics", () => {
      const aggregator = createBusinessMetricsAggregator();
      const snapshot = aggregator.aggregate([
        makeStageMetrics("planner", { throughput: 50 }),
        makeStageMetrics("worker", { throughput: 100 })
      ]);

      const plannerThroughput = snapshot.metrics.find((m) => m.name === "planner.throughput");
      const workerThroughput = snapshot.metrics.find((m) => m.name === "worker.throughput");
      expect(plannerThroughput?.value).toBe(50);
      expect(workerThroughput?.value).toBe(100);
    });

    it("should produce aggregate pipeline metrics", () => {
      const aggregator = createBusinessMetricsAggregator();
      const snapshot = aggregator.aggregate([
        makeStageMetrics("planner", { itemsProcessed: 100, itemsFailed: 5 }),
        makeStageMetrics("worker", { itemsProcessed: 200, itemsFailed: 10 })
      ]);

      const totalItems = snapshot.metrics.find((m) => m.name === "pipeline.total_items");
      const totalErrors = snapshot.metrics.find((m) => m.name === "pipeline.total_errors");
      expect(totalItems?.value).toBe(300);
      expect(totalErrors?.value).toBe(15);
    });
  });
});
