/**
 * ShopFinder — Mock product data for the landing page.
 *
 * These are realistic products that the ShopFinder platform would
 * discover, enrich, and catalog across its 3 main niches:
 *   1. PC Hardware & Gamer (Newegg + Intel/AMD/NVIDIA/ASUS/MSI/Gigabyte)
 *   2. Componentes Eletrônicos (DigiKey + manufacturer industrial lines)
 *   3. Eletrônicos de Consumo (Amazon + AliExpress + eBay)
 *
 * In production, this data comes from the EnrichedCanonicalProduct
 * pipeline (A2.7b → A2.8).
 */

// ── Niches ─────────────────────────────────────────────────

export interface ProductNiche {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly gradient: string;
  readonly productCount: number;
  readonly supplierCount: number;
  readonly topBrands: ReadonlyArray<string>;
  readonly popularSearches: ReadonlyArray<string>;
}

export const NICHES: ReadonlyArray<ProductNiche> = [
  {
    id: "pc-hardware",
    name: "PC Hardware & Gamer",
    description: "CPUs, GPUs, placas-mãe, memória, armazenamento e periféricos",
    icon: "cpu",
    gradient: "linear-gradient(135deg, #0F172A 0%, #10B981 100%)",
    productCount: 8421,
    supplierCount: 7,
    topBrands: ["Intel", "AMD", "NVIDIA", "ASUS", "MSI", "Gigabyte"],
    popularSearches: ["Ryzen 9", "RTX 4090", "DDR5", "SSD NVMe"]
  },
  {
    id: "electronic-components",
    name: "Componentes Eletrônicos",
    description: "Microcontroladores, ICs, semicondutores, passivos e sensores",
    icon: "chip",
    gradient: "linear-gradient(135deg, #0F172A 0%, #3B82F6 100%)",
    productCount: 12483,
    supplierCount: 4,
    topBrands: ["STMicroelectronics", "Texas Instruments", "Microchip", "NXP", "Onsemi"],
    popularSearches: ["STM32", "ESP32", "ATmega328", "LM358"]
  },
  {
    id: "consumer-electronics",
    name: "Eletrônicos de Consumo",
    description: "Smartphones, áudio, wearables, smart home e acessórios",
    icon: "smartphone",
    gradient: "linear-gradient(135deg, #0F172A 0%, #8B5CF6 100%)",
    productCount: 15672,
    supplierCount: 5,
    topBrands: ["Apple", "Samsung", "Xiaomi", "Sony", "JBL"],
    popularSearches: ["iPhone 15", "AirPods Pro", "Galaxy S24", "Apple Watch"]
  }
];

// ── Categories (expanded for all 3 niches) ─────────────────

export interface ProductCategory {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly nicheId: string;
  readonly productCount: number;
  readonly popularBrands: ReadonlyArray<string>;
}

export const CATEGORIES: ReadonlyArray<ProductCategory> = [
  // PC Hardware & Gamer
  {
    id: "cpu",
    name: "Processadores",
    icon: "cpu",
    nicheId: "pc-hardware",
    productCount: 1247,
    popularBrands: ["Intel", "AMD"]
  },
  {
    id: "gpu",
    name: "Placas de Vídeo",
    icon: "gpu",
    nicheId: "pc-hardware",
    productCount: 892,
    popularBrands: ["NVIDIA", "AMD", "ASUS"]
  },
  {
    id: "motherboard",
    name: "Placas-mãe",
    icon: "motherboard",
    nicheId: "pc-hardware",
    productCount: 634,
    popularBrands: ["ASUS", "MSI", "Gigabyte"]
  },
  {
    id: "ssd",
    name: "SSD & Storage",
    icon: "ssd",
    nicheId: "pc-hardware",
    productCount: 2103,
    popularBrands: ["Samsung", "WD", "Kingston"]
  },
  {
    id: "ram",
    name: "Memória RAM",
    icon: "ram",
    nicheId: "pc-hardware",
    productCount: 1876,
    popularBrands: ["Kingston", "Corsair", "G.Skill"]
  },
  {
    id: "psu",
    name: "Fontes",
    icon: "psu",
    nicheId: "pc-hardware",
    productCount: 543,
    popularBrands: ["Corsair", "Seasonic", "EVGA"]
  },
  {
    id: "case",
    name: "Gabinetes",
    icon: "case",
    nicheId: "pc-hardware",
    productCount: 421,
    popularBrands: ["NZXT", "Corsair", "Lian Li"]
  },
  {
    id: "monitor",
    name: "Monitores",
    icon: "monitor",
    nicheId: "pc-hardware",
    productCount: 987,
    popularBrands: ["LG", "Samsung", "ASUS"]
  },

  // Electronic Components
  {
    id: "mcu",
    name: "Microcontroladores",
    icon: "chip",
    nicheId: "electronic-components",
    productCount: 3421,
    popularBrands: ["STMicroelectronics", "Microchip", "Espressif"]
  },
  {
    id: "ic",
    name: "Circuitos Integrados",
    icon: "chip",
    nicheId: "electronic-components",
    productCount: 5872,
    popularBrands: ["Texas Instruments", "NXP", "Onsemi"]
  },
  {
    id: "sensor",
    name: "Sensores",
    icon: "chip",
    nicheId: "electronic-components",
    productCount: 1243,
    popularBrands: ["Bosch", "STMicroelectronics", "Honeywell"]
  },
  {
    id: "passive",
    name: "Passivos",
    icon: "chip",
    nicheId: "electronic-components",
    productCount: 8932,
    popularBrands: ["Yageo", "Vishay", "Panasonic"]
  },

  // Consumer Electronics
  {
    id: "smartphone",
    name: "Smartphones",
    icon: "smartphone",
    nicheId: "consumer-electronics",
    productCount: 3421,
    popularBrands: ["Apple", "Samsung", "Xiaomi"]
  },
  {
    id: "audio",
    name: "Áudio & Fones",
    icon: "audio",
    nicheId: "consumer-electronics",
    productCount: 2876,
    popularBrands: ["Apple", "Sony", "JBL"]
  },
  {
    id: "wearable",
    name: "Wearables",
    icon: "watch",
    nicheId: "consumer-electronics",
    productCount: 1543,
    popularBrands: ["Apple", "Samsung", "Garmin"]
  },
  {
    id: "smarthome",
    name: "Smart Home",
    icon: "home",
    nicheId: "consumer-electronics",
    productCount: 2103,
    popularBrands: ["Google", "Amazon", "Xiaomi"]
  }
];

// ── Featured products (all 3 niches) ───────────────────────

export interface FeaturedProduct {
  readonly id: string;
  readonly name: string;
  readonly brand: string;
  readonly category: string;
  readonly nicheId: string;
  readonly price: number;
  readonly currency: string;
  readonly priceRange: { min: number; max: number };
  readonly inStock: boolean;
  readonly stockCount: number;
  readonly suppliers: number;
  readonly rating: number;
  readonly reviewCount: number;
  readonly imageGradient: string;
  readonly imageLabel: string;
  readonly specs: ReadonlyArray<string>;
  readonly mpn: string;
}

export const FEATURED_PRODUCTS: ReadonlyArray<FeaturedProduct> = [
  // PC Hardware & Gamer
  {
    id: "p001",
    name: "Intel Core i9-14900K",
    brand: "Intel",
    category: "CPU",
    nicheId: "pc-hardware",
    price: 589.99,
    currency: "USD",
    priceRange: { min: 549.99, max: 699.99 },
    inStock: true,
    stockCount: 1247,
    suppliers: 8,
    rating: 4.8,
    reviewCount: 3421,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)",
    imageLabel: "i9-14900K",
    specs: ["24 núcleos", "6.0 GHz boost", "LGA1700"],
    mpn: "BX8071514900K"
  },
  {
    id: "p002",
    name: "AMD Ryzen 9 7950X",
    brand: "AMD",
    category: "CPU",
    nicheId: "pc-hardware",
    price: 549.0,
    currency: "USD",
    priceRange: { min: 499.0, max: 629.0 },
    inStock: true,
    stockCount: 892,
    suppliers: 6,
    rating: 4.9,
    reviewCount: 2876,
    imageGradient: "linear-gradient(135deg, #1A1A2E 0%, #E11D48 100%)",
    imageLabel: "Ryzen 9 7950X",
    specs: ["16 núcleos", "5.7 GHz boost", "AM5"],
    mpn: "100-100000514WOF"
  },
  {
    id: "p003",
    name: "NVIDIA GeForce RTX 4090",
    brand: "NVIDIA",
    category: "GPU",
    nicheId: "pc-hardware",
    price: 1599.99,
    currency: "USD",
    priceRange: { min: 1499.99, max: 1899.99 },
    inStock: true,
    stockCount: 234,
    suppliers: 5,
    rating: 4.9,
    reviewCount: 5102,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #16A34A 100%)",
    imageLabel: "RTX 4090",
    specs: ["24GB GDDR6X", "16384 CUDA", "450W TDP"],
    mpn: "900-1G136-0250-000"
  },
  {
    id: "p004",
    name: "Samsung 990 Pro 2TB",
    brand: "Samsung",
    category: "SSD",
    nicheId: "pc-hardware",
    price: 169.99,
    currency: "USD",
    priceRange: { min: 149.99, max: 199.99 },
    inStock: true,
    stockCount: 3421,
    suppliers: 12,
    rating: 4.8,
    reviewCount: 8743,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #2563EB 100%)",
    imageLabel: "990 Pro 2TB",
    specs: ["2TB NVMe", "PCIe 4.0", "7450 MB/s"],
    mpn: "MZ-V9P2T0BW"
  },

  // Electronic Components
  {
    id: "p005",
    name: "STM32F407VGT6",
    brand: "STMicroelectronics",
    category: "MCU",
    nicheId: "electronic-components",
    price: 14.21,
    currency: "USD",
    priceRange: { min: 12.5, max: 18.9 },
    inStock: true,
    stockCount: 45821,
    suppliers: 4,
    rating: 4.9,
    reviewCount: 1243,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #3B82F6 100%)",
    imageLabel: "STM32F407",
    specs: ["ARM Cortex-M4", "1MB Flash", "168MHz"],
    mpn: "STM32F407VGT6"
  },
  {
    id: "p006",
    name: "ESP32-WROOM-32",
    brand: "Espressif",
    category: "MCU",
    nicheId: "electronic-components",
    price: 3.2,
    currency: "USD",
    priceRange: { min: 2.8, max: 4.5 },
    inStock: true,
    stockCount: 128400,
    suppliers: 7,
    rating: 4.8,
    reviewCount: 3421,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #6366F1 100%)",
    imageLabel: "ESP32-WROOM",
    specs: ["Xtensa LX6", "WiFi + BT", "4MB Flash"],
    mpn: "ESP32-WROOM-32"
  },
  {
    id: "p007",
    name: "LM358 Dual Op-Amp",
    brand: "Texas Instruments",
    category: "IC",
    nicheId: "electronic-components",
    price: 0.45,
    currency: "USD",
    priceRange: { min: 0.32, max: 0.68 },
    inStock: true,
    stockCount: 542000,
    suppliers: 9,
    rating: 4.7,
    reviewCount: 876,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #0891B2 100%)",
    imageLabel: "LM358",
    specs: ["Dual Op-Amp", "DIP-8", "Low Power"],
    mpn: "LM358P"
  },
  {
    id: "p008",
    name: "BME280 Sensor",
    brand: "Bosch",
    category: "Sensor",
    nicheId: "electronic-components",
    price: 4.85,
    currency: "USD",
    priceRange: { min: 3.9, max: 6.2 },
    inStock: true,
    stockCount: 32100,
    suppliers: 5,
    rating: 4.9,
    reviewCount: 2104,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #059669 100%)",
    imageLabel: "BME280",
    specs: ["Temp + Umidade", "Pressão", "I²C/SPI"],
    mpn: "BME280"
  },

  // Consumer Electronics
  {
    id: "p009",
    name: "iPhone 15 Pro Max 256GB",
    brand: "Apple",
    category: "Smartphone",
    nicheId: "consumer-electronics",
    price: 1199.0,
    currency: "USD",
    priceRange: { min: 1099.0, max: 1299.0 },
    inStock: true,
    stockCount: 2103,
    suppliers: 6,
    rating: 4.8,
    reviewCount: 12453,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #6B7280 100%)",
    imageLabel: "iPhone 15 Pro",
    specs: ["A17 Pro", '6.7" OLED', "Titanium"],
    mpn: "MTUW3LL/A"
  },
  {
    id: "p010",
    name: "AirPods Pro (2nd Gen)",
    brand: "Apple",
    category: "Áudio",
    nicheId: "consumer-electronics",
    price: 199.0,
    currency: "USD",
    priceRange: { min: 179.0, max: 249.0 },
    inStock: true,
    stockCount: 5421,
    suppliers: 8,
    rating: 4.7,
    reviewCount: 18732,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #9CA3AF 100%)",
    imageLabel: "AirPods Pro 2",
    specs: ["ANC", "Spatial Audio", "USB-C"],
    mpn: "MTJV3AM/A"
  },
  {
    id: "p011",
    name: "Samsung Galaxy S24 Ultra",
    brand: "Samsung",
    category: "Smartphone",
    nicheId: "consumer-electronics",
    price: 1299.99,
    currency: "USD",
    priceRange: { min: 1199.99, max: 1419.99 },
    inStock: true,
    stockCount: 1876,
    suppliers: 5,
    rating: 4.8,
    reviewCount: 8721,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #4F46E5 100%)",
    imageLabel: "Galaxy S24 Ultra",
    specs: ["Snapdragon 8 Gen 3", "200MP", "S Pen"],
    mpn: "SM-S928B"
  },
  {
    id: "p012",
    name: "Apple Watch Series 9",
    brand: "Apple",
    category: "Wearable",
    nicheId: "consumer-electronics",
    price: 399.0,
    currency: "USD",
    priceRange: { min: 349.0, max: 499.0 },
    inStock: false,
    stockCount: 0,
    suppliers: 4,
    rating: 4.7,
    reviewCount: 6543,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #EC4899 100%)",
    imageLabel: "Watch Series 9",
    specs: ["45mm", "Always-On", "GPS + Cellular"],
    mpn: "MUQ03LL/A"
  }
];
