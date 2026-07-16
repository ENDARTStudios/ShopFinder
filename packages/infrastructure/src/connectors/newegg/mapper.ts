/**
 * @workspace/infrastructure/connectors/newegg/mapper
 *
 * NeweggProductMapper — maps ParsedNeweggItem to NormalizedDiscoveredProduct.
 *
 * Newegg is a specialized retailer for PC hardware, components, and gaming.
 * The mapper handles:
 *   - UPC and Model numbers as attributes
 *   - Detailed technical specs (from Specs object)
 *   - Original price vs selling price (compareAtPrice)
 *   - Condition (New, Refurbished, Open Box)
 *   - In-stock status → inventory
 */
import type { NormalizedDiscoveredProduct } from "@workspace/domain/discovery/marketplace";
import type { Money } from "@workspace/domain/shared";
import type { ParsedNeweggItem } from "./parser";

export class NeweggProductMapper {
  map(item: ParsedNeweggItem): NormalizedDiscoveredProduct {
    const price = this.mapPrice(item);
    const images = this.mapImages(item);
    const attributes = this.mapAttributes(item);

    return {
      externalId: item.itemId,
      marketplace: "newegg",
      supplierName: item.sellerName ?? "Newegg",
      sourceUrl: item.productUrl,
      title: item.title,
      description: item.title,
      category: item.category,
      brand: item.brand,
      images,
      attributes,
      price,
      compareAtPrice: this.mapCompareAtPrice(item),
      currency: price.currency,
      inventory: item.inStock ? 1 : 0,
      shippingFromCountry: "US",
      estimatedDeliveryDays: { min: 2, max: 7 },
      discoveredAt: new Date(),
    };
  }

  mapAll(items: ReadonlyArray<ParsedNeweggItem>): NormalizedDiscoveredProduct[] {
    return items.map(item => this.map(item));
  }

  private mapPrice(item: ParsedNeweggItem): Money {
    if (item.price) {
      return {
        amount: Math.round(item.price * 100),
        currency: (item.currency ?? "USD").toUpperCase(),
      };
    }
    return { amount: 0, currency: "USD" };
  }

  private mapCompareAtPrice(item: ParsedNeweggItem): Money | undefined {
    if (item.originalPrice && item.price && item.originalPrice > item.price) {
      return {
        amount: Math.round(item.originalPrice * 100),
        currency: (item.currency ?? "USD").toUpperCase(),
      };
    }
    return undefined;
  }

  private mapImages(item: ParsedNeweggItem): string[] {
    const images: string[] = [];
    if (item.imageUrl) images.push(item.imageUrl);
    if (item.additionalImages) {
      for (const url of item.additionalImages) {
        if (url && !images.includes(url)) images.push(url);
      }
    }
    return images;
  }

  private mapAttributes(item: ParsedNeweggItem): Record<string, string> {
    const attrs: Record<string, string> = {};

    if (item.brand) attrs["Brand"] = item.brand;
    if (item.model) attrs["Model"] = item.model;
    if (item.upc) attrs["UPC"] = item.upc;
    if (item.condition) attrs["Condition"] = item.condition;
    if (item.sellerName) attrs["Seller"] = item.sellerName;
    if (item.shipping) attrs["Shipping"] = item.shipping;
    if (item.inStock !== undefined) attrs["In Stock"] = String(item.inStock);
    if (item.subCategory) attrs["Subcategory"] = item.subCategory;

    // Merge technical specs
    if (item.specs) {
      for (const [key, value] of Object.entries(item.specs)) {
        attrs[key] = value;
      }
    }

    return attrs;
  }
}

export function createNeweggProductMapper(): NeweggProductMapper {
  return new NeweggProductMapper();
}
