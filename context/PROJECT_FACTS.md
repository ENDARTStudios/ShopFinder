# Project Facts — ShopFinder

> Objective facts only. No explanations, no opinions. High-density reference.

## Identity

| Fact | Value |
|---|---|
| Project name | ShopFinder |
| Category | Catalog Intelligence Platform / Product Knowledge Graph |
| Business model | Product discovery, consolidation, enrichment, distribution |
| Slogan | compra inteligente |
| Version | 0.6.0 |
| Copyright | © 2026 END ART |
| License | Proprietary |

## Scale

| Fact | Value |
|---|---|
| Pipeline stages | 15 |
| Manufacturers | 77 (Tier A:14, B:18, C:35, D:10) |
| Connector definitions | 13 |
| Connector instances | 13 (12 healthy, 1 degraded) |
| Ontology attributes | 45 canonical definitions |
| Knowledge graph nodes | 16 types |
| Knowledge graph edges | 16 types |
| Catalog products (seeded) | 22 |
| Catalog offers (seeded) | 67 |
| Categories | 16 |
| Niches | 3 |
| Suppliers | 7 |
| Information sources | 8 |
| Manufacturer versions | 9 |
| Tests | 628+ |
| Architecture violations | 0 |
| AI directives files | 30 |

## Languages

| Fact | Value |
|---|---|
| Primary UI | pt-BR |
| Secondary | en |
| Planned | es, fr, de |

## Supported suppliers (discovery connectors)

| Supplier | Type | Status |
|---|---|---|
| Amazon | Marketplace | ✓ Implemented |
| AliExpress | Marketplace | ✓ Implemented |
| eBay | Marketplace | ✓ Implemented |
| DigiKey | Distributor | ✓ Implemented |
| Newegg | Retailer | ✓ Implemented |

## Supported manufacturers (enrichment connectors)

| Manufacturer | Tier | Country | Connector | Status |
|---|---|---|---|---|
| Intel | A | US | official_api | ✓ Implemented |
| AMD | A | US | official_api | ✓ Implemented |
| NVIDIA | A | US | official_api | Defined (no parser) |
| Samsung | A | KR | official_api | Defined (no parser) |
| ASUS | B | TW | official_api | Defined (no parser) |
| MSI | B | TW | official_api | Defined (no parser) |
| Colorful | C | CN | scraper | Defined (no parser) |
| Huananzhi | C | CN | scraper | Defined (no parser, degraded) |
| DeepCool | C | CN | scraper | Defined (no parser) |
| Jonsbo | C | CN | scraper | Defined (no parser) |
| Minisforum | C | CN | official_api | Defined (no parser) |
| Netac | C | CN | partner (AliExpress) | Defined (no parser) |
| Gloway | C | CN | partner (AliExpress) | Defined (no parser) |

## Countries covered

| Country | Manufacturers |
|---|---|
| China | 47 |
| United States | 15 |
| Taiwan | 12 |
| South Korea | 2 |
| Japan | 1 |

## Segments covered

| Segment | Manufacturers |
|---|---|
| SSD & Storage | 25 |
| Placas de Vídeo (GPU) | 19 |
| Placas-mãe (Motherboard) | 18 |
| Mini PCs | 18 |
| Memória RAM (Memory) | 15 |
| Refrigeração (Cooling) | 10 |
| Periféricos (Peripherals) | 9 |
| Monitores (Displays) | 8 |
| Fontes (Power Supply) | 7 |
| Gabinetes (Case) | 7 |
| Redes (Networking) | 6 |
| Processadores (CPU) | 4 |

## Certifications tracked

CE, FCC, RoHS, UL, ANATEL, INMETRO, UKCA, EnergyStar, CCC

## Top brands per niche

| Niche | Top brands |
|---|---|
| PC Hardware | Intel, AMD, NVIDIA, ASUS, MSI, Gigabyte, Colorful, DeepCool, Jonsbo, Gloway |
| Electronic Components | STMicroelectronics, Texas Instruments, Microchip, NXP, Onsemi |
| Consumer Electronics | Apple, Samsung, Xiaomi, Sony, JBL |

## Key files

| File | Purpose |
|---|---|
| `packages/domain/src/discovery/enrichment/types.ts` | All type contracts + legacy compat |
| `packages/domain/src/discovery/enrichment/registry.ts` | MANUFACTURERS, CONNECTORS, ONTOLOGY, KNOWLEDGE_GRAPH |
| `packages/domain/src/discovery/enrichment/ontology.ts` | 45 AttributeDefinitions |
| `packages/domain/src/discovery/enrichment/knowledge-graph.ts` | KnowledgeNode + KnowledgeEdge |
| `packages/domain/src/discovery/index.ts` | Pipeline barrel exports |
| `packages/database/src/client.ts` | PrismaClient singleton |
| `prisma/schema.prisma` | 38-table database schema |
| `scripts/seed-catalog.ts` | Database seeder |
| `scripts/architecture-test.mjs` | Architecture dependency checker |
| `src/app/api/catalog/route.ts` | Catalog REST API |
| `src/components/site/landing.tsx` | Landing page |
| `src/components/site/products.ts` | Mock product data (legacy) |
| `src/components/site/data.ts` | PROJECT_META |
| `src/components/site/site-footer.tsx` | Global footer |
| `src/app/layout.tsx` | Root layout + metadata |
| `public/icon.svg` | Brand mark (magnifying glass) |
| `public/manifest.webmanifest` | PWA manifest |
