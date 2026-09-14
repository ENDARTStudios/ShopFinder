/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import {
  createSearchIndexCoordinator,
  type SearchIndexCoordinatorDeps,
  type SearchEventPublisher
} from "./coordinator";
import { DefaultSearchIndexer, createSearchIndexer } from "./indexer";
import { createSearchIndexRepository } from "./repository";
import type { SearchEvent } from "./events";
import type { CatalogEntry, CatalogEntryId } from "./types";
import type { CanonicalProductId } from "../resolution/types";

function makeCatalogEntry(o?: Partial<CatalogEntry>): CatalogEntry {
  return {
    id: "cat_001" as unknown as CatalogEntryId,
    canonicalProductId: "canon_001" as unknown as CanonicalProductId,
    sku: "SKU-001",
    slug: "wireless-earbuds",
    title: "Wireless Bluetooth Earbuds",
    description: "High quality earbuds",
    brand: "Xiaomi",
    canonicalBrandId: "brand_xiaomi",
    category: "ELECTRONICS",
    canonicalCategoryId: "cat_electronics",
    attributes: [{ name: "COLOR", value: "black", sourceProductId: "n1" }],
    variants: [
      {
        sku: "SKU-001-001",
        name: "black",
        attributes: [{ name: "COLOR", value: "black" }],
        price: { amount: 2999, currency: "USD" },
        inventory: 50
      }
    ],
    images: [
      {
        url: "https://a.com/1.jpg",
        alt: "Earbuds",
        fingerprint: { algorithm: "phash", version: "v1", value: "abc" },
        isPrimary: true
      }
    ],
    seo: {
      metaTitle: "Wireless Earbuds",
      metaDescription: "High quality",
      keywords: ["earbuds", "wireless"],
      canonicalUrl: "/products/wireless-earbuds"
    },
    pricing: {
      minPrice: { amount: 2999, currency: "USD" },
      maxPrice: { amount: 3999, currency: "USD" },
      currency: "USD",
      priceRangeLabel: "$29.99 - $39.99"
    },
    supplierCount: 2,
    offerCount: 3,
    evaluationSummary: {
      overallScore: 72,
      recommendation: "publish",
      confidence: 0.85,
      complianceStatus: "approved"
    },
    materializedAt: new Date(),
    materializerVersion: "1.0.0",
    schemaVersion: "1.0.0",
    ...o
  };
}

describe("A2.11 Search Index", () => {
  let repo: ReturnType<typeof createSearchIndexRepository>;

  beforeEach(() => {
    repo = createSearchIndexRepository();
  });

  describe("Indexer", () => {
    it("should index a CatalogEntry", async () => {
      const indexer = new DefaultSearchIndexer(repo);
      const entry = makeCatalogEntry();
      const indexed = await indexer.index(entry);

      expect(indexed.catalogEntryId).toBe(entry.id);
      expect(indexed.title).toBe(entry.title);
      expect(indexed.keywords).toEqual(entry.seo.keywords);
      expect(indexed.overallScore).toBe(72);
      expect(indexed.schemaVersion).toBe("1.0.0");
    });

    it("should remove from index", async () => {
      const indexer = new DefaultSearchIndexer(repo);
      const entry = makeCatalogEntry();
      await indexer.index(entry);
      expect(repo.entryCount).toBe(1);

      const removed = await indexer.remove(entry.id);
      expect(removed).toBe(true);
      expect(repo.entryCount).toBe(0);
    });
  });

  describe("Search", () => {
    it("should search by text", async () => {
      const indexer = new DefaultSearchIndexer(repo);
      await indexer.index(makeCatalogEntry({ title: "Wireless Earbuds" }));
      await indexer.index(
        makeCatalogEntry({
          id: "cat_002" as any,
          title: "USB Cable",
          description: "High quality cable",
          seo: {
            metaTitle: "USB",
            metaDescription: "cable",
            keywords: ["usb"],
            canonicalUrl: "/usb"
          }
        })
      );

      const result = await indexer.search({ text: "earbuds" });
      expect(result.total).toBe(1);
      expect(result.entries[0]!.title).toContain("Earbuds");
    });

    it("should filter by brand", async () => {
      const indexer = new DefaultSearchIndexer(repo);
      await indexer.index(makeCatalogEntry({ brand: "Xiaomi" }));
      await indexer.index(makeCatalogEntry({ id: "cat_002" as any, brand: "Apple" }));

      const result = await indexer.search({ brand: "Xiaomi" });
      expect(result.total).toBe(1);
    });

    it("should filter by minScore", async () => {
      const indexer = new DefaultSearchIndexer(repo);
      await indexer.index(
        makeCatalogEntry({
          evaluationSummary: {
            overallScore: 80,
            recommendation: "publish",
            confidence: 0.9,
            complianceStatus: "approved"
          }
        })
      );
      await indexer.index(
        makeCatalogEntry({
          id: "cat_002" as any,
          evaluationSummary: {
            overallScore: 50,
            recommendation: "review",
            confidence: 0.5,
            complianceStatus: "approved"
          }
        })
      );

      const result = await indexer.search({ minScore: 70 });
      expect(result.total).toBe(1);
      expect(result.entries[0]!.overallScore).toBe(80);
    });

    it("should sort by score descending", async () => {
      const indexer = new DefaultSearchIndexer(repo);
      await indexer.index(
        makeCatalogEntry({
          evaluationSummary: {
            overallScore: 60,
            recommendation: "publish",
            confidence: 0.8,
            complianceStatus: "approved"
          }
        })
      );
      await indexer.index(
        makeCatalogEntry({
          id: "cat_002" as any,
          evaluationSummary: {
            overallScore: 90,
            recommendation: "publish",
            confidence: 0.9,
            complianceStatus: "approved"
          }
        })
      );

      const result = await indexer.search({});
      expect(result.entries[0]!.overallScore).toBeGreaterThan(result.entries[1]!.overallScore);
    });
  });

  describe("Coordinator (event-driven)", () => {
    it("should index on CatalogPublished event", async () => {
      const published: SearchEvent[] = [];
      const deps: SearchIndexCoordinatorDeps = {
        indexer: createSearchIndexer(repo),
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      };
      const coord = createSearchIndexCoordinator(deps);

      await coord.onCatalogPublished(makeCatalogEntry());

      expect(repo.entryCount).toBe(1);
      expect(published.length).toBe(1);
      expect(published[0]!.eventType).toBe("discovery.search.index_updated");
    });

    it("should remove on catalog removal event", async () => {
      const published: SearchEvent[] = [];
      const deps: SearchIndexCoordinatorDeps = {
        indexer: createSearchIndexer(repo),
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      };
      const coord = createSearchIndexCoordinator(deps);

      const entry = makeCatalogEntry();
      await coord.onCatalogPublished(entry);
      await coord.onCatalogRemoved(entry.id);

      expect(repo.entryCount).toBe(0);
      expect(published.length).toBe(2);
      expect(published[1]!.eventType).toBe("discovery.search.index_removed");
    });
  });
});
