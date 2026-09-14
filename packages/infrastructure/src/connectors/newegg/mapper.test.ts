/**
 * @workspace/infrastructure/connectors/newegg/mapper.test
 */
/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import { NeweggProductMapper } from "./mapper";
import type { ParsedNeweggItem } from "./parser";

function makeItem(o?: Partial<ParsedNeweggItem>): ParsedNeweggItem {
  return {
    itemId: "N82E16819118056",
    title: "Intel Core i9-14900K 24-Core Desktop Processor",
    brand: "Intel",
    category: "CPUs / Processors",
    subCategory: "Desktop Processors",
    price: 549.99,
    originalPrice: 629.99,
    currency: "USD",
    imageUrl: "https://c1.neweggimages.com/main.jpg",
    additionalImages: ["https://c1.neweggimages.com/alt1.jpg", "https://c1.neweggimages.com/alt2.jpg"],
    productUrl: "https://www.newegg.com/p/N82E16819118056",
    condition: "New",
    sellerName: "Newegg",
    shipping: "Free Shipping",
    inStock: true,
    upc: "735858465432",
    model: "BX8071514900K",
    specs: {
      "Core Count": "24",
      "Thread Count": "32",
      "Base Clock": "3.2 GHz",
      "Boost Clock": "6.0 GHz",
      "Socket": "LGA 1700",
    },
    ...o,
  };
}

describe("Newegg Mapper", () => {
  const mapper = new NeweggProductMapper();

  it("should map a complete product", () => {
    const result = mapper.map(makeItem());
    expect(result.externalId).toBe("N82E16819118056");
    expect(result.title).toContain("Intel Core i9");
    expect(result.marketplace).toBe("newegg");
    expect(result.brand).toBe("Intel");
    expect(result.supplierName).toBe("Newegg");
    expect(result.sourceUrl).toContain("newegg.com");
  });

  it("should map price to cents", () => {
    const result = mapper.map(makeItem({ price: 549.99 }));
    expect(result.price.amount).toBe(54999);
  });

  it("should set compareAtPrice when original > selling", () => {
    const result = mapper.map(makeItem({ price: 549.99, originalPrice: 629.99 }));
    expect(result.compareAtPrice?.amount).toBe(62999);
  });

  it("should not set compareAtPrice when no discount", () => {
    const result = mapper.map(makeItem({ price: 549.99, originalPrice: 549.99 }));
    expect(result.compareAtPrice).toBeUndefined();
  });

  it("should handle missing price", () => {
    const result = mapper.map(makeItem({ price: undefined }));
    expect(result.price.amount).toBe(0);
  });

  it("should collect all images without duplicates", () => {
    const result = mapper.map(makeItem({
      imageUrl: "https://dup.jpg",
      additionalImages: ["https://dup.jpg", "https://other.jpg"],
    }));
    expect(result.images.length).toBe(2);
  });

  it("should handle product with no images", () => {
    const result = mapper.map(makeItem({ imageUrl: undefined, additionalImages: undefined }));
    expect(result.images).toEqual([]);
  });

  it("should map technical specs as attributes", () => {
    const result = mapper.map(makeItem({
      specs: {
        "Core Count": "24",
        "Boost Clock": "6.0 GHz",
        "Socket": "LGA 1700",
      },
    }));
    expect(result.attributes["Core Count"]).toBe("24");
    expect(result.attributes["Boost Clock"]).toBe("6.0 GHz");
    expect(result.attributes["Socket"]).toBe("LGA 1700");
  });

  it("should map UPC and Model", () => {
    const result = mapper.map(makeItem({ upc: "123456789", model: "BX80715" }));
    expect(result.attributes["UPC"]).toBe("123456789");
    expect(result.attributes["Model"]).toBe("BX80715");
  });

  it("should map condition and seller", () => {
    const result = mapper.map(makeItem({ condition: "Refurbished", sellerName: "ThirdParty" }));
    expect(result.attributes["Condition"]).toBe("Refurbished");
    expect(result.attributes["Seller"]).toBe("ThirdParty");
  });

  it("should map inStock to inventory", () => {
    const result = mapper.map(makeItem({ inStock: true }));
    expect(result.inventory).toBe(1);
    const outOfStock = mapper.map(makeItem({ inStock: false }));
    expect(outOfStock.inventory).toBe(0);
  });

  it("should handle minimal product (itemId + title only)", () => {
    const result = mapper.map(makeItem({
      itemId: "MIN",
      title: "Minimal",
      brand: undefined, category: undefined, subCategory: undefined,
      price: undefined, originalPrice: undefined, currency: undefined,
      imageUrl: undefined, additionalImages: undefined, productUrl: undefined,
      condition: undefined, sellerName: undefined, shipping: undefined,
      inStock: undefined, upc: undefined, model: undefined, specs: undefined,
    }));
    expect(result.externalId).toBe("MIN");
    expect(result.images).toEqual([]);
    expect(result.price.amount).toBe(0);
    expect(result.brand).toBeUndefined();
  });

  it("should map multiple products via mapAll", () => {
    const results = mapper.mapAll([makeItem({ itemId: "A" }), makeItem({ itemId: "B" })]);
    expect(results.length).toBe(2);
    expect(results[0]!.externalId).toBe("A");
  });
});
