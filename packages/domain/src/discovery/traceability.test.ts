/**
 * @workspace/domain/discovery/traceability.test
 *
 * Tests for DiscoveryTraceId — the cross-cutting correlation key
 * that flows through the entire discovery pipeline.
 */
/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import {
  createTraceContext,
  propagateTraceContext,
  extractTraceId,
  sameTrace,
  generateDiscoveryTraceId,
  asDiscoveryTraceId,
  type Traceable
} from "./traceability";

describe("DiscoveryTraceId", () => {
  describe("generateDiscoveryTraceId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateDiscoveryTraceId();
      const id2 = generateDiscoveryTraceId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^trace_/);
    });
  });

  describe("createTraceContext", () => {
    it("should create a context with traceId and metadata", () => {
      const ctx = createTraceContext("planner");
      expect(ctx.traceId).toBeTruthy();
      expect(ctx.initiatedBy).toBe("planner");
      expect(ctx.initiatedAt).toBeInstanceOf(Date);
      expect(ctx.parentTraceId).toBeUndefined();
    });

    it("should support parent traceId for sub-traces", () => {
      const parent = generateDiscoveryTraceId();
      const ctx = createTraceContext("reprocessing", parent);
      expect(ctx.parentTraceId).toBe(parent);
      expect(ctx.traceId).not.toBe(parent);
    });
  });

  describe("propagateTraceContext", () => {
    it("should propagate an existing traceId", () => {
      const traceId = generateDiscoveryTraceId();
      const ctx = propagateTraceContext(traceId, "manual");
      expect(ctx.traceId).toBe(traceId);
      expect(ctx.initiatedBy).toBe("manual");
    });

    it("should accept string traceId and coerce to branded type", () => {
      const ctx = propagateTraceContext("trace_abc_123", "scheduler");
      expect(ctx.traceId as string).toBe("trace_abc_123");
    });
  });

  describe("extractTraceId", () => {
    it("should extract traceId from a traceable artifact", () => {
      const artifact: Traceable = { traceId: generateDiscoveryTraceId() };
      const extracted = extractTraceId(artifact);
      expect(extracted).toBe(artifact.traceId);
    });

    it("should return null for non-traceable artifacts", () => {
      expect(extractTraceId({ foo: "bar" })).toBeNull();
      expect(extractTraceId(null)).toBeNull();
      expect(extractTraceId(undefined)).toBeNull();
    });
  });

  describe("sameTrace", () => {
    it("should return true for artifacts with the same traceId", () => {
      const traceId = generateDiscoveryTraceId();
      const a: Traceable = { traceId };
      const b: Traceable = { traceId };
      expect(sameTrace(a, b)).toBe(true);
    });

    it("should return false for artifacts with different traceIds", () => {
      const a: Traceable = { traceId: generateDiscoveryTraceId() };
      const b: Traceable = { traceId: generateDiscoveryTraceId() };
      expect(sameTrace(a, b)).toBe(false);
    });
  });

  describe("asDiscoveryTraceId", () => {
    it("should coerce a string to a branded DiscoveryTraceId", () => {
      const id = asDiscoveryTraceId("trace_xyz");
      expect(id as string).toBe("trace_xyz");
      // The brand is compile-time only; at runtime it's a string
      expect(typeof id).toBe("string");
    });
  });

  describe("end-to-end propagation", () => {
    it("should flow traceId from PlannerContext through to artifacts", () => {
      // Simulate: Planner creates traceId → Plan carries it → Job carries it → Worker carries it
      const traceId = generateDiscoveryTraceId();
      const plan: Traceable & { id: string } = { id: "plan_001", traceId };
      const job: Traceable & { id: string } = { id: "job_001", traceId: plan.traceId };
      const workerResult: Traceable & { id: string } = { id: "wr_001", traceId: job.traceId };
      const rawRecord: Traceable & { id: string } = {
        id: "raw_001",
        traceId: workerResult.traceId
      };

      // All artifacts in the same trace
      expect(sameTrace(plan, job)).toBe(true);
      expect(sameTrace(job, workerResult)).toBe(true);
      expect(sameTrace(workerResult, rawRecord)).toBe(true);

      // Extract works at any point
      expect(extractTraceId(rawRecord)).toBe(traceId);
    });
  });
});
