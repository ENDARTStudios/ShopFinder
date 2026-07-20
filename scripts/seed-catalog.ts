/**
 * ShopFinder — Seed script.
 *
 * Populates the SQLite database with real catalog data:
 *   - Categories (16, across 3 niches)
 *   - Suppliers (7, matching the connectors)
 *   - Products (12, across 3 niches)
 *   - Variants (1 per product)
 *   - ProductOffers (multiple per product, from different suppliers)
 *   - Inventory (stock counts)
 *   - ProductMedia (image URLs)
 *   - ProductAttributes (specs)
 *
 * Run: bun run scripts/seed-catalog.ts
 *
 * This is the bridge between "empty shell" and "working product".
 * After this runs, the landing page can query the database for real
 * products, prices, and stock.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Store ID (from existing DB) ────────────────────────────
const STORE_ID = "cmrfu2kdb0000oybnlekztroj";

// ── Niches metadata ────────────────────────────────────────

interface NicheData {
  id: string;
  name: string;
  slug: string;
  description: string;
}

const NICHES: NicheData[] = [
  {
    id: "pc-hardware",
    name: "PC Hardware & Gamer",
    slug: "pc-hardware",
    description: "CPUs, GPUs, placas-mãe, memória, armazenamento e periféricos"
  },
  {
    id: "electronic-components",
    name: "Componentes Eletrônicos",
    slug: "electronic-components",
    description: "Microcontroladores, ICs, semicondutores, passivos e sensores"
  },
  {
    id: "consumer-electronics",
    name: "Eletrônicos de Consumo",
    slug: "consumer-electronics",
    description: "Smartphones, áudio, wearables, smart home e acessórios"
  }
];

// ── Categories ─────────────────────────────────────────────

interface CategoryData {
  slug: string;
  name: string;
  nicheId: string;
}

const CATEGORIES: CategoryData[] = [
  // PC Hardware
  { slug: "cpu", name: "Processadores", nicheId: "pc-hardware" },
  { slug: "gpu", name: "Placas de Vídeo", nicheId: "pc-hardware" },
  { slug: "motherboard", name: "Placas-mãe", nicheId: "pc-hardware" },
  { slug: "ssd", name: "SSD & Storage", nicheId: "pc-hardware" },
  { slug: "ram", name: "Memória RAM", nicheId: "pc-hardware" },
  { slug: "psu", name: "Fontes", nicheId: "pc-hardware" },
  { slug: "case", name: "Gabinetes", nicheId: "pc-hardware" },
  { slug: "monitor", name: "Monitores", nicheId: "pc-hardware" },
  // Electronic Components
  { slug: "mcu", name: "Microcontroladores", nicheId: "electronic-components" },
  { slug: "ic", name: "Circuitos Integrados", nicheId: "electronic-components" },
  { slug: "sensor", name: "Sensores", nicheId: "electronic-components" },
  { slug: "passive", name: "Passivos", nicheId: "electronic-components" },
  // Consumer Electronics
  { slug: "smartphone", name: "Smartphones", nicheId: "consumer-electronics" },
  { slug: "audio", name: "Áudio & Fones", nicheId: "consumer-electronics" },
  { slug: "wearable", name: "Wearables", nicheId: "consumer-electronics" },
  { slug: "smarthome", name: "Smart Home", nicheId: "consumer-electronics" }
];

// ── Suppliers ──────────────────────────────────────────────

interface SupplierData {
  code: string;
  name: string;
  defaultCurrency: string;
  shipsFromCountry: string;
}

const SUPPLIERS: SupplierData[] = [
  { code: "amazon", name: "Amazon", defaultCurrency: "USD", shipsFromCountry: "US" },
  { code: "newegg", name: "Newegg", defaultCurrency: "USD", shipsFromCountry: "US" },
  { code: "ebay", name: "eBay", defaultCurrency: "USD", shipsFromCountry: "US" },
  { code: "aliexpress", name: "AliExpress", defaultCurrency: "USD", shipsFromCountry: "CN" },
  { code: "digikey", name: "DigiKey", defaultCurrency: "USD", shipsFromCountry: "US" },
  { code: "intel", name: "Intel (Direct)", defaultCurrency: "USD", shipsFromCountry: "US" },
  { code: "amd", name: "AMD (Direct)", defaultCurrency: "USD", shipsFromCountry: "US" }
];

// ── Products ───────────────────────────────────────────────

interface ProductData {
  sku: string;
  slug: string;
  title: string;
  brand: string;
  categorySlug: string;
  nicheId: string;
  description: string;
  price: number; // USD
  priceRange: { min: number; max: number };
  inStock: boolean;
  stockCount: number;
  rating: number;
  reviewCount: number;
  imageGradient: string;
  imageLabel: string;
  specs: Array<{ name: string; value: string }>;
  mpn: string;
  offers: Array<{ supplierCode: string; price: number; inventory: number; externalId: string }>;
}

const PRODUCTS: ProductData[] = [
  // ── PC Hardware & Gamer ────────────────────────────────
  {
    sku: "SF-CPU-I9-14900K",
    slug: "intel-core-i9-14900k",
    title: "Intel Core i9-14900K",
    brand: "Intel",
    categorySlug: "cpu",
    nicheId: "pc-hardware",
    description:
      "Processador desktop Intel Core i9-14900K, 24 núcleos (8P + 16E), 32 threads, até 6.0 GHz, socket LGA1700.",
    price: 589.99,
    priceRange: { min: 549.99, max: 699.99 },
    inStock: true,
    stockCount: 1247,
    rating: 4.8,
    reviewCount: 3421,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)",
    imageLabel: "i9-14900K",
    specs: [
      { name: "cores", value: "24" },
      { name: "base_clock", value: "3.2 GHz" },
      { name: "max_turbo", value: "6.0 GHz" },
      { name: "socket", value: "LGA1700" },
      { name: "tdp", value: "125W" }
    ],
    mpn: "BX8071514900K",
    offers: [
      { supplierCode: "amazon", price: 589.99, inventory: 423, externalId: "B0CJ4LL1YK" },
      { supplierCode: "newegg", price: 579.99, inventory: 312, externalId: "N82E16819118410" },
      { supplierCode: "ebay", price: 549.99, inventory: 512, externalId: "ebay-i9-14900k" },
      { supplierCode: "intel", price: 649.99, inventory: 0, externalId: "BX8071514900K" }
    ]
  },
  {
    sku: "SF-CPU-R9-7950X",
    slug: "amd-ryzen-9-7950x",
    title: "AMD Ryzen 9 7950X",
    brand: "AMD",
    categorySlug: "cpu",
    nicheId: "pc-hardware",
    description:
      "Processador desktop AMD Ryzen 9 7950X, 16 núcleos, 32 threads, até 5.7 GHz, socket AM5.",
    price: 549.0,
    priceRange: { min: 499.0, max: 629.0 },
    inStock: true,
    stockCount: 892,
    rating: 4.9,
    reviewCount: 2876,
    imageGradient: "linear-gradient(135deg, #1A1A2E 0%, #E11D48 100%)",
    imageLabel: "Ryzen 9 7950X",
    specs: [
      { name: "cores", value: "16" },
      { name: "base_clock", value: "4.5 GHz" },
      { name: "max_turbo", value: "5.7 GHz" },
      { name: "socket", value: "AM5" },
      { name: "tdp", value: "170W" }
    ],
    mpn: "100-100000514WOF",
    offers: [
      { supplierCode: "amazon", price: 549.0, inventory: 312, externalId: "B0BBJ59PJ5" },
      { supplierCode: "newegg", price: 539.0, inventory: 280, externalId: "N82E16819113784" },
      { supplierCode: "amd", price: 599.0, inventory: 300, externalId: "100-100000514WOF" }
    ]
  },
  {
    sku: "SF-GPU-RTX4090",
    slug: "nvidia-geforce-rtx-4090",
    title: "NVIDIA GeForce RTX 4090",
    brand: "NVIDIA",
    categorySlug: "gpu",
    nicheId: "pc-hardware",
    description:
      "Placa de vídeo NVIDIA GeForce RTX 4090, 24GB GDDR6X, 16384 CUDA cores, 450W TDP, DLSS 3.",
    price: 1599.99,
    priceRange: { min: 1499.99, max: 1899.99 },
    inStock: true,
    stockCount: 234,
    rating: 4.9,
    reviewCount: 5102,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #16A34A 100%)",
    imageLabel: "RTX 4090",
    specs: [
      { name: "vram", value: "24GB GDDR6X" },
      { name: "cuda_cores", value: "16384" },
      { name: "tdp", value: "450W" },
      { name: "pcie", value: "PCIe 4.0" }
    ],
    mpn: "900-1G136-0250-000",
    offers: [
      { supplierCode: "amazon", price: 1599.99, inventory: 89, externalId: "B0BGGHS8Z1" },
      { supplierCode: "newegg", price: 1579.99, inventory: 145, externalId: "N82E16814137651" },
      { supplierCode: "ebay", price: 1499.99, inventory: 0, externalId: "ebay-rtx4090" }
    ]
  },
  {
    sku: "SF-SSD-990PRO-2TB",
    slug: "samsung-990-pro-2tb",
    title: "Samsung 990 Pro 2TB NVMe SSD",
    brand: "Samsung",
    categorySlug: "ssd",
    nicheId: "pc-hardware",
    description:
      "SSD NVMe Samsung 990 Pro 2TB, PCIe 4.0, leitura até 7450 MB/s, gravação até 6900 MB/s.",
    price: 169.99,
    priceRange: { min: 149.99, max: 199.99 },
    inStock: true,
    stockCount: 3421,
    rating: 4.8,
    reviewCount: 8743,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #2563EB 100%)",
    imageLabel: "990 Pro 2TB",
    specs: [
      { name: "capacity", value: "2TB" },
      { name: "interface", value: "PCIe 4.0 NVMe" },
      { name: "read_speed", value: "7450 MB/s" },
      { name: "write_speed", value: "6900 MB/s" }
    ],
    mpn: "MZ-V9P2T0BW",
    offers: [
      { supplierCode: "amazon", price: 169.99, inventory: 1820, externalId: "B0BHJJJJV3" },
      { supplierCode: "newegg", price: 159.99, inventory: 1601, externalId: "N82E16820147835" },
      { supplierCode: "ebay", price: 149.99, inventory: 0, externalId: "ebay-990pro" }
    ]
  },

  // ── Electronic Components ──────────────────────────────
  {
    sku: "SF-MCU-STM32F407",
    slug: "stm32f407vgt6",
    title: "STM32F407VGT6 Microcontroller",
    brand: "STMicroelectronics",
    categorySlug: "mcu",
    nicheId: "electronic-components",
    description:
      "Microcontrolador ARM Cortex-M4 STM32F407VGT6, 1MB Flash, 192KB RAM, 168MHz, LQFP-100.",
    price: 14.21,
    priceRange: { min: 12.5, max: 18.9 },
    inStock: true,
    stockCount: 45821,
    rating: 4.9,
    reviewCount: 1243,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #3B82F6 100%)",
    imageLabel: "STM32F407",
    specs: [
      { name: "core", value: "ARM Cortex-M4" },
      { name: "flash", value: "1MB" },
      { name: "clock", value: "168MHz" },
      { name: "package", value: "LQFP-100" }
    ],
    mpn: "STM32F407VGT6",
    offers: [
      { supplierCode: "digikey", price: 14.21, inventory: 45821, externalId: "STM32F407VGT6-ND" },
      { supplierCode: "amazon", price: 18.9, inventory: 124, externalId: "B07Q14XD2K" },
      { supplierCode: "ebay", price: 12.5, inventory: 890, externalId: "ebay-stm32f407" }
    ]
  },
  {
    sku: "SF-MCU-ESP32-WROOM",
    slug: "esp32-wroom-32",
    title: "ESP32-WROOM-32 WiFi + Bluetooth Module",
    brand: "Espressif",
    categorySlug: "mcu",
    nicheId: "electronic-components",
    description:
      "Módulo ESP32-WROOM-32 com WiFi 2.4GHz + Bluetooth 4.2, dual-core Xtensa LX6, 4MB Flash.",
    price: 3.2,
    priceRange: { min: 2.8, max: 4.5 },
    inStock: true,
    stockCount: 128400,
    rating: 4.8,
    reviewCount: 3421,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #6366F1 100%)",
    imageLabel: "ESP32-WROOM",
    specs: [
      { name: "core", value: "Xtensa LX6 dual-core" },
      { name: "wifi", value: "2.4GHz 802.11 b/g/n" },
      { name: "bluetooth", value: "4.2 BR/EDR + BLE" },
      { name: "flash", value: "4MB" }
    ],
    mpn: "ESP32-WROOM-32",
    offers: [
      { supplierCode: "digikey", price: 3.2, inventory: 128400, externalId: "ESP32-WROOM-32-ND" },
      { supplierCode: "amazon", price: 4.5, inventory: 523, externalId: "B08D5ZD528" },
      { supplierCode: "aliexpress", price: 2.8, inventory: 50000, externalId: "aliexpress-esp32" }
    ]
  },
  {
    sku: "SF-IC-LM358",
    slug: "lm358-dual-op-amp",
    title: "LM358 Dual Operational Amplifier",
    brand: "Texas Instruments",
    categorySlug: "ic",
    nicheId: "electronic-components",
    description: "Amplificador operacional duplo LM358, baixo consumo, DIP-8, 3V a 32V.",
    price: 0.45,
    priceRange: { min: 0.32, max: 0.68 },
    inStock: true,
    stockCount: 542000,
    rating: 4.7,
    reviewCount: 876,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #0891B2 100%)",
    imageLabel: "LM358",
    specs: [
      { name: "type", value: "Dual Op-Amp" },
      { name: "package", value: "DIP-8" },
      { name: "supply", value: "3V to 32V" },
      { name: "power", value: "Low Power" }
    ],
    mpn: "LM358P",
    offers: [
      { supplierCode: "digikey", price: 0.45, inventory: 542000, externalId: "296-1395-5-ND" },
      { supplierCode: "amazon", price: 0.68, inventory: 1240, externalId: "B00D1O8Q5U" },
      { supplierCode: "ebay", price: 0.32, inventory: 8900, externalId: "ebay-lm358" }
    ]
  },
  {
    sku: "SF-SENSOR-BME280",
    slug: "bme280-temp-humidity-pressure-sensor",
    title: "BME280 Temperature + Humidity + Pressure Sensor",
    brand: "Bosch",
    categorySlug: "sensor",
    nicheId: "electronic-components",
    description:
      "Sensor BME280 de temperatura, umidade e pressão atmosférica, interface I²C/SPI, breakout board.",
    price: 4.85,
    priceRange: { min: 3.9, max: 6.2 },
    inStock: true,
    stockCount: 32100,
    rating: 4.9,
    reviewCount: 2104,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #059669 100%)",
    imageLabel: "BME280",
    specs: [
      { name: "measures", value: "Temp + Humidity + Pressure" },
      { name: "interface", value: "I²C / SPI" },
      { name: "voltage", value: "3.3V" },
      { name: "package", value: "Breakout" }
    ],
    mpn: "BME280",
    offers: [
      { supplierCode: "digikey", price: 4.85, inventory: 32100, externalId: "828-1063-ND" },
      { supplierCode: "amazon", price: 6.2, inventory: 890, externalId: "B0CHW9X6T9" },
      { supplierCode: "aliexpress", price: 3.9, inventory: 15000, externalId: "aliexpress-bme280" }
    ]
  },

  // ── Consumer Electronics ───────────────────────────────
  {
    sku: "SF-PHONE-IP15PM-256",
    slug: "iphone-15-pro-max-256gb",
    title: "iPhone 15 Pro Max 256GB",
    brand: "Apple",
    categorySlug: "smartphone",
    nicheId: "consumer-electronics",
    description:
      'iPhone 15 Pro Max 256GB, chip A17 Pro, tela OLED 6.7", estrutura em titânio, USB-C.',
    price: 1199.0,
    priceRange: { min: 1099.0, max: 1299.0 },
    inStock: true,
    stockCount: 2103,
    rating: 4.8,
    reviewCount: 12453,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #6B7280 100%)",
    imageLabel: "iPhone 15 Pro",
    specs: [
      { name: "chip", value: "A17 Pro" },
      { name: "display", value: '6.7" OLED' },
      { name: "storage", value: "256GB" },
      { name: "material", value: "Titanium" }
    ],
    mpn: "MTUW3LL/A",
    offers: [
      { supplierCode: "amazon", price: 1199.0, inventory: 1203, externalId: "B0CMZD7VCV" },
      { supplierCode: "ebay", price: 1099.0, inventory: 900, externalId: "ebay-iphone15pm" },
      { supplierCode: "aliexpress", price: 1149.0, inventory: 0, externalId: "aliexpress-iphone15" }
    ]
  },
  {
    sku: "SF-AUDIO-AIRPODS-PRO2",
    slug: "airpods-pro-2nd-gen",
    title: "AirPods Pro (2nd Generation)",
    brand: "Apple",
    categorySlug: "audio",
    nicheId: "consumer-electronics",
    description:
      "AirPods Pro 2ª geração com cancelamento de ruído ativo, áudio espacial, estojo USB-C.",
    price: 199.0,
    priceRange: { min: 179.0, max: 249.0 },
    inStock: true,
    stockCount: 5421,
    rating: 4.7,
    reviewCount: 18732,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #9CA3AF 100%)",
    imageLabel: "AirPods Pro 2",
    specs: [
      { name: "anc", value: "Active Noise Cancellation" },
      { name: "audio", value: "Spatial Audio" },
      { name: "charging", value: "USB-C" },
      { name: "battery", value: "6h (ANC on)" }
    ],
    mpn: "MTJV3AM/A",
    offers: [
      { supplierCode: "amazon", price: 199.0, inventory: 3421, externalId: "B0CHWRXH8C" },
      { supplierCode: "ebay", price: 179.0, inventory: 2000, externalId: "ebay-airpodspro2" },
      { supplierCode: "aliexpress", price: 189.0, inventory: 0, externalId: "aliexpress-airpods" }
    ]
  },
  {
    sku: "SF-PHONE-GS24U-512",
    slug: "samsung-galaxy-s24-ultra",
    title: "Samsung Galaxy S24 Ultra 512GB",
    brand: "Samsung",
    categorySlug: "smartphone",
    nicheId: "consumer-electronics",
    description:
      'Samsung Galaxy S24 Ultra 512GB, Snapdragon 8 Gen 3, câmera 200MP, S Pen incluída, tela 6.8".',
    price: 1299.99,
    priceRange: { min: 1199.99, max: 1419.99 },
    inStock: true,
    stockCount: 1876,
    rating: 4.8,
    reviewCount: 8721,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #4F46E5 100%)",
    imageLabel: "Galaxy S24 Ultra",
    specs: [
      { name: "chip", value: "Snapdragon 8 Gen 3" },
      { name: "camera", value: "200MP" },
      { name: "display", value: '6.8" AMOLED' },
      { name: "included", value: "S Pen" }
    ],
    mpn: "SM-S928B",
    offers: [
      { supplierCode: "amazon", price: 1299.99, inventory: 1076, externalId: "B0CMDRCZBJ" },
      { supplierCode: "ebay", price: 1199.99, inventory: 800, externalId: "ebay-galaxy-s24" },
      { supplierCode: "aliexpress", price: 1249.99, inventory: 0, externalId: "aliexpress-s24" }
    ]
  },
  {
    sku: "SF-WEARABLE-AW9",
    slug: "apple-watch-series-9",
    title: "Apple Watch Series 9 45mm",
    brand: "Apple",
    categorySlug: "wearable",
    nicheId: "consumer-electronics",
    description:
      "Apple Watch Series 9 GPS + Cellular 45mm, chip S9 SiP, tela Always-On Retina, Double Tap.",
    price: 399.0,
    priceRange: { min: 349.0, max: 499.0 },
    inStock: false,
    stockCount: 0,
    rating: 4.7,
    reviewCount: 6543,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #EC4899 100%)",
    imageLabel: "Watch Series 9",
    specs: [
      { name: "size", value: "45mm" },
      { name: "display", value: "Always-On Retina" },
      { name: "connectivity", value: "GPS + Cellular" },
      { name: "chip", value: "S9 SiP" }
    ],
    mpn: "MUQ03LL/A",
    offers: [
      { supplierCode: "amazon", price: 399.0, inventory: 0, externalId: "B0CHX7G2W3" },
      { supplierCode: "ebay", price: 349.0, inventory: 0, externalId: "ebay-watch9" },
      { supplierCode: "aliexpress", price: 379.0, inventory: 0, externalId: "aliexpress-aw9" }
    ]
  },

  // ── Chinese Manufacturers (Tier C) ───────────────────────
  // These products come primarily from AliExpress and Chinese marketplaces,
  // representing the expanded manufacturer coverage.
  {
    sku: "SF-MB-COLORFUL-X79",
    slug: "colorful-x79-turbo-ddr3-motherboard",
    title: "Colorful X79 Turbo DDR3 Motherboard (LGA2011)",
    brand: "Colorful",
    categorySlug: "motherboard",
    nicheId: "pc-hardware",
    description:
      "Placa-mãe Colorful X79 Turbo, socket LGA2011, DDR3 ECC, suporte para Xeon E5-2600 v1/v2. Fabricante chinês Tier C.",
    price: 89.99,
    priceRange: { min: 79.99, max: 109.99 },
    inStock: true,
    stockCount: 342,
    rating: 4.3,
    reviewCount: 876,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #DC2626 100%)",
    imageLabel: "Colorful X79",
    specs: [
      { name: "socket", value: "LGA2011" },
      { name: "chipset", value: "Intel X79" },
      { name: "memory", value: "DDR3 ECC" },
      { name: "cpu_support", value: "Xeon E5-2600 v1/v2" }
    ],
    mpn: "X79-TURBO",
    offers: [
      {
        supplierCode: "aliexpress",
        price: 79.99,
        inventory: 280,
        externalId: "aliexpress-colorful-x79"
      },
      { supplierCode: "ebay", price: 89.99, inventory: 42, externalId: "ebay-colorful-x79" },
      { supplierCode: "amazon", price: 109.99, inventory: 20, externalId: "B0BX79COLOR" }
    ]
  },
  {
    sku: "SF-MB-HUANANZHI-X99",
    slug: "huananzhi-x99-f8-ddr4-motherboard",
    title: "Huananzhi X99-F8 DDR4 Motherboard (LGA2011-3)",
    brand: "Huananzhi",
    categorySlug: "motherboard",
    nicheId: "pc-hardware",
    description:
      "Placa-mãe Huananzhi X99-F8, socket LGA2011-3, DDR4, suporte para Xeon E5 v3/v4. Fabricante chinês Tier C popular em builds econômicos.",
    price: 74.99,
    priceRange: { min: 65.0, max: 89.99 },
    inStock: true,
    stockCount: 521,
    rating: 4.4,
    reviewCount: 1543,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #1E40AF 100%)",
    imageLabel: "Huananzhi X99",
    specs: [
      { name: "socket", value: "LGA2011-3" },
      { name: "chipset", value: "Intel X99" },
      { name: "memory", value: "DDR4 ECC" },
      { name: "cpu_support", value: "Xeon E5 v3/v4" }
    ],
    mpn: "X99-F8",
    offers: [
      {
        supplierCode: "aliexpress",
        price: 65.0,
        inventory: 423,
        externalId: "aliexpress-huananzhi-x99"
      },
      { supplierCode: "ebay", price: 74.99, inventory: 78, externalId: "ebay-huananzhi-x99" },
      { supplierCode: "amazon", price: 89.99, inventory: 20, externalId: "B0HX99HUAN" }
    ]
  },
  {
    sku: "SF-SSD-NETAC-1TB",
    slug: "netac-n930s-1tb-ssd",
    title: "Netac N930S 1TB SATA SSD",
    brand: "Netac",
    categorySlug: "ssd",
    nicheId: "pc-hardware",
    description:
      "SSD SATA Netac N930S 1TB, leitura até 550 MB/s, gravação até 450 MB/s. Fabricante chinês Tier C, custo-benefício.",
    price: 42.99,
    priceRange: { min: 38.99, max: 52.99 },
    inStock: true,
    stockCount: 2104,
    rating: 4.5,
    reviewCount: 2341,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #7C3AED 100%)",
    imageLabel: "Netac 1TB",
    specs: [
      { name: "capacity", value: "1TB" },
      { name: "interface", value: "SATA III" },
      { name: "read_speed", value: "550 MB/s" },
      { name: "write_speed", value: "450 MB/s" }
    ],
    mpn: "N930S-1TB",
    offers: [
      {
        supplierCode: "aliexpress",
        price: 38.99,
        inventory: 1820,
        externalId: "aliexpress-netac-1tb"
      },
      { supplierCode: "amazon", price: 42.99, inventory: 204, externalId: "B0NETAC1TB" },
      { supplierCode: "ebay", price: 52.99, inventory: 80, externalId: "ebay-netac-1tb" }
    ]
  },
  {
    sku: "SF-SSD-GLOWAY-2TB",
    slug: "gloway-2tb-nvme-ssd",
    title: "Gloway 2TB NVMe PCIe 3.0 SSD",
    brand: "Gloway",
    categorySlug: "ssd",
    nicheId: "pc-hardware",
    description:
      "SSD NVMe Gloway 2TB, PCIe 3.0 x4, leitura até 3300 MB/s. Fabricante chinês Tier C, popular em builds gamers.",
    price: 79.99,
    priceRange: { min: 72.99, max: 95.99 },
    inStock: true,
    stockCount: 876,
    rating: 4.6,
    reviewCount: 1789,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #059669 100%)",
    imageLabel: "Gloway 2TB",
    specs: [
      { name: "capacity", value: "2TB" },
      { name: "interface", value: "PCIe 3.0 NVMe" },
      { name: "read_speed", value: "3300 MB/s" },
      { name: "write_speed", value: "2700 MB/s" }
    ],
    mpn: "GLOWAY-2TB-NVME",
    offers: [
      {
        supplierCode: "aliexpress",
        price: 72.99,
        inventory: 678,
        externalId: "aliexpress-gloway-2tb"
      },
      { supplierCode: "amazon", price: 79.99, inventory: 142, externalId: "B0GLOWAY2T" },
      { supplierCode: "ebay", price: 95.99, inventory: 56, externalId: "ebay-gloway-2tb" }
    ]
  },
  {
    sku: "SF-RAM-GLOWAY-32GB",
    slug: "gloway-ddr4-32gb-3200mhz",
    title: "Gloway DDR4 32GB (2×16GB) 3200MHz",
    brand: "Gloway",
    categorySlug: "ram",
    nicheId: "pc-hardware",
    description:
      "Memória RAM Gloway DDR4 32GB (2×16GB) 3200MHz CL18, desktop. Fabricante chinês Tier C com boa relação custo-benefício.",
    price: 54.99,
    priceRange: { min: 49.99, max: 64.99 },
    inStock: true,
    stockCount: 1432,
    rating: 4.6,
    reviewCount: 987,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #0891B2 100%)",
    imageLabel: "Gloway DDR4 32GB",
    specs: [
      { name: "capacity", value: "32GB (2×16GB)" },
      { name: "type", value: "DDR4" },
      { name: "speed", value: "3200 MHz" },
      { name: "cas_latency", value: "CL18" }
    ],
    mpn: "GLOWAY-DDR4-32G-3200",
    offers: [
      {
        supplierCode: "aliexpress",
        price: 49.99,
        inventory: 1120,
        externalId: "aliexpress-gloway-ram"
      },
      { supplierCode: "amazon", price: 54.99, inventory: 234, externalId: "B0GLOWAYRAM" },
      { supplierCode: "ebay", price: 64.99, inventory: 78, externalId: "ebay-gloway-ram" }
    ]
  },
  {
    sku: "SF-PSU-SEGOTEP-850W",
    slug: "segotep-850w-80plus-gold-psu",
    title: "Segotep 850W 80+ Gold Modular PSU",
    brand: "Segotep",
    categorySlug: "psu",
    nicheId: "pc-hardware",
    description:
      "Fonte Segotep 850W 80+ Gold, modular, ATX 3.0, PCIe 5.0 12VHPWR. Fabricante chinês Tier C.",
    price: 79.99,
    priceRange: { min: 69.99, max: 94.99 },
    inStock: true,
    stockCount: 423,
    rating: 4.5,
    reviewCount: 654,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #CA8A04 100%)",
    imageLabel: "Segotep 850W",
    specs: [
      { name: "wattage", value: "850W" },
      { name: "efficiency", value: "80+ Gold" },
      { name: "modular", value: "Full Modular" },
      { name: "atx", value: "ATX 3.0" }
    ],
    mpn: "SEGOTEP-850G",
    offers: [
      {
        supplierCode: "aliexpress",
        price: 69.99,
        inventory: 312,
        externalId: "aliexpress-segotep-850"
      },
      { supplierCode: "amazon", price: 79.99, inventory: 89, externalId: "B0SEGOTEP850" },
      { supplierCode: "ebay", price: 94.99, inventory: 22, externalId: "ebay-segotep-850" }
    ]
  },
  {
    sku: "SF-CASE-JONSBO-D31",
    slug: "jonsbo-d31-mesh-case",
    title: "Jonsbo D31 Mesh ARGB Case (Pink)",
    brand: "Jonsbo",
    categorySlug: "case",
    nicheId: "pc-hardware",
    description:
      "Gabinete Jonsbo D31 Mesh, ATX, vidro temperado, fans ARGB incluídos. Fabricante chinês Tier C conhecido por designs únicos.",
    price: 89.99,
    priceRange: { min: 79.99, max: 109.99 },
    inStock: true,
    stockCount: 234,
    rating: 4.7,
    reviewCount: 432,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #EC4899 100%)",
    imageLabel: "Jonsbo D31",
    specs: [
      { name: "form_factor", value: "ATX / M-ATX / ITX" },
      { name: "material", value: "Vidro temperado + malha" },
      { name: "fans_included", value: "3× ARGB" },
      { name: "color", value: "Pink" }
    ],
    mpn: "D31-MESH-PINK",
    offers: [
      {
        supplierCode: "aliexpress",
        price: 79.99,
        inventory: 178,
        externalId: "aliexpress-jonsbo-d31"
      },
      { supplierCode: "amazon", price: 89.99, inventory: 42, externalId: "B0JONSBO31" },
      { supplierCode: "ebay", price: 109.99, inventory: 14, externalId: "ebay-jonsbo-d31" }
    ]
  },
  {
    sku: "SF-COOLER-DEEPCOOL-AK620",
    slug: "deepcool-ak620-dual-tower-cooler",
    title: "DeepCool AK620 Dual Tower CPU Cooler",
    brand: "DeepCool",
    categorySlug: "case",
    nicheId: "pc-hardware",
    description:
      "Cooler CPU DeepCool AK620, dual tower, 6 heat pipes, 2 fans 120mm. Fabricante chinês Tier C, performance comparável a Noctua.",
    price: 54.99,
    priceRange: { min: 49.99, max: 64.99 },
    inStock: true,
    stockCount: 678,
    rating: 4.8,
    reviewCount: 1234,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #2563EB 100%)",
    imageLabel: "DeepCool AK620",
    specs: [
      { name: "type", value: "Dual Tower Air" },
      { name: "heat_pipes", value: "6" },
      { name: "fans", value: "2× 120mm" },
      { name: "tdp", value: "260W" }
    ],
    mpn: "AK620",
    offers: [
      {
        supplierCode: "aliexpress",
        price: 49.99,
        inventory: 534,
        externalId: "aliexpress-deepcool-ak620"
      },
      { supplierCode: "amazon", price: 54.99, inventory: 112, externalId: "B0DEEPCOL620" },
      { supplierCode: "ebay", price: 64.99, inventory: 32, externalId: "ebay-deepcool-ak620" }
    ]
  },
  {
    sku: "SF-MINIPC-MINISFORUM-N100",
    slug: "minisforum-n100-mini-pc",
    title: "Minisforum N100 Mini PC (16GB RAM, 500GB SSD)",
    brand: "Minisforum",
    categorySlug: "monitor",
    nicheId: "pc-hardware",
    description:
      "Mini PC Minisforum com Intel N100, 16GB DDR4, 500GB SSD, WiFi 6, Bluetooth 5.2. Fabricante chinês Tier C de mini PCs.",
    price: 199.99,
    priceRange: { min: 179.99, max: 239.99 },
    inStock: true,
    stockCount: 312,
    rating: 4.5,
    reviewCount: 567,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #4F46E5 100%)",
    imageLabel: "Minisforum N100",
    specs: [
      { name: "cpu", value: "Intel N100" },
      { name: "ram", value: "16GB DDR4" },
      { name: "storage", value: "500GB SSD" },
      { name: "connectivity", value: "WiFi 6 + BT 5.2" }
    ],
    mpn: "MINISFORUM-N100",
    offers: [
      {
        supplierCode: "aliexpress",
        price: 179.99,
        inventory: 234,
        externalId: "aliexpress-minisforum-n100"
      },
      { supplierCode: "amazon", price: 199.99, inventory: 65, externalId: "B0MINIS100" },
      { supplierCode: "ebay", price: 239.99, inventory: 13, externalId: "ebay-minisforum-n100" }
    ]
  },
  {
    sku: "SF-SSD-KINGSPEC-512GB",
    slug: "kingspec-512gb-nvme-ssd",
    title: "KingSpec 512GB NVMe PCIe 3.0 SSD",
    brand: "KingSpec",
    categorySlug: "ssd",
    nicheId: "pc-hardware",
    description:
      "SSD NVMe KingSpec 512GB, PCIe 3.0, leitura até 2000 MB/s. Fabricante chinês Tier C, entry-level NVMe.",
    price: 24.99,
    priceRange: { min: 21.99, max: 32.99 },
    inStock: true,
    stockCount: 3421,
    rating: 4.3,
    reviewCount: 1876,
    imageGradient: "linear-gradient(135deg, #0F172A 0%, #6D28D9 100%)",
    imageLabel: "KingSpec 512GB",
    specs: [
      { name: "capacity", value: "512GB" },
      { name: "interface", value: "PCIe 3.0 NVMe" },
      { name: "read_speed", value: "2000 MB/s" },
      { name: "write_speed", value: "1500 MB/s" }
    ],
    mpn: "KINGSPEC-512G-NVME",
    offers: [
      {
        supplierCode: "aliexpress",
        price: 21.99,
        inventory: 2890,
        externalId: "aliexpress-kingspec-512"
      },
      { supplierCode: "amazon", price: 24.99, inventory: 423, externalId: "B0KSPEC512" },
      { supplierCode: "ebay", price: 32.99, inventory: 108, externalId: "ebay-kingspec-512" }
    ]
  }
];

// ── Helpers ────────────────────────────────────────────────

function toMinorUnits(usd: number): bigint {
  return BigInt(Math.round(usd * 100));
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding ShopFinder catalog...\n");

  // 0. Ensure Store exists (force-reset wipes it)
  console.log("  → Store...");
  await prisma.store.upsert({
    where: { id: STORE_ID },
    update: {
      name: "ShopFinder — Default Store",
      slug: "default",
      defaultCurrency: "USD",
      defaultLocale: "pt-BR",
      settings: JSON.stringify({ timezone: "America/Sao_Paulo", taxInclusive: false, roundToMinorUnit: true }),
      status: "active"
    },
    create: {
      id: STORE_ID,
      name: "ShopFinder — Default Store",
      slug: "default",
      defaultCurrency: "USD",
      defaultLocale: "pt-BR",
      settings: JSON.stringify({ timezone: "America/Sao_Paulo", taxInclusive: false, roundToMinorUnit: true }),
      status: "active"
    }
  });

  // Also ensure at least one User exists (Store requires it via some FK constraints)
  await prisma.user.upsert({
    where: { email: "admin@shopfinder.local" },
    update: {},
    create: {
      email: "admin@shopfinder.local",
      passwordHash: "dummy",
      roles: JSON.stringify(["admin"]),
      storeId: STORE_ID,
      status: "active"
    }
  });

  // Ensure Country/Currency data exists (required by some FK constraints)
  const countryCount = await prisma.country.count();
  if (countryCount === 0) {
    await prisma.country.createMany({
      data: [
        { code: "US", name: "United States", region: "Americas" },
        { code: "BR", name: "Brazil", region: "Americas" },
        { code: "CN", name: "China", region: "Asia" },
        { code: "TW", name: "Taiwan", region: "Asia" },
        { code: "JP", name: "Japan", region: "Asia" },
        { code: "KR", name: "South Korea", region: "Asia" }
      ]
    });
  }
  const currencyCount = await prisma.currency.count();
  if (currencyCount === 0) {
    await prisma.currency.createMany({
      data: [
        { code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2 },
        { code: "BRL", name: "Brazilian Real", symbol: "R$", decimalPlaces: 2 },
        { code: "EUR", name: "Euro", symbol: "€", decimalPlaces: 2 },
        { code: "CNY", name: "Chinese Yuan", symbol: "¥", decimalPlaces: 2 }
      ]
    });
  }

  // 1. Categories — store niches as metadata in description
  console.log("  → Categories...");
  const categoryMap = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { storeId_slug: { storeId: STORE_ID, slug: cat.slug } },
      update: {
        name: cat.name,
        description: JSON.stringify({ nicheId: cat.nicheId })
      },
      create: {
        storeId: STORE_ID,
        slug: cat.slug,
        name: cat.name,
        description: JSON.stringify({ nicheId: cat.nicheId })
      }
    });
    categoryMap.set(cat.slug, created.id);
  }
  console.log(`    ✓ ${CATEGORIES.length} categories\n`);

  // 2. Suppliers
  console.log("  → Suppliers...");
  const supplierMap = new Map<string, string>();
  for (const sup of SUPPLIERS) {
    const created = await prisma.supplier.upsert({
      where: { code: sup.code },
      update: {
        name: sup.name,
        defaultCurrency: sup.defaultCurrency,
        shipsFromCountry: sup.shipsFromCountry,
        status: "active"
      },
      create: {
        code: sup.code,
        name: sup.name,
        defaultCurrency: sup.defaultCurrency,
        shipsFromCountry: sup.shipsFromCountry,
        status: "active"
      }
    });
    supplierMap.set(sup.code, created.id);
  }
  console.log(`    ✓ ${SUPPLIERS.length} suppliers\n`);

  // 3. Products + Variants + Offers + Inventory + Media + Attributes
  console.log("  → Products...");
  let productCount = 0;
  let offerCount = 0;

  for (const p of PRODUCTS) {
    const categoryId = categoryMap.get(p.categorySlug)!;

    // Product
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        status: "published",
        basePriceMinorUnits: toMinorUnits(p.price),
        basePriceCurrencyCode: "USD",
        categoryId,
        createdBy: "seed"
      },
      create: {
        storeId: STORE_ID,
        sku: p.sku,
        slug: p.slug,
        title: p.title,
        description: p.description,
        status: "published",
        basePriceMinorUnits: toMinorUnits(p.price),
        basePriceCurrencyCode: "USD",
        categoryId,
        createdBy: "seed"
      }
    });

    // Variant (1 per product)
    const variant = await prisma.variant.upsert({
      where: { sku: `${p.sku}-V1` },
      update: {
        productId: product.id,
        priceMinorUnits: toMinorUnits(p.price),
        priceCurrencyCode: "USD",
        isActive: true,
        createdBy: "seed"
      },
      create: {
        productId: product.id,
        sku: `${p.sku}-V1`,
        priceMinorUnits: toMinorUnits(p.price),
        priceCurrencyCode: "USD",
        isActive: true,
        createdBy: "seed"
      }
    });

    // ProductMedia (gradient as metadata, no real image URL)
    await prisma.productMedia.deleteMany({ where: { productId: product.id } });
    await prisma.productMedia.create({
      data: {
        productId: product.id,
        url: `data:gradient;${p.imageGradient}`,
        altText: p.imageLabel,
        position: 0,
        isPrimary: true
      }
    });

    // ProductAttributes (specs)
    await prisma.productAttribute.deleteMany({ where: { productId: product.id } });
    for (const spec of p.specs) {
      await prisma.productAttribute.create({
        data: {
          productId: product.id,
          name: spec.name,
          value: spec.value
        }
      });
    }

    // ProductOffers (multiple per product)
    await prisma.productOffer.deleteMany({ where: { productId: product.id } });
    for (const offer of p.offers) {
      const supplierId = supplierMap.get(offer.supplierCode)!;
      await prisma.productOffer.create({
        data: {
          supplierId,
          productId: product.id,
          variantId: variant.id,
          supplierSku: `${p.sku}-${offer.supplierCode}`,
          externalProvider: offer.supplierCode,
          externalId: offer.externalId,
          priceMinorUnits: toMinorUnits(offer.price),
          priceCurrencyCode: "USD",
          inventory: offer.inventory,
          fulfillmentDaysMin: 1,
          fulfillmentDaysMax: offer.supplierCode === "aliexpress" ? 30 : 5,
          shipsFromCountry: SUPPLIERS.find((s) => s.code === offer.supplierCode)!.shipsFromCountry,
          isActive: true,
          lastSyncedAt: new Date(),
          createdBy: "seed"
        }
      });
      offerCount++;

      // Inventory
      await prisma.inventory.create({
        data: {
          variantId: variant.id,
          productOfferId: null, // simplify: inventory at variant level
          available: offer.inventory,
          reserved: 0,
          committed: 0,
          createdBy: "seed"
        }
      });
    }

    productCount++;
  }

  console.log(`    ✓ ${productCount} products, ${offerCount} offers\n`);

  // 4. Summary
  console.log("════════════════════════════════════════════");
  console.log("  ShopFinder catalog seeded successfully!");
  console.log("════════════════════════════════════════════");
  console.log(`  Categories:   ${CATEGORIES.length}`);
  console.log(`  Suppliers:    ${SUPPLIERS.length}`);
  console.log(`  Products:     ${productCount}`);
  console.log(`  Variants:     ${productCount}`);
  console.log(`  Offers:       ${offerCount}`);
  console.log(`  Niches:       ${NICHES.length}`);
  console.log("════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
