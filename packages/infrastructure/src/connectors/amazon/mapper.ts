/**
 * @workspace/infrastructure/connectors/amazon/mapper
 *
 * AmazonProductMapper — maps ParsedAmazonCatalogItem to NormalizedDiscoveredProduct.
 * ALL payload transformation lives here. The connector itself only coordinates.
 */
import type { NormalizedDiscoveredProduct } from "@workspace/domain/discovery/marketplace";
import type { Money } from "@workspace/domain/shared";
import type { ParsedAmazonCatalogItem } from "./parser";

export class AmazonProductMapper {
  map(item: ParsedAmazonCatalogItem): NormalizedDiscoveredProduct {
    const images = this.mapImages(item);
    const attributes = this.mapAttributes(item);
    const price = this.mapPrice(item);
    const category = this.mapCategory(item);

    return {
      externalId: item.asin,
      marketplace: "amazon",
      supplierName: "Amazon",
      sourceUrl: `https://www.amazon.com/dp/${item.asin}`,
      title: item.title ?? `Amazon Product ${item.asin}`,
      description: item.title ?? "",
      category,
      brand: item.brand,
      images,
      attributes,
      price,
      currency: price.currency,
      inventory: 0,
      shippingFromCountry: "US",
      estimatedDeliveryDays: { min: 1, max: 5 },
      discoveredAt: new Date(),
    };
  }

  mapAll(items: ReadonlyArray<ParsedAmazonCatalogItem>): NormalizedDiscoveredProduct[] {
    return items.map(item => this.map(item));
  }

  private mapImages(item: ParsedAmazonCatalogItem): string[] {
    if (!item.images || item.images.length === 0) return [];
    // Prefer MAIN variant, then all others, deduplicated
    const main = item.images.filter(img => img.variant === "MAIN");
    const others = item.images.filter(img => img.variant !== "MAIN");
    const all = [...main, ...others];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const img of all) {
      if (img.url && !seen.has(img.url)) {
        seen.add(img.url);
        result.push(img.url);
      }
    }
    return result;
  }

  private mapAttributes(item: ParsedAmazonCatalogItem): Record<string, string> {
    const attrs: Record<string, string> = {};

    if (item.attributes) {
      for (const [key, value] of Object.entries(item.attributes)) {
        // Amazon attributes can be: array of {value: string}, string, or nested
        if (Array.isArray(value) && value.length > 0) {
          const first = value[0];
          if (first && typeof first === "object" && "value" in first) {
            attrs[key] = String((first as { value: unknown }).value);
          } else if (typeof first === "string") {
            attrs[key] = first;
          }
        } else if (typeof value === "string") {
          attrs[key] = value;
        } else if (typeof value === "number") {
          attrs[key] = String(value);
        }
      }
    }

    if (item.brand) attrs["Brand"] = item.brand;
    if (item.productTypes && item.productTypes.length > 0) {
      attrs["product_type"] = item.productTypes.join(", ");
    }

    return attrs;
  }

  private mapPrice(item: ParsedAmazonCatalogItem): Money {
    if (item.listPrice) {
      return {
        amount: Math.round(item.listPrice.amount * 100), // to cents
        currency: item.listPrice.currency.toUpperCase(),
      };
    }
    return { amount: 0, currency: "USD" };
  }

  private mapCategory(item: ParsedAmazonCatalogItem): string | undefined {
    return item.browseClassificationName ?? item.browseClassification ?? undefined;
  }
}

export function createAmazonProductMapper(): AmazonProductMapper {
  return new AmazonProductMapper();
}
