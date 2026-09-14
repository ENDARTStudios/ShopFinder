/**
 * @workspace/infrastructure/connectors/aliexpress/mapper
 *
 * ProductMapper — maps ParsedAliExpressProduct to NormalizedDiscoveredProduct.
 *
 * ALL payload transformation lives here. The connector itself only coordinates.
 *
 * Mappers:
 *   - ProductMapper: main entry, composes sub-mappers
 *   - PriceMapper: parses price/currency/discount → Money
 *   - ImageMapper: collects image URLs (primary + small variants)
 *   - AttributeMapper: maps product_props to attributes Record
 *   - CategoryMapper: maps category hierarchy to canonical category
 */
import type { NormalizedDiscoveredProduct } from "@workspace/domain/marketplace";
import type { Money } from "@workspace/domain/shared";
import type { ParsedAliExpressProduct } from "./parser";

// ── PriceMapper ────────────────────────────────────────────

export class PriceMapper {
  map(product: ParsedAliExpressProduct): { price: Money; compareAtPrice?: Money; currency: string } {
    const currency = (product.currency ?? "USD").toUpperCase();
    const salePrice = this.parsePrice(product.sale_price);
    const originalPrice = this.parsePrice(product.original_price);

    // Use sale_price if available, otherwise original_price
    const price = salePrice ?? originalPrice ?? { amount: 0, currency };
    const compareAtPrice = (originalPrice && salePrice && originalPrice.amount > salePrice.amount)
      ? originalPrice
      : undefined;

    return { price, compareAtPrice, currency };
  }

  private parsePrice(value?: string): Money | undefined {
    if (!value) return undefined;
    const amount = Math.round(parseFloat(value) * 100); // to cents
    if (isNaN(amount) || amount < 0) return undefined;
    return { amount, currency: "USD" }; // currency added by caller
  }
}

// ── ImageMapper ────────────────────────────────────────────

export class ImageMapper {
  map(product: ParsedAliExpressProduct): string[] {
    const images: string[] = [];

    // Primary image
    if (product.product_image_url) {
      images.push(product.product_image_url);
    }

    // Small image URLs (variants)
    if (product.product_small_image_urls) {
      for (const url of product.product_small_image_urls) {
        if (url && !images.includes(url)) {
          images.push(url);
        }
      }
    }

    return images;
  }
}

// ── AttributeMapper ────────────────────────────────────────

export class AttributeMapper {
  map(product: ParsedAliExpressProduct): Record<string, string> {
    const attributes: Record<string, string> = {};

    if (product.product_props) {
      for (const prop of product.product_props) {
        if (prop.prop_name && prop.prop_value) {
          attributes[prop.prop_name] = prop.prop_value;
        }
      }
    }

    // Add metadata as attributes
    if (product.shop_name) {
      attributes["shop_name"] = product.shop_name;
    }
    if (product.logistics) {
      attributes["logistics"] = product.logistics;
    }
    if (product.evaluate_rate) {
      attributes["evaluate_rate"] = product.evaluate_rate;
    }
    if (product.trade_count) {
      attributes["trade_count"] = product.trade_count;
    }

    return attributes;
  }
}

// ── CategoryMapper ─────────────────────────────────────────

export class CategoryMapper {
  map(product: ParsedAliExpressProduct): string | undefined {
    // Prefer second-level category, then first-level, then base category
    return product.second_level_category_name
      ?? product.first_level_category_name
      ?? product.category_name
      ?? undefined;
  }

  mapCategoryId(product: ParsedAliExpressProduct): string | undefined {
    return product.second_level_category_id
      ?? product.first_level_category_id
      ?? product.category_id
      ?? undefined;
  }
}

// ── ProductMapper (main entry) ─────────────────────────────

export class ProductMapper {
  private readonly priceMapper = new PriceMapper();
  private readonly imageMapper = new ImageMapper();
  private readonly attributeMapper = new AttributeMapper();
  private readonly categoryMapper = new CategoryMapper();

  map(product: ParsedAliExpressProduct): NormalizedDiscoveredProduct {
    const { price, compareAtPrice, currency } = this.priceMapper.map(product);
    const images = this.imageMapper.map(product);
    const attributes = this.attributeMapper.map(product);
    const category = this.categoryMapper.map(product);

    return {
      externalId: product.product_id,
      marketplace: "aliexpress",
      supplierName: product.shop_name ?? product.shop_title,
      sourceUrl: product.product_detail_url,
      title: product.product_title,
      description: product.product_title, // AliExpress doesn't provide description in this API
      category,
      brand: this.extractBrand(attributes),
      images,
      attributes,
      price,
      compareAtPrice,
      currency,
      inventory: 0, // Not provided by affiliate API
      shippingFromCountry: this.extractShippingCountry(product),
      estimatedDeliveryDays: { min: 7, max: 30 }, // Default for AliExpress
      rating: product.evaluate_rate ? parseFloat(product.evaluate_rate) : undefined,
      reviewCount: product.evaluation_count ? parseInt(product.evaluation_count, 10) : undefined,
      salesCount: product.order_count ? parseInt(product.order_count, 10) : undefined,
      discoveredAt: new Date()
    };
  }

  mapAll(products: ReadonlyArray<ParsedAliExpressProduct>): NormalizedDiscoveredProduct[] {
    return products.map((p) => this.map(p));
  }

  private extractBrand(attributes: Record<string, string>): string | undefined {
    return attributes["Brand Name"] ?? attributes["brand"] ?? attributes["Marca"] ?? undefined;
  }

  private extractShippingCountry(product: ParsedAliExpressProduct): string {
    // AliExpress products typically ship from China
    // This could be enhanced by parsing logistics info
    return "CN";
  }
}

// ── Factory ────────────────────────────────────────────────

export function createProductMapper(): ProductMapper {
  return new ProductMapper();
}
