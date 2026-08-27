/**
 * @workspace/infrastructure/connectors/digikey/mapper
 *
 * DigiKeyProductMapper — maps ParsedDigiKeyProduct to NormalizedDiscoveredProduct.
 *
 * DigiKey provides extremely rich technical data including:
 *   - MPN (Manufacturer Part Number)
 *   - Datasheets
 *   - Lifecycle status (Active, Obsolete, Discontinued)
 *   - RoHS status
 *   - MOQ (Minimum Order Quantity)
 *   - Lead time
 *   - Quantity available (real-time stock)
 *   - Custom tariff number
 *   - Detailed technical parameters (capacitance, voltage, package, etc.)
 *
 * These are mapped into attributes so they flow through the normalizer
 * and become available for AI evaluation, ranking, and catalog.
 */
import type { NormalizedDiscoveredProduct } from "@workspace/domain/marketplace";
import type { Money } from "@workspace/domain/shared";
import type { ParsedDigiKeyProduct } from "./parser";

export class DigiKeyProductMapper {
  map(product: ParsedDigiKeyProduct): NormalizedDiscoveredProduct {
    const price = this.mapPrice(product);
    const images = this.mapImages(product);
    const attributes = this.mapAttributes(product);

    return {
      externalId: product.digiKeyPartNumber,
      marketplace: "digikey",
      supplierName: product.manufacturerName,
      sourceUrl: product.productUrl,
      title: product.productDescription,
      description: product.detailedDescription,
      category: product.category,
      brand: product.manufacturerName,
      images,
      attributes,
      price,
      compareAtPrice: undefined,
      currency: price.currency,
      inventory: product.quantityAvailable ?? 0,
      shippingFromCountry: "US",
      estimatedDeliveryDays: { min: 1, max: 5 },
      discoveredAt: new Date(),
    };
  }

  mapAll(products: ReadonlyArray<ParsedDigiKeyProduct>): NormalizedDiscoveredProduct[] {
    return products.map(p => this.map(p));
  }

  private mapPrice(product: ParsedDigiKeyProduct): Money {
    if (product.unitPrice) {
      return {
        amount: Math.round(product.unitPrice * 100),
        currency: (product.currency ?? "USD").toUpperCase(),
      };
    }
    return { amount: 0, currency: "USD" };
  }

  private mapImages(product: ParsedDigiKeyProduct): string[] {
    const images: string[] = [];
    if (product.primaryPhotoUrl) images.push(product.primaryPhotoUrl);
    return images;
  }

  private mapAttributes(product: ParsedDigiKeyProduct): Record<string, string> {
    const attrs: Record<string, string> = {};

    // Technical identifiers
    if (product.manufacturerPartNumber) attrs["MPN"] = product.manufacturerPartNumber;
    if (product.digiKeyPartNumber) attrs["DigiKey PN"] = product.digiKeyPartNumber;
    if (product.manufacturerName) attrs["Manufacturer"] = product.manufacturerName;
    if (product.manufacturerId) attrs["Manufacturer ID"] = String(product.manufacturerId);

    // Lifecycle & compliance
    if (product.productStatus) attrs["Lifecycle Status"] = product.productStatus;
    if (product.rohsStatus) attrs["RoHS"] = product.rohsStatus;
    if (product.leadStatus) attrs["Lead Status"] = product.leadStatus;
    if (product.customTariffNumber) attrs["Tariff Number"] = product.customTariffNumber;

    // Commercial
    if (product.minimumOrderQuantity) attrs["MOQ"] = String(product.minimumOrderQuantity);
    if (product.quantityAvailable !== undefined) attrs["Quantity Available"] = String(product.quantityAvailable);

    // Datasheet
    if (product.primaryDatasheetUrl) attrs["Datasheet URL"] = product.primaryDatasheetUrl;

    // Classification
    if (product.category) attrs["Category"] = product.category;
    if (product.subcategory) attrs["Subcategory"] = product.subcategory;
    if (product.series) attrs["Series"] = product.series;

    // Technical parameters (capacitance, voltage, tolerance, package, etc.)
    if (product.parameters) {
      for (const param of product.parameters) {
        if (param.parameterName && param.parameterValue) {
          attrs[param.parameterName] = param.parameterValue;
        }
      }
    }

    return attrs;
  }
}

export function createDigiKeyProductMapper(): DigiKeyProductMapper {
  return new DigiKeyProductMapper();
}
