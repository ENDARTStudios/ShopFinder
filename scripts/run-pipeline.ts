/**
 * ShopFinder — Pipeline Runner (Sprint 1)
 *
 * Executes the discovery pipeline end-to-end with fixture data:
 *   1. DiscoverySignal → DiscoveryJob (simulated)
 *   2. Worker fetches raw product data (simulated via fixtures)
 *   3. Normalize (title, brand, category, attributes, price)
 *   4. Similarity clustering (simulated — each product is its own cluster)
 *   5. Resolution → CanonicalProduct
 *   6. Manufacturer Enrichment (Intel/AMD with evidence)
 *   7. AI Evaluation (mock)
 *   8. Compliance (mock — pass all)
 *   9. Catalog Materialization → persist to Prisma
 *
 * Each product gets:
 *   - ProductAttribute records with `source`, `sourceName`, `confidence`, and `evidence` JSON
 *   - ProductOffer records from multiple suppliers (Amazon, Newegg, eBay, AliExpress)
 *   - ProductMedia (gradient placeholder)
 *
 * Run: bun run scripts/run-pipeline.ts
 */
import { PrismaClient } from "@prisma/client";
import { resolveAttribute } from "@workspace/domain/discovery/enrichment";

const prisma = new PrismaClient();
const STORE_ID = "cmrfu2kdb0000oybnlekztroj";

// ── Pipeline fixture: 10 discovery signals ─────────────────

interface PipelineSignal {
  keyword: string;
  brand: string;
  title: string;
  mpn: string;
  categorySlug: string;
  nicheId: string;
  basePrice: number;
  gradient: string;
  label: string;
  // Manufacturer enrichment data
  manufacturer: string;
  manufacturerCode: string;
  specs: Array<{ name: string; value: string; unit?: string }>;
  // Offers from multiple sources
  offers: Array<{
    supplierCode: string;
    price: number;
    inventory: number;
    externalId: string;
  }>;
}

const SIGNALS: PipelineSignal[] = [
  {
    keyword: "Intel Core i9-14900K",
    brand: "Intel",
    title: "Intel Core i9-14900K Desktop Processor",
    mpn: "BX8071514900K",
    categorySlug: "cpu",
    nicheId: "pc-hardware",
    basePrice: 589.99,
    gradient: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)",
    label: "i9-14900K",
    manufacturer: "Intel Corporation",
    manufacturerCode: "intel",
    specs: [
      { name: "socket", value: "LGA1700" },
      { name: "cores", value: "24" },
      { name: "threads", value: "32" },
      { name: "base_clock", value: "3.2 GHz", unit: "GHz" },
      { name: "max_turbo", value: "6.0 GHz", unit: "GHz" },
      { name: "tdp", value: "125W", unit: "W" },
      { name: "lithography", value: "Intel 7" }
    ],
    offers: [
      { supplierCode: "amazon", price: 589.99, inventory: 423, externalId: "B0CJ4LL1YK" },
      { supplierCode: "newegg", price: 579.99, inventory: 312, externalId: "N82E16819118410" },
      { supplierCode: "ebay", price: 549.99, inventory: 512, externalId: "ebay-i9-14900k" }
    ]
  },
  {
    keyword: "AMD Ryzen 9 7950X",
    brand: "AMD",
    title: "AMD Ryzen 9 7950X Desktop Processor",
    mpn: "100-100000514WOF",
    categorySlug: "cpu",
    nicheId: "pc-hardware",
    basePrice: 549.00,
    gradient: "linear-gradient(135deg, #1A1A2E 0%, #E11D48 100%)",
    label: "Ryzen 9 7950X",
    manufacturer: "Advanced Micro Devices",
    manufacturerCode: "amd",
    specs: [
      { name: "socket", value: "AM5" },
      { name: "cores", value: "16" },
      { name: "threads", value: "32" },
      { name: "base_clock", value: "4.5 GHz", unit: "GHz" },
      { name: "max_turbo", value: "5.7 GHz", unit: "GHz" },
      { name: "tdp", value: "170W", unit: "W" },
      { name: "lithography", value: "TSMC 5nm FinFET" }
    ],
    offers: [
      { supplierCode: "amazon", price: 549.00, inventory: 312, externalId: "B0BBJ59PJ5" },
      { supplierCode: "newegg", price: 539.00, inventory: 280, externalId: "N82E16819113784" },
      { supplierCode: "amd", price: 599.00, inventory: 300, externalId: "100-100000514WOF" }
    ]
  },
  {
    keyword: "NVIDIA GeForce RTX 4090",
    brand: "NVIDIA",
    title: "NVIDIA GeForce RTX 4090 24GB GDDR6X",
    mpn: "900-1G136-0250-000",
    categorySlug: "gpu",
    nicheId: "pc-hardware",
    basePrice: 1599.99,
    gradient: "linear-gradient(135deg, #0F172A 0%, #16A34A 100%)",
    label: "RTX 4090",
    manufacturer: "NVIDIA Corporation",
    manufacturerCode: "nvidia",
    specs: [
      { name: "memory", value: "24GB GDDR6X" },
      { name: "cuda_cores", value: "16384" },
      { name: "tdp", value: "450W", unit: "W" },
      { name: "pcie_version", value: "PCIe 4.0" },
      { name: "memory_type", value: "GDDR6X" }
    ],
    offers: [
      { supplierCode: "amazon", price: 1599.99, inventory: 89, externalId: "B0BGGHS8Z1" },
      { supplierCode: "newegg", price: 1579.99, inventory: 145, externalId: "N82E16814137651" },
      { supplierCode: "ebay", price: 1499.99, inventory: 0, externalId: "ebay-rtx4090" }
    ]
  },
  {
    keyword: "Samsung 990 Pro 2TB",
    brand: "Samsung",
    title: "Samsung 990 Pro 2TB NVMe SSD",
    mpn: "MZ-V9P2T0BW",
    categorySlug: "ssd",
    nicheId: "pc-hardware",
    basePrice: 169.99,
    gradient: "linear-gradient(135deg, #0F172A 0%, #2563EB 100%)",
    label: "990 Pro 2TB",
    manufacturer: "Samsung Electronics",
    manufacturerCode: "samsung",
    specs: [
      { name: "capacity", value: "2TB" },
      { name: "interface", value: "PCIe 4.0 NVMe" },
      { name: "read_speed", value: "7450 MB/s" },
      { name: "write_speed", value: "6900 MB/s" }
    ],
    offers: [
      { supplierCode: "amazon", price: 169.99, inventory: 1820, externalId: "B0BHJJJJV3" },
      { supplierCode: "newegg", price: 159.99, inventory: 1601, externalId: "N82E16820147835" },
      { supplierCode: "ebay", price: 149.99, inventory: 0, externalId: "ebay-990pro" }
    ]
  },
  {
    keyword: "Kingston Fury DDR5 32GB",
    brand: "Kingston",
    title: "Kingston Fury DDR5 32GB (2×16GB) 6000MHz",
    mpn: "KF560C36BBE-32",
    categorySlug: "ram",
    nicheId: "pc-hardware",
    basePrice: 114.99,
    gradient: "linear-gradient(135deg, #0F172A 0%, #7C3AED 100%)",
    label: "Fury DDR5 32GB",
    manufacturer: "Kingston Technology",
    manufacturerCode: "kingston",
    specs: [
      { name: "capacity", value: "32GB (2×16GB)" },
      { name: "type", value: "DDR5" },
      { name: "speed", value: "6000 MHz" },
      { name: "cas_latency", value: "CL36" }
    ],
    offers: [
      { supplierCode: "amazon", price: 114.99, inventory: 523, externalId: "B0CHW9X6T9" },
      { supplierCode: "newegg", price: 109.99, inventory: 412, externalId: "N82E16820142032" }
    ]
  },
  {
    keyword: "STM32F407",
    brand: "STMicroelectronics",
    title: "STM32F407VGT6 ARM Cortex-M4 Microcontroller",
    mpn: "STM32F407VGT6",
    categorySlug: "mcu",
    nicheId: "electronic-components",
    basePrice: 14.21,
    gradient: "linear-gradient(135deg, #0F172A 0%, #3B82F6 100%)",
    label: "STM32F407",
    manufacturer: "STMicroelectronics",
    manufacturerCode: "stmicro", // not in registry but we handle gracefully
    specs: [
      { name: "core", value: "ARM Cortex-M4" },
      { name: "flash", value: "1MB" },
      { name: "clock", value: "168MHz" },
      { name: "package", value: "LQFP-100" }
    ],
    offers: [
      { supplierCode: "digikey", price: 14.21, inventory: 45821, externalId: "STM32F407VGT6-ND" },
      { supplierCode: "amazon", price: 18.90, inventory: 124, externalId: "B07Q14XD2K" },
      { supplierCode: "ebay", price: 12.50, inventory: 890, externalId: "ebay-stm32f407" }
    ]
  },
  {
    keyword: "iPhone 15 Pro Max",
    brand: "Apple",
    title: "Apple iPhone 15 Pro Max 256GB",
    mpn: "MTUW3LL/A",
    categorySlug: "smartphone",
    nicheId: "consumer-electronics",
    basePrice: 1199.00,
    gradient: "linear-gradient(135deg, #0F172A 0%, #6B7280 100%)",
    label: "iPhone 15 Pro",
    manufacturer: "Apple Inc.",
    manufacturerCode: "apple",
    specs: [
      { name: "chip", value: "A17 Pro" },
      { name: "display", value: "6.7\" OLED" },
      { name: "storage", value: "256GB" },
      { name: "material", value: "Titanium" }
    ],
    offers: [
      { supplierCode: "amazon", price: 1199.00, inventory: 1203, externalId: "B0CMZD7VCV" },
      { supplierCode: "ebay", price: 1099.00, inventory: 900, externalId: "ebay-iphone15pm" }
    ]
  },
  {
    keyword: "DeepCool AK620",
    brand: "DeepCool",
    title: "DeepCool AK620 Dual Tower CPU Cooler",
    mpn: "AK620",
    categorySlug: "case",
    nicheId: "pc-hardware",
    basePrice: 54.99,
    gradient: "linear-gradient(135deg, #0F172A 0%, #2563EB 100%)",
    label: "DeepCool AK620",
    manufacturer: "DeepCool",
    manufacturerCode: "deepcool",
    specs: [
      { name: "type", value: "Dual Tower Air" },
      { name: "heat_pipes", value: "6" },
      { name: "fans", value: "2× 120mm" },
      { name: "tdp", value: "260W" }
    ],
    offers: [
      { supplierCode: "aliexpress", price: 49.99, inventory: 534, externalId: "aliexpress-deepcool-ak620" },
      { supplierCode: "amazon", price: 54.99, inventory: 112, externalId: "B0DEEPCOL620" }
    ]
  },
  {
    keyword: "Gloway 2TB NVMe",
    brand: "Gloway",
    title: "Gloway 2TB NVMe PCIe 3.0 SSD",
    mpn: "GLOWAY-2TB-NVME",
    categorySlug: "ssd",
    nicheId: "pc-hardware",
    basePrice: 79.99,
    gradient: "linear-gradient(135deg, #0F172A 0%, #059669 100%)",
    label: "Gloway 2TB",
    manufacturer: "Gloway",
    manufacturerCode: "gloway",
    specs: [
      { name: "capacity", value: "2TB" },
      { name: "interface", value: "PCIe 3.0 NVMe" },
      { name: "read_speed", value: "3300 MB/s" },
      { name: "write_speed", value: "2700 MB/s" }
    ],
    offers: [
      { supplierCode: "aliexpress", price: 72.99, inventory: 678, externalId: "aliexpress-gloway-2tb" },
      { supplierCode: "amazon", price: 79.99, inventory: 142, externalId: "B0GLOWAY2T" }
    ]
  },
  {
    keyword: "Huananzhi X99-F8",
    brand: "Huananzhi",
    title: "Huananzhi X99-F8 DDR4 Motherboard (LGA2011-3)",
    mpn: "X99-F8",
    categorySlug: "motherboard",
    nicheId: "pc-hardware",
    basePrice: 74.99,
    gradient: "linear-gradient(135deg, #0F172A 0%, #1E40AF 100%)",
    label: "Huananzhi X99",
    manufacturer: "Huananzhi",
    manufacturerCode: "huananzhi",
    specs: [
      { name: "socket", value: "LGA2011-3" },
      { name: "chipset", value: "Intel X99" },
      { name: "memory", value: "DDR4 ECC" },
      { name: "cpu_support", value: "Xeon E5 v3/v4" }
    ],
    offers: [
      { supplierCode: "aliexpress", price: 65.00, inventory: 423, externalId: "aliexpress-huananzhi-x99" },
      { supplierCode: "ebay", price: 74.99, inventory: 78, externalId: "ebay-huananzhi-x99" }
    ]
  },
  // ── Sprint 5: Additional products for 50+ catalog ──────
  {
    keyword: "Intel Core i5-14600K",
    brand: "Intel", title: "Intel Core i5-14600K Desktop Processor",
    mpn: "BX8071514600K", categorySlug: "cpu", nicheId: "pc-hardware",
    basePrice: 319.99, gradient: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)", label: "i5-14600K",
    manufacturer: "Intel Corporation", manufacturerCode: "intel",
    specs: [
      { name: "socket", value: "LGA1700" }, { name: "cores", value: "14" }, { name: "threads", value: "20" },
      { name: "base_clock", value: "3.5 GHz" }, { name: "max_turbo", value: "5.3 GHz" }, { name: "tdp", value: "125W" }
    ],
    offers: [
      { supplierCode: "amazon", price: 319.99, inventory: 567, externalId: "B0CGJ12J3P" },
      { supplierCode: "newegg", price: 309.99, inventory: 234, externalId: "N82E16819118412" }
    ]
  },
  {
    keyword: "Intel Core i7-14700K",
    brand: "Intel", title: "Intel Core i7-14700K Desktop Processor",
    mpn: "BX8071514700K", categorySlug: "cpu", nicheId: "pc-hardware",
    basePrice: 419.99, gradient: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)", label: "i7-14700K",
    manufacturer: "Intel Corporation", manufacturerCode: "intel",
    specs: [
      { name: "socket", value: "LGA1700" }, { name: "cores", value: "20" }, { name: "threads", value: "28" },
      { name: "base_clock", value: "3.4 GHz" }, { name: "max_turbo", value: "5.6 GHz" }, { name: "tdp", value: "125W" }
    ],
    offers: [
      { supplierCode: "amazon", price: 419.99, inventory: 423, externalId: "B0CGJ15Z3K" },
      { supplierCode: "newegg", price: 409.99, inventory: 312, externalId: "N82E16819118413" }
    ]
  },
  {
    keyword: "AMD Ryzen 7 7800X3D",
    brand: "AMD", title: "AMD Ryzen 7 7800X3D Gaming Processor",
    mpn: "100-100000786WOF", categorySlug: "cpu", nicheId: "pc-hardware",
    basePrice: 399.00, gradient: "linear-gradient(135deg, #1A1A2E 0%, #E11D48 100%)", label: "Ryzen 7 7800X3D",
    manufacturer: "Advanced Micro Devices", manufacturerCode: "amd",
    specs: [
      { name: "socket", value: "AM5" }, { name: "cores", value: "8" }, { name: "threads", value: "16" },
      { name: "base_clock", value: "4.2 GHz" }, { name: "max_turbo", value: "5.0 GHz" }, { name: "tdp", value: "120W" }
    ],
    offers: [
      { supplierCode: "amazon", price: 399.00, inventory: 234, externalId: "B0BT8LB7DH" },
      { supplierCode: "newegg", price: 389.00, inventory: 178, externalId: "N82E16819113805" }
    ]
  },
  {
    keyword: "AMD Ryzen 5 7600X",
    brand: "AMD", title: "AMD Ryzen 5 7600X Desktop Processor",
    mpn: "100-100000593WOF", categorySlug: "cpu", nicheId: "pc-hardware",
    basePrice: 229.00, gradient: "linear-gradient(135deg, #1A1A2E 0%, #E11D48 100%)", label: "Ryzen 5 7600X",
    manufacturer: "Advanced Micro Devices", manufacturerCode: "amd",
    specs: [
      { name: "socket", value: "AM5" }, { name: "cores", value: "6" }, { name: "threads", value: "12" },
      { name: "base_clock", value: "4.7 GHz" }, { name: "max_turbo", value: "5.3 GHz" }, { name: "tdp", value: "105W" }
    ],
    offers: [
      { supplierCode: "amazon", price: 229.00, inventory: 678, externalId: "B0BBJ58T3X" },
      { supplierCode: "newegg", price: 219.00, inventory: 423, externalId: "N82E16819113804" }
    ]
  },
  {
    keyword: "NVIDIA RTX 4070 Super",
    brand: "NVIDIA", title: "NVIDIA GeForce RTX 4070 Super 12GB",
    mpn: "900-1G136-0260-000", categorySlug: "gpu", nicheId: "pc-hardware",
    basePrice: 599.99, gradient: "linear-gradient(135deg, #0F172A 0%, #16A34A 100%)", label: "RTX 4070 Super",
    manufacturer: "NVIDIA Corporation", manufacturerCode: "nvidia",
    specs: [
      { name: "memory", value: "12GB GDDR6X" }, { name: "cuda_cores", value: "7168" },
      { name: "tdp", value: "220W" }, { name: "pcie_version", value: "PCIe 4.0" }
    ],
    offers: [
      { supplierCode: "amazon", price: 599.99, inventory: 312, externalId: "B0NJCJ6T3X" },
      { supplierCode: "newegg", price: 589.99, inventory: 234, externalId: "N82E16814137660" }
    ]
  },
  {
    keyword: "NVIDIA RTX 4060 Ti",
    brand: "NVIDIA", title: "NVIDIA GeForce RTX 4060 Ti 8GB",
    mpn: "900-1G136-0230-000", categorySlug: "gpu", nicheId: "pc-hardware",
    basePrice: 399.99, gradient: "linear-gradient(135deg, #0F172A 0%, #16A34A 100%)", label: "RTX 4060 Ti",
    manufacturer: "NVIDIA Corporation", manufacturerCode: "nvidia",
    specs: [
      { name: "memory", value: "8GB GDDR6" }, { name: "cuda_cores", value: "4352" },
      { name: "tdp", value: "160W" }, { name: "pcie_version", value: "PCIe 4.0" }
    ],
    offers: [
      { supplierCode: "amazon", price: 399.99, inventory: 523, externalId: "B0BDF9KCQZ" },
      { supplierCode: "newegg", price: 389.99, inventory: 412, externalId: "N82E16814137655" }
    ]
  },
  {
    keyword: "Samsung 980 Pro 1TB",
    brand: "Samsung", title: "Samsung 980 Pro 1TB NVMe SSD",
    mpn: "MZ-V8P1T0BW", categorySlug: "ssd", nicheId: "pc-hardware",
    basePrice: 99.99, gradient: "linear-gradient(135deg, #0F172A 0%, #2563EB 100%)", label: "980 Pro 1TB",
    manufacturer: "Samsung Electronics", manufacturerCode: "samsung",
    specs: [
      { name: "capacity", value: "1TB" }, { name: "interface", value: "PCIe 4.0 NVMe" },
      { name: "read_speed", value: "7000 MB/s" }, { name: "write_speed", value: "5000 MB/s" }
    ],
    offers: [
      { supplierCode: "amazon", price: 99.99, inventory: 1234, externalId: "B08KHG1T13" },
      { supplierCode: "newegg", price: 94.99, inventory: 987, externalId: "N82E16820147830" }
    ]
  },
  {
    keyword: "Kingston Fury DDR5 16GB",
    brand: "Kingston", title: "Kingston Fury DDR5 16GB (2×8GB) 5600MHz",
    mpn: "KF556C40BBE-16", categorySlug: "ram", nicheId: "pc-hardware",
    basePrice: 64.99, gradient: "linear-gradient(135deg, #0F172A 0%, #7C3AED 100%)", label: "Fury DDR5 16GB",
    manufacturer: "Kingston Technology", manufacturerCode: "kingston",
    specs: [
      { name: "capacity", value: "16GB (2×8GB)" }, { name: "type", value: "DDR5" },
      { name: "speed", value: "5600 MHz" }, { name: "cas_latency", value: "CL40" }
    ],
    offers: [
      { supplierCode: "amazon", price: 64.99, inventory: 876, externalId: "B0BGD2QJ5K" },
      { supplierCode: "newegg", price: 59.99, inventory: 654, externalId: "N82E16820142031" }
    ]
  },
  {
    keyword: "Corsair Vengeance DDR5 32GB",
    brand: "Corsair", title: "Corsair Vengeance DDR5 32GB (2×16GB) 6400MHz",
    mpn: "CMK32GX5M2B6400C32", categorySlug: "ram", nicheId: "pc-hardware",
    basePrice: 129.99, gradient: "linear-gradient(135deg, #0F172A 0%, #FFD700 100%)", label: "Vengeance DDR5 32GB",
    manufacturer: "Corsair Gaming", manufacturerCode: "corsair",
    specs: [
      { name: "capacity", value: "32GB (2×16GB)" }, { name: "type", value: "DDR5" },
      { name: "speed", value: "6400 MHz" }, { name: "cas_latency", value: "CL32" }
    ],
    offers: [
      { supplierCode: "amazon", price: 129.99, inventory: 432, externalId: "B0BH4CWCDW" },
      { supplierCode: "newegg", price: 124.99, inventory: 321, externalId: "N82E16820142040" }
    ]
  },
  {
    keyword: "ASUS ROG Strix Z790-A",
    brand: "ASUS", title: "ASUS ROG Strix Z790-A Gaming WiFi",
    mpn: "90MB1GQ0-M0AAY1", categorySlug: "motherboard", nicheId: "pc-hardware",
    basePrice: 399.99, gradient: "linear-gradient(135deg, #0F172A 0%, #DC2626 100%)", label: "ROG Strix Z790-A",
    manufacturer: "ASUSTeK Computer", manufacturerCode: "asus",
    specs: [
      { name: "socket", value: "LGA1700" }, { name: "chipset", value: "Intel Z790" },
      { name: "memory", value: "DDR5" }, { name: "form_factor", value: "ATX" }
    ],
    offers: [
      { supplierCode: "amazon", price: 399.99, inventory: 89, externalId: "B0BGHD2QJ5" },
      { supplierCode: "newegg", price: 389.99, inventory: 67, externalId: "N82E16813119160" }
    ]
  },
  {
    keyword: "MSI MAG B650 Tomahawk",
    brand: "MSI", title: "MSI MAG B650 Tomahawk WiFi Motherboard",
    mpn: "7E37-001R", categorySlug: "motherboard", nicheId: "pc-hardware",
    basePrice: 229.99, gradient: "linear-gradient(135deg, #0F172A 0%, #FF6B00 100%)", label: "B650 Tomahawk",
    manufacturer: "Micro-Star International", manufacturerCode: "msi",
    specs: [
      { name: "socket", value: "AM5" }, { name: "chipset", value: "AMD B650" },
      { name: "memory", value: "DDR5" }, { name: "form_factor", value: "ATX" }
    ],
    offers: [
      { supplierCode: "amazon", price: 229.99, inventory: 145, externalId: "B0BGD2QJ5M" },
      { supplierCode: "newegg", price: 219.99, inventory: 98, externalId: "N82E16813144430" }
    ]
  },
  {
    keyword: "Corsair RM850e 850W",
    brand: "Corsair", title: "Corsair RM850e 850W 80+ Gold Modular PSU",
    mpn: "CP-9020263-NA", categorySlug: "psu", nicheId: "pc-hardware",
    basePrice: 139.99, gradient: "linear-gradient(135deg, #0F172A 0%, #FFD700 100%)", label: "RM850e 850W",
    manufacturer: "Corsair Gaming", manufacturerCode: "corsair",
    specs: [
      { name: "wattage", value: "850W" }, { name: "efficiency", value: "80+ Gold" },
      { name: "modular", value: "Full Modular" }
    ],
    offers: [
      { supplierCode: "amazon", price: 139.99, inventory: 234, externalId: "B0BGD2QJ5P" },
      { supplierCode: "newegg", price: 129.99, inventory: 178, externalId: "N82E16817139330" }
    ]
  },
  {
    keyword: "Segotep 650W 80+ Bronze",
    brand: "Segotep", title: "Segotep GP600G 650W 80+ Bronze PSU",
    mpn: "GP600G", categorySlug: "psu", nicheId: "pc-hardware",
    basePrice: 49.99, gradient: "linear-gradient(135deg, #0F172A 0%, #CA8A04 100%)", label: "Segotep 650W",
    manufacturer: "Segotep", manufacturerCode: "segotep",
    specs: [
      { name: "wattage", value: "650W" }, { name: "efficiency", value: "80+ Bronze" },
      { name: "modular", value: "Non-Modular" }
    ],
    offers: [
      { supplierCode: "aliexpress", price: 42.99, inventory: 534, externalId: "aliexpress-segotep-650" },
      { supplierCode: "amazon", price: 49.99, inventory: 89, externalId: "B0SEGOTEP650" }
    ]
  },
  {
    keyword: "Jonsbo D31 Mesh Black",
    brand: "Jonsbo", title: "Jonsbo D31 Mesh ARGB Case (Black)",
    mpn: "D31-MESH-BLACK", categorySlug: "case", nicheId: "pc-hardware",
    basePrice: 89.99, gradient: "linear-gradient(135deg, #0F172A 0%, #EC4899 100%)", label: "Jonsbo D31 Black",
    manufacturer: "Jonsbo", manufacturerCode: "jonsbo",
    specs: [
      { name: "form_factor", value: "ATX / M-ATX / ITX" },
      { name: "material", value: "Vidro temperado + malha" },
      { name: "color", value: "Black" }
    ],
    offers: [
      { supplierCode: "aliexpress", price: 79.99, inventory: 178, externalId: "aliexpress-jonsbo-d31-black" },
      { supplierCode: "amazon", price: 89.99, inventory: 42, externalId: "B0JONSBO31B" }
    ]
  },
  {
    keyword: "DeepCool AK400",
    brand: "DeepCool", title: "DeepCool AK400 CPU Air Cooler",
    mpn: "AK400", categorySlug: "case", nicheId: "pc-hardware",
    basePrice: 34.99, gradient: "linear-gradient(135deg, #0F172A 0%, #2563EB 100%)", label: "DeepCool AK400",
    manufacturer: "DeepCool", manufacturerCode: "deepcool",
    specs: [
      { name: "type", value: "Air" }, { name: "tdp", value: "220W" },
      { name: "fan_size", value: "120mm" }
    ],
    offers: [
      { supplierCode: "aliexpress", price: 29.99, inventory: 678, externalId: "aliexpress-deepcool-ak400" },
      { supplierCode: "amazon", price: 34.99, inventory: 234, externalId: "B0DEEPCOL400" }
    ]
  },
  {
    keyword: "ESP32-S3-WROOM",
    brand: "Espressif", title: "ESP32-S3-WROOM-1 WiFi + BLE Module",
    mpn: "ESP32-S3-WROOM-1-N16R8", categorySlug: "mcu", nicheId: "electronic-components",
    basePrice: 4.50, gradient: "linear-gradient(135deg, #0F172A 0%, #6366F1 100%)", label: "ESP32-S3",
    manufacturer: "Espressif Systems", manufacturerCode: "espressif",
    specs: [
      { name: "core", value: "Xtensa LX7 dual-core" },
      { name: "wifi", value: "2.4GHz 802.11 b/g/n" },
      { name: "bluetooth", value: "BLE 5.0" },
      { name: "flash", value: "16MB" }
    ],
    offers: [
      { supplierCode: "digikey", price: 4.50, inventory: 89000, externalId: "ESP32-S3-WROOM-1-ND" },
      { supplierCode: "amazon", price: 6.99, inventory: 345, externalId: "B0BLEESP32S3" }
    ]
  },
  {
    keyword: "Bosch BME680 Sensor",
    brand: "Bosch", title: "Bosch BME680 Air Quality Sensor Breakout",
    mpn: "BME680", categorySlug: "sensor", nicheId: "electronic-components",
    basePrice: 14.95, gradient: "linear-gradient(135deg, #0F172A 0%, #059669 100%)", label: "BME680",
    manufacturer: "Bosch Sensortec", manufacturerCode: "bosch",
    specs: [
      { name: "measures", value: "Temp + Humidity + Pressure + VOC" },
      { name: "interface", value: "I²C / SPI" },
      { name: "voltage", value: "3.3V" }
    ],
    offers: [
      { supplierCode: "digikey", price: 14.95, inventory: 21000, externalId: "828-1065-ND" },
      { supplierCode: "amazon", price: 18.99, inventory: 234, externalId: "B0BME680BRK" }
    ]
  },
  {
    keyword: "AirPods Pro USB-C",
    brand: "Apple", title: "AirPods Pro (2nd Gen) USB-C",
    mpn: "MTJV3AM/A", categorySlug: "audio", nicheId: "consumer-electronics",
    basePrice: 199.00, gradient: "linear-gradient(135deg, #0F172A 0%, #9CA3AF 100%)", label: "AirPods Pro 2 USB-C",
    manufacturer: "Apple Inc.", manufacturerCode: "apple",
    specs: [
      { name: "anc", value: "Active Noise Cancellation" },
      { name: "audio", value: "Spatial Audio" },
      { name: "charging", value: "USB-C" }
    ],
    offers: [
      { supplierCode: "amazon", price: 199.00, inventory: 3421, externalId: "B0CHWRXH8C" },
      { supplierCode: "ebay", price: 179.00, inventory: 2000, externalId: "ebay-airpodspro2-usbc" }
    ]
  },
  {
    keyword: "Samsung Galaxy S24",
    brand: "Samsung", title: "Samsung Galaxy S24 256GB",
    mpn: "SM-S921B", categorySlug: "smartphone", nicheId: "consumer-electronics",
    basePrice: 799.99, gradient: "linear-gradient(135deg, #0F172A 0%, #4F46E5 100%)", label: "Galaxy S24",
    manufacturer: "Samsung Electronics", manufacturerCode: "samsung",
    specs: [
      { name: "chip", value: "Exynos 2400" },
      { name: "display", value: "6.2\" AMOLED" },
      { name: "storage", value: "256GB" }
    ],
    offers: [
      { supplierCode: "amazon", price: 799.99, inventory: 678, externalId: "B0CMDRCZBJ" },
      { supplierCode: "ebay", price: 749.99, inventory: 345, externalId: "ebay-galaxy-s24" }
    ]
  },
  {
    keyword: "Minisforum UM780 XTX",
    brand: "Minisforum", title: "Minisforum UM780 XTX Mini PC",
    mpn: "UM780-XTX", categorySlug: "monitor", nicheId: "pc-hardware",
    basePrice: 549.00, gradient: "linear-gradient(135deg, #0F172A 0%, #4F46E5 100%)", label: "UM780 XTX",
    manufacturer: "Minisforum", manufacturerCode: "minisforum",
    specs: [
      { name: "cpu", value: "AMD Ryzen 7 7840HS" },
      { name: "ram", value: "32GB DDR5" },
      { name: "storage", value: "1TB SSD" }
    ],
    offers: [
      { supplierCode: "aliexpress", price: 529.00, inventory: 234, externalId: "aliexpress-minisforum-um780" },
      { supplierCode: "amazon", price: 549.00, inventory: 78, externalId: "B0MINIS780" }
    ]
  },
  {
    keyword: "KingSpec 1TB NVMe",
    brand: "KingSpec", title: "KingSpec 1TB NVMe PCIe 3.0 SSD",
    mpn: "KINGSPEC-1TB-NVME", categorySlug: "ssd", nicheId: "pc-hardware",
    basePrice: 39.99, gradient: "linear-gradient(135deg, #0F172A 0%, #6D28D9 100%)", label: "KingSpec 1TB",
    manufacturer: "KingSpec", manufacturerCode: "kingspec",
    specs: [
      { name: "capacity", value: "1TB" },
      { name: "interface", value: "PCIe 3.0 NVMe" },
      { name: "read_speed", value: "2000 MB/s" }
    ],
    offers: [
      { supplierCode: "aliexpress", price: 35.99, inventory: 1890, externalId: "aliexpress-kingspec-1tb" },
      { supplierCode: "amazon", price: 39.99, inventory: 423, externalId: "B0KSPEC1TB" }
    ]
  },
  {
    keyword: "Maxsun B660M Challenger",
    brand: "Maxsun", title: "Maxsun MS-终结者 B660M Challenger Motherboard",
    mpn: "MS-终结者-B660M", categorySlug: "motherboard", nicheId: "pc-hardware",
    basePrice: 79.99, gradient: "linear-gradient(135deg, #0F172A 0%, #7C3AED 100%)", label: "Maxsun B660M",
    manufacturer: "Maxsun", manufacturerCode: "maxsun",
    specs: [
      { name: "socket", value: "LGA1700" }, { name: "chipset", value: "Intel B660" },
      { name: "memory", value: "DDR4" }, { name: "form_factor", value: "Micro-ATX" }
    ],
    offers: [
      { supplierCode: "aliexpress", price: 69.99, inventory: 345, externalId: "aliexpress-maxsun-b660m" },
      { supplierCode: "amazon", price: 79.99, inventory: 56, externalId: "B0MAXSUN660" }
    ]
  },
  {
    keyword: "Apple Watch SE 2nd Gen",
    brand: "Apple", title: "Apple Watch SE (2nd Generation) 40mm",
    mpn: "MPHY3LL/A", categorySlug: "wearable", nicheId: "consumer-electronics",
    basePrice: 249.00, gradient: "linear-gradient(135deg, #0F172A 0%, #EC4899 100%)", label: "Watch SE 2",
    manufacturer: "Apple Inc.", manufacturerCode: "apple",
    specs: [
      { name: "size", value: "40mm" },
      { name: "display", value: "Retina LTPO OLED" },
      { name: "connectivity", value: "GPS" }
    ],
    offers: [
      { supplierCode: "amazon", price: 249.00, inventory: 1234, externalId: "B0BDF9SE2" },
      { supplierCode: "ebay", price: 219.00, inventory: 567, externalId: "ebay-watch-se2" }
    ]
  },
  // ── Sprint 8: NVIDIA GPUs ──────────────────────────────
  {
    keyword: "NVIDIA RTX 4080 Super",
    brand: "NVIDIA", title: "NVIDIA GeForce RTX 4080 Super 16GB",
    mpn: "900-1G136-0240-000", categorySlug: "gpu", nicheId: "pc-hardware",
    basePrice: 999.99, gradient: "linear-gradient(135deg, #0F172A 0%, #16A34A 100%)", label: "RTX 4080 Super",
    manufacturer: "NVIDIA Corporation", manufacturerCode: "nvidia",
    specs: [
      { name: "memory", value: "16GB GDDR6X" },
      { name: "cuda_cores", value: "10240" },
      { name: "tdp", value: "320W" },
      { name: "pcie_version", value: "PCIe 4.0" },
      { name: "memory_type", value: "GDDR6X" },
      { name: "memory_bus", value: "256-bit" }
    ],
    offers: [
      { supplierCode: "amazon", price: 999.99, inventory: 234, externalId: "B0NJCJ7T2X" },
      { supplierCode: "newegg", price: 989.99, inventory: 178, externalId: "N82E16814137662" }
    ]
  },
  {
    keyword: "NVIDIA RTX 4070 Ti",
    brand: "NVIDIA", title: "NVIDIA GeForce RTX 4070 Ti 12GB",
    mpn: "900-1G136-0255-000", categorySlug: "gpu", nicheId: "pc-hardware",
    basePrice: 799.99, gradient: "linear-gradient(135deg, #0F172A 0%, #16A34A 100%)", label: "RTX 4070 Ti",
    manufacturer: "NVIDIA Corporation", manufacturerCode: "nvidia",
    specs: [
      { name: "memory", value: "12GB GDDR6X" },
      { name: "cuda_cores", value: "7680" },
      { name: "tdp", value: "285W" },
      { name: "pcie_version", value: "PCIe 4.0" },
      { name: "memory_type", value: "GDDR6X" },
      { name: "memory_bus", value: "192-bit" }
    ],
    offers: [
      { supplierCode: "amazon", price: 799.99, inventory: 312, externalId: "B0BDF9KCQ2" },
      { supplierCode: "newegg", price: 789.99, inventory: 245, externalId: "N82E16814137658" }
    ]
  },
  // ── Sprint 8: ASUS Motherboards ────────────────────────
  {
    keyword: "ASUS TUF Gaming B650-Plus",
    brand: "ASUS", title: "ASUS TUF Gaming B650-Plus WiFi Motherboard",
    mpn: "90MB1FA0-M0AAY1", categorySlug: "motherboard", nicheId: "pc-hardware",
    basePrice: 199.99, gradient: "linear-gradient(135deg, #0F172A 0%, #DC2626 100%)", label: "TUF B650-Plus",
    manufacturer: "ASUSTeK Computer", manufacturerCode: "asus",
    specs: [
      { name: "socket", value: "AM5" },
      { name: "chipset", value: "AMD B650" },
      { name: "memory", value: "DDR5" },
      { name: "memory_slots", value: "4" },
      { name: "form_factor", value: "ATX" },
      { name: "wifi", value: "WiFi 6" }
    ],
    offers: [
      { supplierCode: "amazon", price: 199.99, inventory: 234, externalId: "B0BGHD2QJ6" },
      { supplierCode: "newegg", price: 189.99, inventory: 167, externalId: "N82E16813119680" }
    ]
  },
  {
    keyword: "ASUS Prime Z790-P",
    brand: "ASUS", title: "ASUS Prime Z790-P WiFi Motherboard",
    mpn: "90MB1FQ0-M0AAY1", categorySlug: "motherboard", nicheId: "pc-hardware",
    basePrice: 259.99, gradient: "linear-gradient(135deg, #0F172A 0%, #DC2626 100%)", label: "Prime Z790-P",
    manufacturer: "ASUSTeK Computer", manufacturerCode: "asus",
    specs: [
      { name: "socket", value: "LGA1700" },
      { name: "chipset", value: "Intel Z790" },
      { name: "memory", value: "DDR5" },
      { name: "memory_slots", value: "4" },
      { name: "form_factor", value: "ATX" },
      { name: "wifi", value: "WiFi 6E" }
    ],
    offers: [
      { supplierCode: "amazon", price: 259.99, inventory: 178, externalId: "B0BGHD2QJ8" },
      { supplierCode: "newegg", price: 249.99, inventory: 134, externalId: "N82E16813119685" }
    ]
  },
  // ── Sprint 8: Samsung SSDs ─────────────────────────────
  {
    keyword: "Samsung 990 Pro 4TB",
    brand: "Samsung", title: "Samsung 990 Pro 4TB NVMe SSD",
    mpn: "MZ-V9P4T0BW", categorySlug: "ssd", nicheId: "pc-hardware",
    basePrice: 299.99, gradient: "linear-gradient(135deg, #0F172A 0%, #2563EB 100%)", label: "990 Pro 4TB",
    manufacturer: "Samsung Electronics", manufacturerCode: "samsung",
    specs: [
      { name: "capacity", value: "4TB" },
      { name: "interface", value: "PCIe 4.0 NVMe" },
      { name: "read_speed", value: "7450 MB/s" },
      { name: "write_speed", value: "6900 MB/s" },
      { name: "form_factor", value: "M.2 2280" },
      { name: "endurance", value: "600 TBW" }
    ],
    offers: [
      { supplierCode: "amazon", price: 299.99, inventory: 423, externalId: "B0BHJJJJV4" },
      { supplierCode: "newegg", price: 289.99, inventory: 312, externalId: "N82E16820147836" }
    ]
  },
  {
    keyword: "Samsung 870 EVO 2TB",
    brand: "Samsung", title: "Samsung 870 EVO 2TB SATA SSD",
    mpn: "MZ-77E2T0BW", categorySlug: "ssd", nicheId: "pc-hardware",
    basePrice: 149.99, gradient: "linear-gradient(135deg, #0F172A 0%, #2563EB 100%)", label: "870 EVO 2TB",
    manufacturer: "Samsung Electronics", manufacturerCode: "samsung",
    specs: [
      { name: "capacity", value: "2TB" },
      { name: "interface", value: "SATA III" },
      { name: "read_speed", value: "560 MB/s" },
      { name: "write_speed", value: "530 MB/s" },
      { name: "form_factor", value: "2.5\"" },
      { name: "endurance", value: "1200 TBW" }
    ],
    offers: [
      { supplierCode: "amazon", price: 149.99, inventory: 678, externalId: "B08QMBL8XC" },
      { supplierCode: "newegg", price: 139.99, inventory: 534, externalId: "N82E16820147832" }
    ]
  }
];

// ── Evidence generator ─────────────────────────────────────

interface EvidenceRecord {
  sourceType: string;
  sourceName: string;
  confidence: number;
  extractedValue: string;
  normalizedValue: string;
  url: string;
  retrievedAt: string;
}

function generateEvidence(
  signal: PipelineSignal,
  specName: string,
  specValue: string
): { source: string; sourceName: string; confidence: number; evidence: EvidenceRecord[] } {
  const evidence: EvidenceRecord[] = [];

  // Evidence 1: Manufacturer (highest authority)
  const mfrUrl = signal.manufacturerCode === "intel"
    ? `https://ark.intel.com/${signal.mpn.toLowerCase()}`
    : signal.manufacturerCode === "amd"
    ? `https://api.amd.com/product-master/v1/products/${signal.mpn}`
    : `https://www.${signal.manufacturerCode}.com/product/${signal.mpn.toLowerCase()}`;

  evidence.push({
    sourceType: "manufacturer",
    sourceName: signal.brand,
    confidence: 1.0,
    extractedValue: specValue,
    normalizedValue: specValue,
    url: mfrUrl,
    retrievedAt: new Date().toISOString()
  });

  // Evidence 2: Datasheet (if available)
  if (signal.manufacturerCode === "intel" || signal.manufacturerCode === "amd") {
    evidence.push({
      sourceType: "datasheet",
      sourceName: `${signal.brand} Datasheet PDF`,
      confidence: 0.99,
      extractedValue: specValue,
      normalizedValue: specValue,
      url: mfrUrl.replace("/product", "/datasheet") + ".pdf",
      retrievedAt: new Date().toISOString()
    });
  }

  // Evidence 3: Marketplace (lower authority)
  if (signal.offers.length > 0) {
    const offer = signal.offers[0]!;
    evidence.push({
      sourceType: "marketplace",
      sourceName: offer.supplierCode.charAt(0).toUpperCase() + offer.supplierCode.slice(1),
      confidence: 0.72,
      extractedValue: specValue,
      normalizedValue: specValue,
      url: `https://www.${offer.supplierCode}.com/product/${offer.externalId}`,
      retrievedAt: new Date().toISOString()
    });
  }

  return {
    source: "manufacturer",
    sourceName: signal.brand,
    confidence: evidence[0]!.confidence,
    evidence
  };
}

// ── Helpers ────────────────────────────────────────────────

function toMinorUnits(usd: number): bigint {
  return BigInt(Math.round(usd * 100));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Pipeline stages (simulated) ────────────────────────────

function stage1_createSignal(signal: PipelineSignal): { traceId: string; signal: PipelineSignal } {
  const traceId = `trace_pipeline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  console.log(`  [Stage 1] DiscoverySignal: "${signal.keyword}" → traceId: ${traceId}`);
  return { traceId, signal };
}

function stage2_createJob(traceId: string, signal: PipelineSignal) {
  console.log(`  [Stage 2] DiscoveryJob created for "${signal.keyword}"`);
  return { traceId, job: { keyword: signal.keyword, region: "US", limit: 10 } };
}

function stage3_simulateFetch(traceId: string, signal: PipelineSignal) {
  console.log(`  [Stage 3] Worker fetched raw data for "${signal.keyword}" (simulated)`);
  return { traceId, rawProduct: signal };
}

function stage4_normalize(traceId: string, signal: PipelineSignal) {
  const normalized = {
    title: signal.title,
    brand: signal.brand,
    mpn: signal.mpn,
    categorySlug: signal.categorySlug,
    nicheId: signal.nicheId,
    basePrice: signal.basePrice,
    specs: signal.specs,
    offers: signal.offers
  };
  console.log(`  [Stage 4] Normalized: brand=${normalized.brand}, mpn=${normalized.mpn}`);
  return { traceId, normalized };
}

function stage5_cluster(traceId: string, normalized: any) {
  // Each product is its own cluster (no duplicates in fixture)
  const cluster = { id: `cluster_${normalized.mpn}`, memberIds: [normalized.mpn] };
  console.log(`  [Stage 5] SimilarityCluster: 1 member (no duplicates)`);
  return { traceId, normalized, cluster };
}

function stage6_resolve(traceId: string, normalized: any) {
  const canonical = {
    ...normalized,
    canonicalId: `canon_${normalized.mpn}`,
    slug: slugify(normalized.title)
  };
  console.log(`  [Stage 6] CanonicalProduct: ${canonical.title}`);
  return { traceId, canonical };
}

function stage7b_enrich(traceId: string, canonical: any, signal: PipelineSignal) {
  const enriched = {
    ...canonical,
    manufacturer: signal.manufacturer,
    manufacturerCode: signal.manufacturerCode,
    enrichedSpecs: signal.specs.map(spec => {
      const ontologyDef = resolveAttribute(spec.name);
      return {
        ...spec,
        canonicalName: ontologyDef?.id ?? spec.name,
        displayName: ontologyDef?.displayName ?? spec.name
      };
    })
  };
  console.log(`  [Stage 7b] Enriched by ${signal.manufacturerCode}: ${enriched.enrichedSpecs.length} specs with evidence`);
  return { traceId, enriched };
}

function stage8_evaluate(traceId: string, enriched: any) {
  const evaluated = {
    ...enriched,
    aiScore: { overall: 85 + Math.floor(Math.random() * 15) },
    aiRecommendation: "publish"
  };
  console.log(`  [Stage 8] AI Evaluation: score=${evaluated.aiScore.overall}, recommendation=${evaluated.aiRecommendation}`);
  return { traceId, evaluated };
}

function stage9_compliance(traceId: string, evaluated: any) {
  const compliant = { ...evaluated, complianceStatus: "eligible" };
  console.log(`  [Stage 9] Compliance: ${compliant.complianceStatus}`);
  return { traceId, compliant };
}

// ── Stage 10: Materialize to database ──────────────────────

async function stage10_materialize(traceId: string, compliant: any, signal: PipelineSignal) {
  const slug = compliant.slug;
  const sku = `SF-PIPE-${signal.mpn.replace(/[^A-Z0-9]/gi, "-").toUpperCase()}`;

  // Find category
  const category = await prisma.category.findFirst({
    where: { storeId: STORE_ID, slug: signal.categorySlug }
  });

  if (!category) {
    console.log(`  [Stage 10] ⚠️  Category "${signal.categorySlug}" not found, skipping`);
    return;
  }

  // Upsert Product
  const product = await prisma.product.upsert({
    where: { sku },
    update: {
      slug,
      title: signal.title,
      description: `${signal.title}. MPN: ${signal.mpn}. Manufacturer: ${signal.manufacturer}. Trace: ${traceId}`,
      status: "published",
      basePriceMinorUnits: toMinorUnits(signal.basePrice),
      basePriceCurrencyCode: "USD",
      categoryId: category.id,
      createdBy: "pipeline"
    },
    create: {
      storeId: STORE_ID,
      sku,
      slug,
      title: signal.title,
      description: `${signal.title}. MPN: ${signal.mpn}. Manufacturer: ${signal.manufacturer}. Trace: ${traceId}`,
      status: "published",
      basePriceMinorUnits: toMinorUnits(signal.basePrice),
      basePriceCurrencyCode: "USD",
      categoryId: category.id,
      createdBy: "pipeline"
    }
  });

  // Upsert Variant
  const variant = await prisma.variant.upsert({
    where: { sku: `${sku}-V1` },
    update: {
      productId: product.id,
      priceMinorUnits: toMinorUnits(signal.basePrice),
      priceCurrencyCode: "USD",
      isActive: true
    },
    create: {
      productId: product.id,
      sku: `${sku}-V1`,
      priceMinorUnits: toMinorUnits(signal.basePrice),
      priceCurrencyCode: "USD",
      isActive: true,
      createdBy: "pipeline"
    }
  });

  // Delete old media/attributes/offers/inventory (for clean re-run)
  await prisma.productMedia.deleteMany({ where: { productId: product.id } });
  await prisma.productAttribute.deleteMany({ where: { productId: product.id } });
  await prisma.productOffer.deleteMany({ where: { productId: product.id } });
  await prisma.inventory.deleteMany({ where: { variantId: variant.id } });

  // Create ProductMedia
  await prisma.productMedia.create({
    data: {
      productId: product.id,
      url: `data:gradient;${signal.gradient}`,
      altText: signal.label,
      position: 0,
      isPrimary: true
    }
  });

  // Create ProductAttributes WITH evidence
  for (const spec of signal.specs) {
    const evidenceData = generateEvidence(signal, spec.name, spec.value);
    const ontologyDef = resolveAttribute(spec.name);
    const canonicalName = ontologyDef?.id ?? spec.name;

    await prisma.productAttribute.create({
      data: {
        productId: product.id,
        name: canonicalName,         // canonical ontology ID (e.g., "cpu.socket")
        value: spec.value,
        source: evidenceData.source,  // "manufacturer"
        sourceName: evidenceData.sourceName,  // "Intel"
        confidence: evidenceData.confidence,  // 1.0
        evidence: JSON.stringify(evidenceData.evidence)  // JSON array of evidence
      }
    });
  }

  // Create ProductOffers
  for (const offer of signal.offers) {
    const supplier = await prisma.supplier.findUnique({ where: { code: offer.supplierCode } });
    if (!supplier) {
      console.log(`  [Stage 10] ⚠️  Supplier "${offer.supplierCode}" not found, skipping offer`);
      continue;
    }

    await prisma.productOffer.upsert({
      where: {
        externalProvider_externalId: {
          externalProvider: offer.supplierCode,
          externalId: `pipeline_${offer.externalId}`
        }
      },
      update: {
        productId: product.id,
        variantId: variant.id,
        priceMinorUnits: toMinorUnits(offer.price),
        priceCurrencyCode: "USD",
        inventory: offer.inventory,
        fulfillmentDaysMin: 1,
        fulfillmentDaysMax: offer.supplierCode === "aliexpress" ? 30 : 5,
        shipsFromCountry: supplier.shipsFromCountry,
        isActive: true,
        lastSyncedAt: new Date()
      },
      create: {
        supplierId: supplier.id,
        productId: product.id,
        variantId: variant.id,
        supplierSku: `${sku}-${offer.supplierCode}`,
        externalProvider: offer.supplierCode,
        externalId: `pipeline_${offer.externalId}`,
        priceMinorUnits: toMinorUnits(offer.price),
        priceCurrencyCode: "USD",
        inventory: offer.inventory,
        fulfillmentDaysMin: 1,
        fulfillmentDaysMax: offer.supplierCode === "aliexpress" ? 30 : 5,
        shipsFromCountry: supplier.shipsFromCountry,
        isActive: true,
        lastSyncedAt: new Date(),
        createdBy: "pipeline"
      }
    });

    // Create Inventory
    await prisma.inventory.create({
      data: {
        variantId: variant.id,
        available: offer.inventory,
        reserved: 0,
        committed: 0,
        createdBy: "pipeline"
      }
    });
  }

  console.log(`  [Stage 10] ✓ Materialized: ${product.title} (sku=${sku}, ${signal.specs.length} attrs with evidence, ${signal.offers.length} offers)`);
  return product;
}

// ── Main pipeline runner ───────────────────────────────────

async function main() {
  console.log("🚀 ShopFinder Pipeline Runner — Sprint 1\n");
  console.log(`  Signals: ${SIGNALS.length}`);
  console.log(`  Store ID: ${STORE_ID}\n`);

  let success = 0;
  let skipped = 0;

  for (const signal of SIGNALS) {
    console.log(`\n══════════════════════════════════════════`);
    console.log(`  Processing: ${signal.keyword}`);
    console.log(`══════════════════════════════════════════`);

    try {
      // Stage 1: DiscoverySignal
      const s1 = stage1_createSignal(signal);

      // Stage 2: DiscoveryJob
      const s2 = stage2_createJob(s1.traceId, s1.signal);

      // Stage 3: Worker (simulated fetch)
      const s3 = stage3_simulateFetch(s2.traceId, signal);

      // Stage 4: Normalize
      const s4 = stage4_normalize(s3.traceId, signal);

      // Stage 5: Similarity clustering
      const s5 = stage5_cluster(s4.traceId, s4.normalized);

      // Stage 6: Resolution → CanonicalProduct
      const s6 = stage6_resolve(s5.traceId, s5.normalized);

      // Stage 7b: Manufacturer Enrichment
      const s7 = stage7b_enrich(s6.traceId, s6.canonical, signal);

      // Stage 8: AI Evaluation (mock)
      const s8 = stage8_evaluate(s7.traceId, s7.enriched);

      // Stage 9: Compliance (mock — pass all)
      const s9 = stage9_compliance(s8.traceId, s8.evaluated);

      // Stage 10: Materialize to database
      await stage10_materialize(s9.traceId, s9.compliant, signal);

      success++;
    } catch (error) {
      console.error(`  ❌ Failed: ${signal.keyword}`);
      console.error(`     Error: ${error instanceof Error ? error.message : String(error)}`);
      skipped++;
    }
  }

  // Summary
  console.log(`\n══════════════════════════════════════════`);
  console.log(`  Pipeline execution complete!`);
  console.log(`══════════════════════════════════════════`);
  console.log(`  Signals processed: ${SIGNALS.length}`);
  console.log(`  Products materialized: ${success}`);
  console.log(`  Failed: ${skipped}`);

  // Verify
  const totalProducts = await prisma.product.count();
  const totalAttrs = await prisma.productAttribute.count();
  const enrichedAttrs = await prisma.productAttribute.count({
    where: { source: { not: null } }
  });
  const totalOffers = await prisma.productOffer.count();

  console.log(`\n  Database state:`);
  console.log(`    Total products: ${totalProducts}`);
  console.log(`    Total attributes: ${totalAttrs}`);
  console.log(`    Enriched attributes (with source): ${enrichedAttrs}`);
  console.log(`    Total offers: ${totalOffers}`);
  console.log(`══════════════════════════════════════════\n`);
}

main()
  .catch((e) => {
    console.error("Pipeline failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
