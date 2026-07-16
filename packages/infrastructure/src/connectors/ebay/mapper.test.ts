/**
 * @workspace/infrastructure/connectors/ebay/mapper.test
 *
 * Tests for the eBay mapper.
 */
/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import { EbayProductMapper } from "./mapper";
import type { ParsedEbayItem } from "./parser";

function makeItem(o?: Partial<ParsedEbayItem>): ParsedEbayItem {
  return {
    itemId: "v1|1234567890|0",
    title: "Intel Core i9-14900K Desktop Processor",
    price: { value: "549.99", currency: "USD" },
    image: { imageUrl: "https://i.ebayimg.com/main.jpg" },
    additionalImages: [
      { imageUrl: "https://i.ebayimg.com/alt1.jpg" },
      { imageUrl: "https://i.ebayimg.com/alt2.jpg" },
    ],
    brand: "Intel",
    categoryPath: "Computers:CPUs",
    categoryId: "27386",
    condition: "New",
    itemWebUrl: "https://www.ebay.com/itm/1234567890",
    seller: { username: "tech_store", feedbackPercentage: "99.5" },
    shippingOptions: [{ shippingCost: { value: "0.00", currency: "USD" }, type: "FREE" }],
    itemLocation: { country: "US" },
    shortDescription: "Brand new Intel processor",
    ...o,
  };
}

describe("eBay Mapper", () => {
  const mapper = new EbayProductMapper();

  it("should map a complete product", () => {
    const result = mapper.map(makeItem());

    expect(result.externalId).toBe("v1|1234567890|0");
    expect(result.title).toContain("Intel Core i9");
    expect(result.marketplace).toBe("ebay");
    expect(result.brand).toBe("Intel");
    expect(result.sourceUrl).toContain("ebay.com/itm/1234567890");
    expect(result.supplierName).toBe("tech_store");
  });

  it("should map price to cents", () => {
    const result = mapper.map(makeItem({ price: { value: "549.99", currency: "USD" } }));
    expect(result.price.amount).toBe(54999);
    expect(result.price.currency).toBe("USD");
  });

  it("should handle missing price", () => {
    const result = mapper.map(makeItem({ price: undefined }));
    expect(result.price.amount).toBe(0);
  });

  it("should collect all images without duplicates", () => {
    const result = mapper.map(makeItem({
      image: { imageUrl: "https://dup.jpg" },
      additionalImages: [{ imageUrl: "https://dup.jpg" }, { imageUrl: "https://other.jpg" }],
    }));
    expect(result.images.length).toBe(2);
    expect(result.images[0]).toBe("https://dup.jpg");
    expect(result.images[1]).toBe("https://other.jpg");
  });

  it("should handle product with no images", () => {
    const result = mapper.map(makeItem({ image: undefined, additionalImages: undefined }));
    expect(result.images).toEqual([]);
  });

  it("should map attributes including brand, condition, seller", () => {
    const result = mapper.map(makeItem());
    expect(result.attributes["Brand"]).toBe("Intel");
    expect(result.attributes["Condition"]).toBe("New");
    expect(result.attributes["Seller"]).toBe("tech_store");
    expect(result.attributes["Seller Rating"]).toBe("99.5%");
  });

  it("should map shipping cost", () => {
    const result = mapper.map(makeItem({
      shippingOptions: [{ shippingCost: { value: "15.99", currency: "USD" }, type: "FIXED" }],
    }));
    expect(result.shippingCost?.amount).toBe(1599);
    expect(result.shippingCost?.currency).toBe("USD");
  });

  it("should handle free shipping", () => {
    const result = mapper.map(makeItem());
    expect(result.shippingCost?.amount).toBe(0);
  });

  it("should map category path", () => {
    const result = mapper.map(makeItem({ categoryPath: "Computers:CPUs:Desktop" }));
    expect(result.category).toBe("Computers:CPUs:Desktop");
  });

  it("should fall back to categoryId when no path", () => {
    const result = mapper.map(makeItem({ categoryPath: undefined, categoryId: "27386" }));
    expect(result.category).toBe("27386");
  });

  it("should map seller feedback to rating (0-5 scale)", () => {
    const result = mapper.map(makeItem({ seller: { username: "test", feedbackPercentage: "99.5" } }));
    expect(result.rating).toBeCloseTo(4.975, 2);
  });

  it("should handle minimal product (itemId + title only)", () => {
    const result = mapper.map(makeItem({
      itemId: "v1|min|0",
      title: "Minimal Item",
      price: undefined,
      image: undefined,
      additionalImages: undefined,
      brand: undefined,
      categoryPath: undefined,
      categoryId: undefined,
      condition: undefined,
      itemWebUrl: undefined,
      seller: undefined,
      shippingOptions: undefined,
      itemLocation: undefined,
      shortDescription: undefined,
    }));
    expect(result.externalId).toBe("v1|min|0");
    expect(result.title).toBe("Minimal Item");
    expect(result.images).toEqual([]);
    expect(result.price.amount).toBe(0);
    expect(result.brand).toBeUndefined();
    expect(result.shippingCost).toBeUndefined();
  });

  it("should map multiple products via mapAll", () => {
    const items = [
      makeItem({ itemId: "v1|001|0", title: "Product A" }),
      makeItem({ itemId: "v1|002|0", title: "Product B" }),
    ];
    const results = mapper.mapAll(items);
    expect(results.length).toBe(2);
    expect(results[0]!.externalId).toBe("v1|001|0");
  });
});
