/**
 * @workspace/infrastructure/connectors/ebay/mapper
 *
 * EbayProductMapper — maps ParsedEbayItem to NormalizedDiscoveredProduct.
 */
import type { NormalizedDiscoveredProduct } from "@workspace/domain/marketplace";
import type { Money } from "@workspace/domain/shared";
import type { ParsedEbayItem } from "./parser";

export class EbayProductMapper {
  map(item: ParsedEbayItem): NormalizedDiscoveredProduct {
    const images = this.mapImages(item);
    const price = this.mapPrice(item);
    const attributes = this.mapAttributes(item);
    const shippingCost = this.mapShipping(item);

    return {
      externalId: item.itemId,
      marketplace: "ebay",
      supplierName: item.seller?.username,
      sourceUrl: item.itemWebUrl,
      title: item.title,
      description: item.shortDescription ?? item.title,
      category: this.mapCategory(item),
      brand: item.brand,
      images,
      attributes,
      price,
      compareAtPrice: undefined,
      currency: price.currency,
      inventory: 0,
      shippingCost,
      shippingFromCountry: item.itemLocation?.country ?? "US",
      estimatedDeliveryDays: { min: 3, max: 14 },
      rating: item.seller?.feedbackPercentage ? parseFloat(item.seller.feedbackPercentage) / 20 : undefined,
      reviewCount: undefined,
      salesCount: undefined,
      discoveredAt: new Date(),
    };
  }

  mapAll(items: ReadonlyArray<ParsedEbayItem>): NormalizedDiscoveredProduct[] {
    return items.map(item => this.map(item));
  }

  private mapImages(item: ParsedEbayItem): string[] {
    const images: string[] = [];
    if (item.image?.imageUrl) images.push(item.image.imageUrl);
    if (item.additionalImages) {
      for (const img of item.additionalImages) {
        if (img.imageUrl && !images.includes(img.imageUrl)) images.push(img.imageUrl);
      }
    }
    return images;
  }

  private mapPrice(item: ParsedEbayItem): Money {
    if (item.price) {
      return {
        amount: Math.round(parseFloat(item.price.value) * 100),
        currency: item.price.currency.toUpperCase(),
      };
    }
    return { amount: 0, currency: "USD" };
  }

  private mapShipping(item: ParsedEbayItem): Money | undefined {
    const first = item.shippingOptions?.[0];
    if (first?.shippingCost) {
      return {
        amount: Math.round(parseFloat(first.shippingCost.value) * 100),
        currency: first.shippingCost.currency.toUpperCase(),
      };
    }
    return undefined;
  }

  private mapAttributes(item: ParsedEbayItem): Record<string, string> {
    const attrs: Record<string, string> = {};
    if (item.brand) attrs["Brand"] = item.brand;
    if (item.condition) attrs["Condition"] = item.condition;
    if (item.categoryId) attrs["Category ID"] = item.categoryId;
    if (item.seller?.username) attrs["Seller"] = item.seller.username;
    if (item.seller?.feedbackPercentage) attrs["Seller Rating"] = `${item.seller.feedbackPercentage}%`;
    return attrs;
  }

  private mapCategory(item: ParsedEbayItem): string | undefined {
    return item.categoryPath ?? item.categoryId ?? undefined;
  }
}

export function createEbayProductMapper(): EbayProductMapper {
  return new EbayProductMapper();
}
