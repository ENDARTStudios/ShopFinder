/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import {
  createPublicationCoordinator,
  type PublicationCoordinatorDeps,
  type PublicationEventPublisher
} from "./coordinator";
import { createPublicationRepository } from "./repository";
import { PublicationPlanner, createPublicationPlanner } from "./planner";
import { StubMarketplacePublisher, createMarketplacePublisher } from "./publisher";
import type { PublicationEvent } from "./events";
import type { CatalogEntry, CatalogEntryId } from "../catalog/types";
import type { CanonicalProductId } from "../resolution/types";
import type { ListingPolicy, MarketplaceDestination } from "./types";

function makeCatalogEntry(o?: Partial<CatalogEntry>): CatalogEntry {
  return {
    id: "cat_001" as unknown as CatalogEntryId,
    canonicalProductId: "canon_001" as unknown as CanonicalProductId,
    sku: "SKU-001",
    slug: "wireless-earbuds",
    title: "Wireless Earbuds",
    description: "High quality",
    brand: "Xiaomi",
    canonicalBrandId: "brand_xiaomi",
    category: "ELECTRONICS",
    canonicalCategoryId: "cat_electronics",
    attributes: [],
    variants: [],
    images: [
      {
        url: "https://a.com/1.jpg",
        alt: "Earbuds",
        fingerprint: { algorithm: "phash", version: "v1", value: "abc" },
        isPrimary: true
      }
    ],
    seo: {
      metaTitle: "Earbuds",
      metaDescription: "HQ",
      keywords: ["earbuds"],
      canonicalUrl: "/products/earbuds"
    },
    pricing: {
      minPrice: { amount: 2999, currency: "USD" },
      maxPrice: { amount: 3999, currency: "USD" },
      currency: "USD",
      priceRangeLabel: "$29.99-$39.99"
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

const defaultPolicy: ListingPolicy = {
  id: "default-listing-v1",
  destination: "shopify",
  shouldPublish: () => true,
  transformPayload: (entry: CatalogEntry) => ({ title: entry.title, sku: entry.sku })
};

const amazonPolicy: ListingPolicy = {
  id: "default-listing-v1",
  destination: "amazon",
  shouldPublish: () => true,
  transformPayload: (entry: CatalogEntry) => ({ title: entry.title, sku: entry.sku })
};

describe("A2.12 Marketplace Publication", () => {
  let repo: ReturnType<typeof createPublicationRepository>;

  beforeEach(() => {
    repo = createPublicationRepository();
  });

  it("should create PublicationPlans for each destination", () => {
    const policies = new Map<MarketplaceDestination, ListingPolicy>([
      ["shopify", defaultPolicy],
      ["amazon", amazonPolicy]
    ]);
    const planner = new PublicationPlanner(policies);
    const plans = planner.planAll(makeCatalogEntry(), ["shopify", "amazon"]);
    expect(plans.length).toBe(2);
    expect(plans[0]!.destination).toBe("shopify");
    expect(plans[1]!.destination).toBe("amazon");
  });

  it("should skip destinations where shouldPublish returns false", () => {
    const policies = new Map<MarketplaceDestination, ListingPolicy>([
      ["shopify", { ...defaultPolicy, shouldPublish: () => false }],
      ["amazon", amazonPolicy]
    ]);
    const planner = new PublicationPlanner(policies);
    const plans = planner.planAll(makeCatalogEntry(), ["shopify", "amazon"]);
    expect(plans.length).toBe(1);
    expect(plans[0]!.destination).toBe("amazon");
  });

  it("should publish listings via coordinator", async () => {
    const published: PublicationEvent[] = [];
    const deps: PublicationCoordinatorDeps = {
      repository: repo,
      listingPolicies: new Map([["shopify", defaultPolicy]]),
      publishers: new Map([["shopify", createMarketplacePublisher("shopify")]]),
      events: {
        async publish(events) {
          published.push(...events);
        }
      }
    };
    const coord = createPublicationCoordinator(deps);

    const result = await coord.process({
      batchId: "b1",
      catalogEntries: [makeCatalogEntry()],
      destinations: ["shopify"]
    });

    expect(result.plans.length).toBe(1);
    expect(result.listings.length).toBe(1);
    expect(result.listings[0]!.status).toBe("active");
    expect(result.metrics.listingsPublished).toBe(1);
    const types = published.map((e) => e.eventType);
    expect(types).toContain("discovery.publication.plan_created");
    expect(types).toContain("discovery.publication.listing_published");
  });

  it("should support multiple destinations", async () => {
    const deps: PublicationCoordinatorDeps = {
      repository: repo,
      listingPolicies: new Map<MarketplaceDestination, ListingPolicy>([
        ["shopify", defaultPolicy],
        ["amazon", amazonPolicy]
      ]),
      publishers: new Map([
        ["shopify", createMarketplacePublisher("shopify")],
        ["amazon", createMarketplacePublisher("amazon")]
      ])
    };
    const coord = createPublicationCoordinator(deps);

    const result = await coord.process({
      batchId: "b1",
      catalogEntries: [makeCatalogEntry()],
      destinations: ["shopify", "amazon"]
    });

    expect(result.listings.length).toBe(2);
    const dests = result.listings.map((l) => l.destination).sort();
    expect(dests).toEqual(["amazon", "shopify"]);
  });
});
