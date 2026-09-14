/**
 * @workspace/infrastructure/connectors/aliexpress/mapper.test
 *
 * Tests for the AliExpress mapper — validates ALL payload transformation
 * without depending on the network.
 *
 * 12+ test cases:
 *   1. Simple product
 *   2. Product with variants (product_props)
 *   3. Product with no images
 *   4. Product with no attributes
 *   5. Promotional price (sale < original)
 *   6. Original price only (no sale price)
 *   7. Multiple currencies
 *   8. Product with rating/review/sales count
 *   9. Product with shop info
 *  10. Product with category hierarchy
 *  11. Product with image variants (small_image_urls)
 *  12. Empty product (minimal fields)
 */
/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import { ProductMapper, PriceMapper, ImageMapper, AttributeMapper, CategoryMapper } from "./mapper";
import type { ParsedAliExpressProduct } from "./parser";

function makeProduct(o?: Partial<ParsedAliExpressProduct>): ParsedAliExpressProduct {
  return {
    product_id: "4001234567890",
    product_title: "Wireless Bluetooth Earbuds Pro",
    product_detail_url: "https://www.aliexpress.com/item/4001234567890.html",
    shop_name: "TechFactory Official Store",
    category_id: "200001405",
    category_name: "Earphones & Headphones",
    first_level_category_id: "7",
    first_level_category_name: "Consumer Electronics",
    second_level_category_id: "200001405",
    second_level_category_name: "Earphones & Headphones",
    product_image_url: "https://ae01.alicdn.com/kf/HTB1abc123.jpg",
    product_small_image_urls: ["https://ae01.alicdn.com/kf/HTB1abc123.jpg", "https://ae01.alicdn.com/kf/HTB1def456.jpg"],
    original_price: "39.99",
    sale_price: "29.99",
    discount: "25",
    currency: "USD",
    evaluate_rate: "4.8",
    evaluation_count: "1523",
    trade_count: "3200",
    order_count: "850",
    shop_id: "123456",
    shop_title: "TechFactory Official Store",
    logistics: "Standard Shipping",
    product_props: [
      { prop_name: "Brand Name", prop_value: "Xiaomi" },
      { prop_name: "Color", prop_value: "Black" },
      { prop_name: "Material", prop_value: "Plastic" }
    ],
    ...o
  };
}

describe("AliExpress Mapper", () => {

  // ── 1. Simple product ───────────────────────────────────
  it("should map a simple product with all fields", () => {
    const mapper = new ProductMapper();
    const product = makeProduct();
    const result = mapper.map(product);

    expect(result.externalId).toBe("4001234567890");
    expect(result.title).toContain("Wireless Bluetooth Earbuds");
    expect(result.marketplace).toBe("aliexpress");
    expect(result.sourceUrl).toContain("aliexpress.com");
    expect(result.supplierName).toBe("TechFactory Official Store");
  });

  // ── 2. Product with variants (product_props) ────────────
  it("should map product_props to attributes", () => {
    const mapper = new ProductMapper();
    const product = makeProduct({
      product_props: [
        { prop_name: "Brand Name", prop_value: "Xiaomi" },
        { prop_name: "Color", prop_value: "Red" },
        { prop_name: "Size", prop_value: "L" }
      ]
    });
    const result = mapper.map(product);

    expect(result.attributes["Brand Name"]).toBe("Xiaomi");
    expect(result.attributes["Color"]).toBe("Red");
    expect(result.attributes["Size"]).toBe("L");
  });

  // ── 3. Product with no images ───────────────────────────
  it("should handle product with no images", () => {
    const mapper = new ProductMapper();
    const product = makeProduct({
      product_image_url: undefined,
      product_small_image_urls: undefined
    });
    const result = mapper.map(product);

    expect(result.images).toEqual([]);
  });

  // ── 4. Product with no attributes ───────────────────────
  it("should handle product with no product_props", () => {
    const mapper = new ProductMapper();
    const product = makeProduct({ product_props: undefined });
    const result = mapper.map(product);

    // Still has metadata attributes (shop_name, logistics, etc.)
    expect(result.attributes["shop_name"]).toBe("TechFactory Official Store");
    expect(result.attributes["Brand Name"]).toBeUndefined();
  });

  // ── 5. Promotional price ────────────────────────────────
  it("should set compareAtPrice when sale price < original", () => {
    const mapper = new ProductMapper();
    const product = makeProduct({ sale_price: "29.99", original_price: "39.99" });
    const result = mapper.map(product);

    expect(result.price.amount).toBe(2999); // $29.99 in cents
    expect(result.compareAtPrice?.amount).toBe(3999); // $39.99
  });

  // ── 6. Original price only (no sale price) ──────────────
  it("should use original_price when no sale_price", () => {
    const mapper = new ProductMapper();
    const product = makeProduct({ sale_price: undefined, original_price: "45.00" });
    const result = mapper.map(product);

    expect(result.price.amount).toBe(4500);
    expect(result.compareAtPrice).toBeUndefined();
  });

  // ── 7. Multiple currencies ──────────────────────────────
  it("should preserve currency from product", () => {
    const mapper = new ProductMapper();
    const product = makeProduct({ currency: "BRL", sale_price: "99.90" });
    const result = mapper.map(product);

    expect(result.currency).toBe("BRL");
  });

  // ── 8. Rating/review/sales ──────────────────────────────
  it("should map evaluate_rate, evaluation_count, order_count", () => {
    const mapper = new ProductMapper();
    const product = makeProduct({
      evaluate_rate: "4.7",
      evaluation_count: "3200",
      order_count: "1500"
    });
    const result = mapper.map(product);

    expect(result.rating).toBe(4.7);
    expect(result.reviewCount).toBe(3200);
    expect(result.salesCount).toBe(1500);
  });

  // ── 9. Shop info ────────────────────────────────────────
  it("should map shop_name as supplierName", () => {
    const mapper = new ProductMapper();
    const product = makeProduct({ shop_name: "GadgetHub", shop_title: "GadgetHub Store" });
    const result = mapper.map(product);

    expect(result.supplierName).toBe("GadgetHub");
  });

  // ── 10. Category hierarchy ──────────────────────────────
  it("should prefer second-level category name", () => {
    const catMapper = new CategoryMapper();
    const product = makeProduct({
      first_level_category_name: "Consumer Electronics",
      second_level_category_name: "Earphones & Headphones",
      category_name: "Wireless Earbuds"
    });
    expect(catMapper.map(product)).toBe("Earphones & Headphones");
  });

  it("should fall back to first-level when no second-level", () => {
    const catMapper = new CategoryMapper();
    const product = makeProduct({
      second_level_category_name: undefined,
      first_level_category_name: "Consumer Electronics",
      category_name: "Wireless Earbuds"
    });
    expect(catMapper.map(product)).toBe("Consumer Electronics");
  });

  // ── 11. Image variants ──────────────────────────────────
  it("should collect all image URLs without duplicates", () => {
    const imgMapper = new ImageMapper();
    const product = makeProduct({
      product_image_url: "https://img1.jpg",
      product_small_image_urls: ["https://img1.jpg", "https://img2.jpg", "https://img3.jpg"]
    });
    const images = imgMapper.map(product);

    expect(images.length).toBe(3); // no duplicate img1
    expect(images[0]).toBe("https://img1.jpg");
    expect(images[1]).toBe("https://img2.jpg");
  });

  // ── 12. Empty product (minimal fields) ──────────────────
  it("should handle product with only id and title", () => {
    const mapper = new ProductMapper();
    const product = makeProduct({
      product_id: "4000000001",
      product_title: "Minimal Product",
      product_image_url: undefined,
      product_small_image_urls: undefined,
      original_price: undefined,
      sale_price: undefined,
      currency: undefined,
      product_props: undefined,
      shop_name: undefined,
      shop_title: undefined,
      logistics: undefined,
      evaluate_rate: undefined,
      evaluation_count: undefined,
      order_count: undefined
    });
    const result = mapper.map(product);

    expect(result.externalId).toBe("4000000001");
    expect(result.title).toBe("Minimal Product");
    expect(result.price.amount).toBe(0);
    expect(result.images).toEqual([]);
    expect(result.brand).toBeUndefined();
  });

  // ── PriceMapper edge cases ──────────────────────────────
  describe("PriceMapper", () => {
    it("should parse price string to cents", () => {
      const pm = new PriceMapper();
      const { price } = pm.map(makeProduct({ sale_price: "29.99", original_price: "39.99", currency: "USD" }));
      expect(price.amount).toBe(2999);
    });

    it("should handle invalid price string", () => {
      const pm = new PriceMapper();
      const { price } = pm.map(makeProduct({ sale_price: "invalid", original_price: "39.99" }));
      expect(price.amount).toBe(3999); // falls back to original
    });

    it("should handle missing prices", () => {
      const pm = new PriceMapper();
      const { price } = pm.map(makeProduct({ sale_price: undefined, original_price: undefined }));
      expect(price.amount).toBe(0);
    });
  });

  // ── mapAll ──────────────────────────────────────────────
  describe("mapAll", () => {
    it("should map multiple products", () => {
      const mapper = new ProductMapper();
      const products = [
        makeProduct({ product_id: "1", product_title: "Product A" }),
        makeProduct({ product_id: "2", product_title: "Product B" }),
        makeProduct({ product_id: "3", product_title: "Product C" })
      ];
      const results = mapper.mapAll(products);

      expect(results.length).toBe(3);
      expect(results[0]!.externalId).toBe("1");
      expect(results[2]!.title).toBe("Product C");
    });
  });
});
