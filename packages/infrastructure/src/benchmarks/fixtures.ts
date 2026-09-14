/**
 * @workspace/infrastructure/benchmarks/fixtures
 *
 * Generates synthetic products for benchmarking.
 * Creates NormalizedDiscoveredProduct instances that mimic real
 * marketplace data without requiring API calls.
 */
import type { NormalizedDiscoveredProduct } from "@workspace/domain/marketplace";
import type { Money } from "@workspace/domain/shared";

const TITLES = [
  "Wireless Bluetooth Earbuds Pro with Noise Cancellation",
  "USB-C Fast Charging Cable 100W Braided Nylon",
  "Smart Watch Fitness Tracker Heart Rate Monitor",
  "Mechanical Keyboard RGB Backlit 87 Keys",
  "Portable SSD 1TB USB 3.2 Gen2 Type-C",
  "Wireless Mouse 2.4GHz Silent Click Ergonomic",
  "HDMI Cable 4K@60Hz Braided 6ft",
  "Webcam 1080p HD with Microphone",
  "Power Bank 20000mAh USB-C PD 65W",
  "Bluetooth Speaker Waterproof IPX7 20W",
];

const BRANDS = ["Xiaomi", "Sony", "Anker", "Samsung", "Logitech", "Garmin", "Corsair", "Razer", "ASUS", "Dell"];
const CATEGORIES = ["ELECTRONICS", "ACCESSORIES", "COMPUTERS", "AUDIO", "WEARABLES"];
const COLORS = ["Black", "White", "Blue", "Red", "Silver", "Gold"];
const MATERIALS = ["Plastic", "Aluminum", "Silicone", "Fabric", "Glass"];

export function generateProducts(count: number): NormalizedDiscoveredProduct[] {
  const products: NormalizedDiscoveredProduct[] = [];

  for (let i = 0; i < count; i++) {
    const titleIdx = i % TITLES.length;
    const brandIdx = (i * 3) % BRANDS.length;
    const catIdx = (i * 7) % CATEGORIES.length;
    const priceAmount = Math.round((10 + (i % 50) * 5 + (i % 7) * 0.99) * 100);

    products.push({
      externalId: `bench_${String(i).padStart(6, "0")}`,
      marketplace: i % 2 === 0 ? "aliexpress" : "amazon",
      supplierName: BRANDS[brandIdx] + " Store",
      sourceUrl: `https://example.com/product/${i}`,
      title: `${TITLES[titleIdx]} ${BRANDS[brandIdx]} Model-${1000 + i}`,
      description: `High quality ${TITLES[titleIdx]?.toLowerCase()}. Brand: ${BRANDS[brandIdx]}. Perfect for daily use.`,
      category: CATEGORIES[catIdx],
      brand: BRANDS[brandIdx],
      images: [
        `https://example.com/images/product_${i}_main.jpg`,
        `https://example.com/images/product_${i}_alt1.jpg`,
        `https://example.com/images/product_${i}_alt2.jpg`,
      ],
      attributes: {
        Color: COLORS[i % COLORS.length]!,
        Material: MATERIALS[i % MATERIALS.length]!,
        Weight: `${50 + (i % 20) * 10}g`,
        Warranty: `${6 + (i % 3) * 6} months`,
        SKU: `SKU-${String(i).padStart(8, "0")}`,
      },
      price: { amount: priceAmount, currency: "USD" } as Money,
      compareAtPrice: { amount: priceAmount + 500, currency: "USD" } as Money,
      currency: "USD",
      inventory: 100 + (i % 50),
      shippingFromCountry: i % 2 === 0 ? "CN" : "US",
      estimatedDeliveryDays: { min: 3, max: 14 },
      rating: 3.5 + (i % 15) * 0.1,
      reviewCount: 100 + (i % 500),
      salesCount: 50 + (i % 200),
      discoveredAt: new Date(),
    });
  }

  return products;
}

export function generateRawRecords(count: number, executionId: string): Array<{
  id: string;
  executionId: string;
  providerCode: string;
  externalId: string;
  payload: Uint8Array;
  payloadHash: string;
  discoveredAt: Date;
  partitionKey: string;
  versions: Record<string, string>;
}> {
  const products = generateProducts(count);
  const versions = {
    schemaVersion: "1.0.0",
    workflowVersion: "1.0.0",
    plannerVersion: "1.0.0",
    providerVersion: "1.0.0",
    connectorVersion: "2.0.0",
    providerManifestVersion: "v1",
  };

  return products.map((product, i) => ({
    id: `raw_bench_${String(i).padStart(6, "0")}`,
    executionId,
    providerCode: product.marketplace,
    externalId: product.externalId,
    payload: new TextEncoder().encode(JSON.stringify(product)),
    payloadHash: `ph_bench_${i}`,
    discoveredAt: new Date(),
    partitionKey: `${product.marketplace}|US|2025-07-14`,
    versions,
  }));
}
