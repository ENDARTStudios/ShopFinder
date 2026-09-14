/**
 * @workspace/domain/discovery/normalizer/normalizer.test
 *
 * Tests for A2.5 Product Normalizer covering all 10 refinements:
 *   R1. Produces new artifact (NormalizedProductRecord), never modifies Raw
 *   R2. semanticHash lives on Normalized, not Raw
 *   R3. Full normalizer versioning (4 version fields)
 *   R4. 7 swappable stages
 *   R5. Marketplace-agnostic canonical attributes
 *   R6. Price normalized to bands
 *   R7. Perceptual hash (phash) for images
 *   R8. 9 normalization metrics
 *   R9. 4 events published
 *   R10. normalize(record: RawProductRecord) accepts full record
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeEach } from "bun:test";
import { DefaultProductNormalizer, createProductNormalizer } from "./normalizer";
import {
  createNormalizationCoordinator,
  type NormalizationCoordinatorDeps,
  type NormalizationEventPublisher
} from "./coordinator";
import { createNormalizedProductRepository } from "./repository";
import {
  DefaultTitleNormalizer,
  DefaultBrandNormalizer,
  DefaultCategoryNormalizer,
  DefaultAttributeNormalizer,
  DefaultImageNormalizer,
  DefaultPriceNormalizer,
  DefaultSemanticHasher,
  type TitleNormalizer,
  type BrandNormalizer,
  type StageContext
} from "./stages";
import {
  canonicalizeAttributeName,
  canonicalizeAttributes,
  getKnownAttributeNames
} from "./canonical-attributes";
import { classifyPriceBand, normalizePrice, getAllPriceBands } from "./price-bands";
import { StubImageHasher, getDefaultImageHasher, setDefaultImageHasher } from "./image-hash";
import {
  DefaultNormalizerVersions,
  NORMALIZER_SCHEMA_VERSION,
  type NormalizedProductRecord,
  type RawProductRecord,
  type NormalizationStageResult
} from "./types";
import type { NormalizerEvent } from "./events";
import type { NormalizedDiscoveredProduct } from "../../marketplace";
import type { Money } from "../../shared";
import type { DiscoveryExecutionId } from "../raw-store/types";

// ── Fixtures ───────────────────────────────────────────────

function makeProduct(o?: Partial<NormalizedDiscoveredProduct>): NormalizedDiscoveredProduct {
  return {
    externalId: "ext_001",
    marketplace: "aliexpress",
    title: "  [Free Shipping] Wireless Bluetooth Earbuds  ",
    description: "test",
    category: "electronics",
    brand: "xiaomi",
    images: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
    attributes: {
      color: "Black",
      颜色: "Red",
      Colour: "Blue",
      material: "Plastic",
      weight: "50g",
      unknown_attr: "value"
    },
    price: { amount: 2999, currency: "USD" },
    currency: "USD",
    inventory: 100,
    shippingFromCountry: "CN",
    estimatedDeliveryDays: { min: 7, max: 21 },
    discoveredAt: new Date(),
    ...o
  };
}

function makeRawRecord(o?: Partial<RawProductRecord>): RawProductRecord {
  return {
    id: "raw_test_001" as unknown as RawProductRecord["id"],
    executionId: "exec_test_001" as unknown as DiscoveryExecutionId,
    providerCode: "aliexpress",
    externalId: "ext_001",
    payload: new Uint8Array([1, 2, 3]),
    payloadHash: "ph_abc123",
    discoveredAt: new Date(),
    partitionKey: "aliexpress|US|2025-01-15",
    versions: {
      schemaVersion: "1.0.0" as any,
      workflowVersion: "1.0.0",
      plannerVersion: "1.0.0",
      providerVersion: "1.2.3",
      connectorVersion: "2.0.0",
      providerManifestVersion: "manifest_v1"
    },
    ...o
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("A2.5 Product Normalizer", () => {
  // ── R1: New artifact (never modifies Raw) ──────────────
  describe("R1: produces new artifact", () => {
    it("should return a NormalizedProductRecord, not modify RawProductRecord", async () => {
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const raw = makeRawRecord();
      const rawCopy = { ...raw };
      const product = makeProduct();

      const result = await normalizer.normalize(raw, product);

      expect(result).toBeDefined();
      expect(result.id).toBeTruthy();
      expect(result.rawProductId).toBe(raw.id);
      // Raw record untouched
      expect(raw).toEqual(rawCopy);
    });

    it("should link back to rawProductId and executionId", async () => {
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const raw = makeRawRecord();
      const product = makeProduct();

      const result = await normalizer.normalize(raw, product);

      expect(result.rawProductId).toBe(raw.id);
      expect(result.executionId).toBe(raw.executionId);
      expect(result.payloadHash).toBe(raw.payloadHash);
    });
  });

  // ── R2: semanticFingerprint on Normalized, not Raw ─────
  describe("R2: semanticFingerprint on Normalized", () => {
    it("should compute semanticFingerprint on NormalizedProductRecord", async () => {
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const result = await normalizer.normalize(makeRawRecord(), makeProduct());

      expect(result.semanticFingerprint).toBeTruthy();
      expect(result.semanticFingerprint.algorithm).toBe("fnv");
      expect(result.semanticFingerprint.version).toBe("v1");
      expect(result.semanticFingerprint.value).toBeTruthy();
    });

    it("should NOT have semanticHash on RawProductRecord", () => {
      const raw = makeRawRecord();
      expect((raw as unknown as Record<string, unknown>).semanticHash).toBeUndefined();
    });
  });

  // ── R3: Full normalizer versioning ─────────────────────
  describe("R3: full normalizer versioning", () => {
    it("should carry 4 version fields on NormalizedProductRecord", async () => {
      const versions = {
        normalizerVersion: "2.0.0",
        taxonomyVersion: "1.5.0",
        attributeDictionaryVersion: "3.0.0",
        translationModelVersion: "1.1.0"
      };
      const normalizer = new DefaultProductNormalizer(versions);
      const result = await normalizer.normalize(makeRawRecord(), makeProduct());

      expect(result.normalizerVersions.normalizerVersion).toBe("2.0.0");
      expect(result.normalizerVersions.taxonomyVersion).toBe("1.5.0");
      expect(result.normalizerVersions.attributeDictionaryVersion).toBe("3.0.0");
      expect(result.normalizerVersions.translationModelVersion).toBe("1.1.0");
    });

    it("should preserve rawVersions from the RawProductRecord", async () => {
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const raw = makeRawRecord();
      const result = await normalizer.normalize(raw, makeProduct());

      expect(result.rawVersions).toEqual(raw.versions);
    });

    it("should produce different IDs when normalizerVersion changes", async () => {
      const v1 = { ...DefaultNormalizerVersions, normalizerVersion: "1.0.0" };
      const v2 = { ...DefaultNormalizerVersions, normalizerVersion: "2.0.0" };
      const n1 = new DefaultProductNormalizer(v1);
      const n2 = new DefaultProductNormalizer(v2);
      const raw = makeRawRecord();
      const product = makeProduct();

      const r1 = await n1.normalize(raw, product);
      const r2 = await n2.normalize(raw, product);

      expect(r1.id).not.toBe(r2.id);
    });
  });

  // ── R4: 7 swappable stages ─────────────────────────────
  describe("R4: 7 swappable stages", () => {
    it("should accept custom TitleNormalizer", async () => {
      const customTitle: TitleNormalizer = {
        async normalize(
          raw: string,
          _ctx: StageContext
        ): Promise<NormalizationStageResult<string>> {
          return { value: `CUSTOM:${raw.trim()}`, warnings: [], confidence: 1.0 };
        }
      };
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions, {
        titleNormalizer: customTitle
      });
      const result = await normalizer.normalize(makeRawRecord(), makeProduct());

      expect(result.normalizedTitle).toContain("CUSTOM:");
    });

    it("should accept custom BrandNormalizer", async () => {
      const customBrand: BrandNormalizer = {
        async normalize(raw, _ctx) {
          return {
            value: raw ? `BRAND:${raw.toUpperCase()}` : "UNKNOWN",
            warnings: [],
            confidence: 0.95
          };
        }
      };
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions, {
        brandNormalizer: customBrand
      });
      const result = await normalizer.normalize(makeRawRecord(), makeProduct({ brand: "nike" }));

      expect(result.normalizedBrand).toBe("BRAND:NIKE");
    });

    it("should run all 7 stages and populate all normalized fields", async () => {
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const result = await normalizer.normalize(makeRawRecord(), makeProduct());

      expect(result.normalizedTitle).toBeTruthy();
      expect(result.normalizedBrand).toBeTruthy();
      expect(result.normalizedCategory).toBeTruthy();
      expect(result.normalizedAttributes.length).toBeGreaterThan(0);
      expect(result.normalizedImages.length).toBe(2);
      expect(result.normalizedPrice).toBeDefined();
      expect(result.semanticFingerprint).toBeTruthy();
    });
  });

  // ── R5: Marketplace-agnostic canonical attributes ──────
  describe("R5: marketplace-agnostic attributes", () => {
    it("should map color/colour/cor/颜色 all to COLOR", () => {
      expect(canonicalizeAttributeName("color")).toBe("COLOR");
      expect(canonicalizeAttributeName("Colour")).toBe("COLOR");
      expect(canonicalizeAttributeName("cor")).toBe("COLOR");
      expect(canonicalizeAttributeName("颜色")).toBe("COLOR");
    });

    it("should NOT prefix with marketplace name", async () => {
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const result = await normalizer.normalize(
        makeRawRecord({ providerCode: "aliexpress" }),
        makeProduct({ attributes: { color: "red" } })
      );

      const colorAttr = result.normalizedAttributes.find((a) => a.name === "COLOR");
      expect(colorAttr).toBeDefined();
      expect(colorAttr!.value).toBe("red");
      // Never "AliExpressColor"
      expect(colorAttr!.name).not.toContain("aliexpress");
    });

    it("should skip unknown attributes", () => {
      const canonical = canonicalizeAttributes({ color: "red", unknown_xyz: "val" });
      expect(canonical.length).toBe(1);
      expect(canonical[0]!.name).toBe("COLOR");
    });

    it("should expose a known attribute name list", () => {
      const known = getKnownAttributeNames();
      expect(known.length).toBeGreaterThan(5);
      expect(known).toContain("COLOR");
      expect(known).toContain("SIZE");
      expect(known).toContain("MATERIAL");
    });
  });

  // ── R6: Price bands ────────────────────────────────────
  describe("R6: price bands", () => {
    it("should classify prices into bands", () => {
      expect(classifyPriceBand(5)).toBe("0-10");
      expect(classifyPriceBand(15)).toBe("10-20");
      expect(classifyPriceBand(30)).toBe("20-50");
      expect(classifyPriceBand(75)).toBe("50-100");
      expect(classifyPriceBand(150)).toBe("100-250");
      expect(classifyPriceBand(300)).toBe("250-500");
      expect(classifyPriceBand(750)).toBe("500-1000");
      expect(classifyPriceBand(1500)).toBe("1000-2500");
      expect(classifyPriceBand(3000)).toBe("2500-5000");
      expect(classifyPriceBand(9999)).toBe("5000+");
    });

    it("should normalize price to band form", () => {
      const np = normalizePrice(2999, "usd");
      expect(np.band).toBe("2500-5000");
      expect(np.currency).toBe("USD");
      expect(np.originalAmount).toBe(2999);
    });

    it("should expose all 10 bands", () => {
      expect(getAllPriceBands().length).toBe(10);
    });

    it("should produce band-based normalizedPrice on NormalizedProductRecord", async () => {
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const result = await normalizer.normalize(
        makeRawRecord(),
        makeProduct({ price: { amount: 25, currency: "USD" } as Money })
      );
      expect(result.normalizedPrice.band).toBe("20-50");
      expect(result.normalizedPrice.originalAmount).toBe(25);
    });
  });

  // ── R7: Perceptual hash ────────────────────────────────
  describe("R7: perceptual hash", () => {
    it("should compute phash for each image", async () => {
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const result = await normalizer.normalize(
        makeRawRecord(),
        makeProduct({ images: ["https://a.com/1.jpg", "https://b.com/2.jpg"] })
      );

      expect(result.normalizedImages.length).toBe(2);
      for (const img of result.normalizedImages) {
        expect(img.fingerprint).toBeTruthy();
        expect(img.fingerprint.value).toBeTruthy();
        expect(img.fingerprint.algorithm).toBe("stub-phash-v1");
      }
    });

    it("should support swapping image hasher", async () => {
      const customHasher = new StubImageHasher();
      setDefaultImageHasher(customHasher);
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const result = await normalizer.normalize(
        makeRawRecord(),
        makeProduct({ images: ["https://x.com/img.jpg"] })
      );
      expect(result.normalizedImages[0]!.fingerprint.value).toBeTruthy();
    });
  });

  // ── R8: Normalization metrics ──────────────────────────
  describe("R8: normalization metrics", () => {
    it("should track 9 quality metrics via coordinator", async () => {
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const repo = createNormalizedProductRepository();
      const deps: NormalizationCoordinatorDeps = {
        normalizer,
        repository: repo
      };
      const coordinator = createNormalizationCoordinator(deps);

      const rawRecords = [
        { record: makeRawRecord(), product: makeProduct() },
        {
          record: makeRawRecord({ id: "raw_002" as any, payloadHash: "ph_002" }),
          product: makeProduct({ brand: undefined, category: undefined })
        }
      ];

      const result = await coordinator.normalizeBatch({
        executionId: "exec_test_001" as any,
        rawRecords,
        region: "US",
        language: "en",
        versions: DefaultNormalizerVersions
      });

      expect(result.metrics.titlesNormalized).toBe(2);
      expect(result.metrics.brandsResolved).toBe(1); // first resolved, second unknown
      expect(result.metrics.unknownBrands).toBe(1);
      expect(result.metrics.semanticHashesCreated).toBe(2);
      expect(result.metrics.imagesProcessed).toBe(4); // 2 images per product
      expect(result.metrics.attributeCoverage).toBeGreaterThan(0);
      expect(result.metrics.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ── R9: 4 events ───────────────────────────────────────
  describe("R9: events", () => {
    it("should emit 4 events in correct order", async () => {
      const published: NormalizerEvent[] = [];
      const eventPublisher: NormalizationEventPublisher = {
        async publish(events) {
          published.push(...events);
        }
      };
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const deps: NormalizationCoordinatorDeps = {
        normalizer,
        repository: createNormalizedProductRepository(),
        events: eventPublisher
      };
      const coordinator = createNormalizationCoordinator(deps);

      await coordinator.normalizeBatch({
        executionId: "exec_test_001" as any,
        rawRecords: [{ record: makeRawRecord(), product: makeProduct() }],
        region: "US",
        language: "en",
        versions: DefaultNormalizerVersions
      });

      // 4 events: Started, ProductsCreated, SemanticHashesGenerated, Completed
      expect(published.length).toBe(4);
      expect(published[0]!.eventType).toBe("discovery.normalization.started");
      expect(published[1]!.eventType).toBe("discovery.normalization.products_created");
      expect(published[2]!.eventType).toBe("discovery.normalization.semantic_hashes_generated");
      expect(published[3]!.eventType).toBe("discovery.normalization.completed");
    });

    it("should carry versions in all event payloads", async () => {
      const published: NormalizerEvent[] = [];
      const deps: NormalizationCoordinatorDeps = {
        normalizer: new DefaultProductNormalizer(DefaultNormalizerVersions),
        repository: createNormalizedProductRepository(),
        events: {
          async publish(events) {
            published.push(...events);
          }
        }
      };
      const coordinator = createNormalizationCoordinator(deps);

      await coordinator.normalizeBatch({
        executionId: "exec_001" as any,
        rawRecords: [{ record: makeRawRecord(), product: makeProduct() }],
        region: "US",
        language: "en",
        versions: DefaultNormalizerVersions
      });

      for (const evt of published) {
        const payload = evt.payload as any;
        expect(payload.schemaVersion).toBe(NORMALIZER_SCHEMA_VERSION);
        expect(payload.normalizerVersion).toBe(DefaultNormalizerVersions.normalizerVersion);
        expect(payload.taxonomyVersion).toBe(DefaultNormalizerVersions.taxonomyVersion);
      }
    });
  });

  // ── R10: Accepts full record ───────────────────────────
  describe("R10: accepts full RawProductRecord", () => {
    it("should use record.providerCode for context", async () => {
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const raw = makeRawRecord({ providerCode: "temu" });
      const result = await normalizer.normalize(raw, makeProduct());

      expect(result.providerCode).toBe("temu");
    });

    it("should use record.partitionKey for region extraction", async () => {
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const raw = makeRawRecord({ partitionKey: "aliexpress|BR|2025-06-15" });
      const result = await normalizer.normalize(raw, makeProduct());

      expect(result.region).toBe("BR");
      expect(result.partitionKey).toBe("aliexpress|BR|2025-06-15");
    });

    it("should preserve rawVersions on the NormalizedProductRecord", async () => {
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const raw = makeRawRecord();
      const result = await normalizer.normalize(raw, makeProduct());

      expect(result.rawVersions).toBe(raw.versions);
    });
  });

  // ── Repository ─────────────────────────────────────────
  describe("NormalizedProductRepository", () => {
    it("should be append-only (idempotent re-append)", async () => {
      const repo = createNormalizedProductRepository();
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const record = await normalizer.normalize(makeRawRecord(), makeProduct());

      await repo.append(record);
      await repo.append(record); // idempotent

      expect(repo.recordCount).toBe(1);
    });

    it("should findBySemanticHash", async () => {
      const repo = createNormalizedProductRepository();
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const record = await normalizer.normalize(makeRawRecord(), makeProduct());
      await repo.append(record);

      const found = await repo.findBySemanticHash(record.semanticFingerprint.value);
      expect(found.length).toBe(1);
      expect(found[0]!.id).toBe(record.id);
    });

    it("should stream normalized records", async () => {
      const repo = createNormalizedProductRepository();
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const record = await normalizer.normalize(makeRawRecord(), makeProduct());
      await repo.append(record);

      let count = 0;
      for await (const _ of repo.stream({})) count++;
      expect(count).toBe(1);
    });
  });

  // ── Confidence + warnings ──────────────────────────────
  describe("confidence and warnings", () => {
    it("should compute overall confidenceScore", async () => {
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const result = await normalizer.normalize(makeRawRecord(), makeProduct());

      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });

    it("should collect warnings from stages", async () => {
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      const result = await normalizer.normalize(
        makeRawRecord(),
        makeProduct({ brand: undefined, category: undefined })
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("brand"))).toBe(true);
    });
  });
});
