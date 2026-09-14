/**
 * @workspace/infrastructure/connectors/amazon/mapper.test
 *
 * Tests for the Amazon mapper — validates ALL payload transformation
 * without depending on the network.
 */
/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import { AmazonProductMapper } from "./mapper";
import type { ParsedAmazonCatalogItem } from "./parser";

function makeItem(o?: Partial<ParsedAmazonCatalogItem>): ParsedAmazonCatalogItem {
  return {
    asin: "B0D1234567",
    title: "Wireless Bluetooth Earbuds Pro",
    brand: "Sony",
    browseClassification: "12097479011",
    browseClassificationName: "Earbud & In-Ear Headphones",
    images: [
      { url: "https://m.media-amazon.com/images/I/61abc123456._AC_SL1500_.jpg", variant: "MAIN", height: 1500, width: 1500 },
      { url: "https://m.media-amazon.com/images/I/71def789012._AC_SL1500_.jpg", variant: "PT01", height: 1500, width: 1500 },
    ],
    attributes: {
      item_name: [{ value: "Wireless Bluetooth Earbuds Pro", language_tag: "en_US" }],
      brand: [{ value: "Sony" }],
      color: [{ value: "Black" }],
      material: [{ value: "Silicone" }],
    },
    listPrice: { amount: 149.99, currency: "USD" },
    productTypes: ["HEADPHONES"],
    ...o,
  };
}

describe("Amazon Mapper", () => {
  const mapper = new AmazonProductMapper();

  it("should map a complete product with all fields", () => {
    const result = mapper.map(makeItem());

    expect(result.externalId).toBe("B0D1234567");
    expect(result.title).toContain("Wireless Bluetooth Earbuds");
    expect(result.marketplace).toBe("amazon");
    expect(result.brand).toBe("Sony");
    expect(result.sourceUrl).toContain("/dp/B0D1234567");
    expect(result.supplierName).toBe("Amazon");
  });

  it("should prefer MAIN variant images first", () => {
    const result = mapper.map(makeItem({
      images: [
        { url: "https://pt01.jpg", variant: "PT01" },
        { url: "https://main.jpg", variant: "MAIN" },
        { url: "https://pt02.jpg", variant: "PT02" },
      ],
    }));

    expect(result.images[0]).toBe("https://main.jpg");
    expect(result.images[1]).toBe("https://pt01.jpg");
    expect(result.images[2]).toBe("https://pt02.jpg");
  });

  it("should deduplicate image URLs", () => {
    const result = mapper.map(makeItem({
      images: [
        { url: "https://dup.jpg", variant: "MAIN" },
        { url: "https://dup.jpg", variant: "MAIN" },
      ],
    }));

    expect(result.images.length).toBe(1);
  });

  it("should handle product with no images", () => {
    const result = mapper.map(makeItem({ images: undefined }));
    expect(result.images).toEqual([]);
  });

  it("should map attributes from Amazon's nested format", () => {
    const result = mapper.map(makeItem({
      attributes: {
        item_name: [{ value: "Test Product", language_tag: "en_US" }],
        brand: [{ value: "TestBrand" }],
        color: [{ value: "Blue" }],
        numeric_attr: [{ value: 42 }],
      },
    }));

    expect(result.attributes["item_name"]).toBe("Test Product");
    expect(result.attributes["brand"]).toBe("TestBrand");
    expect(result.attributes["color"]).toBe("Blue");
    expect(result.attributes["Brand"]).toBe("Sony"); // from item.brand
  });

  it("should handle product with no attributes", () => {
    const result = mapper.map(makeItem({ attributes: undefined }));
    expect(result.attributes["Brand"]).toBe("Sony");
  });

  it("should convert list price to cents", () => {
    const result = mapper.map(makeItem({ listPrice: { amount: 149.99, currency: "USD" } }));
    expect(result.price.amount).toBe(14999); // $149.99 in cents
    expect(result.price.currency).toBe("USD");
    expect(result.currency).toBe("USD");
  });

  it("should handle missing price", () => {
    const result = mapper.map(makeItem({ listPrice: undefined }));
    expect(result.price.amount).toBe(0);
  });

  it("should preserve currency from list price", () => {
    const result = mapper.map(makeItem({ listPrice: { amount: 99.90, currency: "BRL" } }));
    expect(result.price.currency).toBe("BRL");
    expect(result.currency).toBe("BRL");
  });

  it("should map browse classification name as category", () => {
    const result = mapper.map(makeItem({
      browseClassificationName: "Earbud & In-Ear Headphones",
      browseClassification: "12097479011",
    }));
    expect(result.category).toBe("Earbud & In-Ear Headphones");
  });

  it("should fall back to classification ID when name missing", () => {
    const result = mapper.map(makeItem({
      browseClassificationName: undefined,
      browseClassification: "12097479011",
    }));
    expect(result.category).toBe("12097479011");
  });

  it("should include product types in attributes", () => {
    const result = mapper.map(makeItem({ productTypes: ["HEADPHONES", "WIRELESS"] }));
    expect(result.attributes["product_type"]).toBe("HEADPHONES, WIRELESS");
  });

  it("should handle minimal product (ASIN only)", () => {
    const result = mapper.map(makeItem({
      asin: "B0MINIMAL",
      title: undefined,
      brand: undefined,
      images: undefined,
      attributes: undefined,
      listPrice: undefined,
      browseClassification: undefined,
      browseClassificationName: undefined,
      productTypes: [],
    }));

    expect(result.externalId).toBe("B0MINIMAL");
    expect(result.title).toContain("B0MINIMAL");
    expect(result.images).toEqual([]);
    expect(result.price.amount).toBe(0);
    expect(result.brand).toBeUndefined();
    expect(result.category).toBeUndefined();
  });

  it("should map multiple products via mapAll", () => {
    const items = [
      makeItem({ asin: "B001", title: "Product A" }),
      makeItem({ asin: "B002", title: "Product B" }),
      makeItem({ asin: "B003", title: "Product C" }),
    ];
    const results = mapper.mapAll(items);

    expect(results.length).toBe(3);
    expect(results[0]!.externalId).toBe("B001");
    expect(results[2]!.title).toBe("Product C");
  });
});
