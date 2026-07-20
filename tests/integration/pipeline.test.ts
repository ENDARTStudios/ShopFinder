/**
 * ShopFinder — Pipeline Integration Tests
 *
 * Tests that the pipeline script correctly materializes products
 * into the database with enriched attributes, evidence, and offers.
 *
 * Run: bun test tests/integration/pipeline.test.ts
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeAll } from "bun:test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("Pipeline Integration", () => {
  beforeAll(async () => {
    // Ensure we have pipeline products
    const count = await prisma.product.count({
      where: { sku: { startsWith: "SF-PIPE-" }, deletedAt: null }
    });
    if (count === 0) {
      throw new Error("No pipeline products found. Run: bun run scripts/run-pipeline.ts");
    }
  });

  it("should have pipeline products with SF-PIPE- prefix", async () => {
    const count = await prisma.product.count({
      where: { sku: { startsWith: "SF-PIPE-" }, deletedAt: null }
    });
    expect(count).toBeGreaterThan(0);
  });

  it("should have enriched attributes with source and confidence", async () => {
    const enriched = await prisma.productAttribute.findFirst({
      where: {
        source: { not: null },
        confidence: { not: null }
      }
    });
    expect(enriched).not.toBeNull();
    expect(enriched?.source).toBe("manufacturer");
    expect(enriched?.confidence).toBeGreaterThan(0);
  });

  it("should have evidence JSON in enriched attributes", async () => {
    const attr = await prisma.productAttribute.findFirst({
      where: {
        evidence: { not: null }
      }
    });
    expect(attr).not.toBeNull();
    expect(attr?.evidence).toBeTruthy();

    const evidence = JSON.parse(attr!.evidence!);
    expect(Array.isArray(evidence)).toBe(true);
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence[0].sourceType).toBeDefined();
    expect(evidence[0].confidence).toBeDefined();
    expect(evidence[0].url).toBeDefined();
  });

  it("should have offers from multiple suppliers per product", async () => {
    const products = await prisma.product.findMany({
      where: { sku: { startsWith: "SF-PIPE-" }, deletedAt: null },
      include: {
        offers: { where: { deletedAt: null } }
      },
      take: 5
    });

    for (const p of products) {
      expect(p.offers.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("should have canonical attribute names from ontology", async () => {
    const canonicalAttrs = await prisma.productAttribute.findMany({
      where: {
        name: { startsWith: "cpu." },
        source: { not: null }
      },
      take: 5
    });

    expect(canonicalAttrs.length).toBeGreaterThan(0);
    for (const a of canonicalAttrs) {
      expect(a.name).toMatch(/^(cpu|gpu|motherboard|memory|storage|psu|cooling|case|display)\./);
    }
  });

  it("should have trace ID in product description", async () => {
    const product = await prisma.product.findFirst({
      where: { sku: { startsWith: "SF-PIPE-" }, deletedAt: null }
    });
    expect(product).not.toBeNull();
    expect(product?.description).toContain("Trace: trace_pipeline_");
  });

  it("should have manufacturer in product description", async () => {
    const product = await prisma.product.findFirst({
      where: { sku: { startsWith: "SF-PIPE-" }, deletedAt: null }
    });
    expect(product).not.toBeNull();
    expect(product?.description).toContain("Manufacturer:");
  });

  it("should be idempotent — re-running pipeline should not duplicate", async () => {
    // Count products before
    const beforeCount = await prisma.product.count({
      where: { sku: { startsWith: "SF-PIPE-" }, deletedAt: null }
    });

    // The pipeline uses upsert, so running again should not create duplicates.
    // We don't re-run the pipeline here (it's slow), but we verify no duplicate SKUs.
    const duplicateSkus = await prisma.product.groupBy({
      by: ["sku"],
      where: { sku: { startsWith: "SF-PIPE-" } },
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } }
    });

    expect(duplicateSkus.length).toBe(0);
  });

  it("should have product media with gradient data", async () => {
    const media = await prisma.productMedia.findFirst({
      where: { url: { startsWith: "data:gradient;" } }
    });
    expect(media).not.toBeNull();
    expect(media?.url).toContain("linear-gradient");
  });
});
