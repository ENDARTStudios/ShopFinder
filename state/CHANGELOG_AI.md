# AI Changelog — ShopFinder

> Evolution history for AI context. Instead of reading hundreds of commits, the AI reads this to understand what changed and why.

## 2026-07-15

### Manufacturer module rewritten (Knowledge Source Management System)

**Old**: Simple `ManufacturerCode` union type + `ManufacturerTier` (A/B/C/D) + `getAuthorityScore()` returning a single number.

**New**: Rich `Manufacturer` entity with:
- `AuthorityByAttribute` (per attribute: specs=100, pricing=5, inventory=0)
- `segmentCoverage` (per segment: CPU=100, SSD=95)
- `CapabilityProfile` (CapabilityLevel: none/partial/good/excellent per capability)
- `ConnectorDefinition` + `ConnectorInstance` (separated from Manufacturer identity)
- `AttributeEvidence` + `ProductAttribute` (Provenance Graph — attributes are conclusions with multiple evidence)
- `AuthorityPolicy` (dynamic resolver, not static number)
- `ConfidenceScore` (5 dimensions: manufacturer, consensus, freshness, parser, ai)
- `DecisionExplanation` (structured audit trail)
- `ManufacturerVersion` (immutable history)
- `InformationSource` (raw provenance metadata)

### Product Knowledge Graph added

**New**: `KnowledgeNode` (14 types) + `KnowledgeEdge` (16 types) with query helpers. The catalog is now a projection of the knowledge graph, not the source of truth.

### Ontology added

**New**: 45 `AttributeDefinition` entries with canonical IDs (`cpu.socket`, `gpu.memory`, `psu.wattage`). `resolveAttribute("Socket")` → `cpu.socket`. Normalizer consults ontology instead of knowing attributes individually.

### Manufacturer tiers expanded to 77

**Old**: 10 manufacturers (Intel, AMD, NVIDIA, ASUS, MSI, Gigabyte, Kingston, Corsair, Samsung, WDC).

**New**: 77 manufacturers across 4 tiers:
- Tier A (14): + Qualcomm, SK hynix, Micron, Crucial, Seagate, Kioxia, Solidigm
- Tier B (18): + ASRock, Biostar, Acer, Dell, HP, Lenovo, Intel NUC, Zotac, Palit, Gainward, PNY, Sapphire, PowerColor, XFX, Inno3D
- Tier C (35): Chinese manufacturers — Colorful, Maxsun, Huananzhi, Machinist, SOYO, JGINYUE, ONDA, Yeston, Erying, Peladn, Netac, Asgard, KingSpec, KingDian, Gloway, Biwin, Fanxiang, Goldenfir, Walram, Lexar China, Segotep, Huntkey, Great Wall, Gamemax, Jonsbo, PCCooler, ID-COOLING, DeepCool, Thermalright, Snowman, Topton, CWWK, Minisforum, Beelink, GMKtec
- Tier D (10): Kllisre, Atermiter, SZCPU, MLLSE, Reletech, XrayDisk, ELSA China, Puskill, Teclast, Alseye

Each manufacturer has: country, authorityScore, coverageScore, segmentCoverage, authority, capabilities, aliases (multilingual), brands, status, officialWebsite, certifications.

### Legacy enrichment files removed

**Removed**: `coordinator.ts`, `policies.ts`, `events.ts`, `repository.ts`, `enrichment.test.ts` (referenced old types). Legacy compat aliases added to `types.ts` for `packages/infrastructure/` connectors.

## 2026-07-14

### ShopFinder branding applied

**Old**: "Dropshipping Platform" (package.json name, docker-compose, schema.prisma, infrastructure barrel, benchmark report).

**New**: "ShopFinder" — slogan "compra inteligente" (lowercase). Copyright © 2026 END ART. Footer: "ShopFinder - compra inteligente - V0.6.0" (left) + "Copyright © 2026 END ART" (right).

### Landing page redesigned (product-first, not docs-first)

**Old**: 10-tab dashboard (Persistence, Design System, Domain, Backlog, Modules, Packages, ADRs, Stack, Principles, +Extras).

**New**: Product discovery experience:
1. Hero with search bar (protagonist)
2. Niches (3: PC Hardware, Componentes Eletrônicos, Eletrônicos de Consumo)
3. Categories (16, filterable by niche)
4. Manufacturers (77, with tiers, authority/coverage scores, countries, segments)
5. Products (22, filterable by niche, with offers per supplier)
6. Trust section (15 stages, 7 connectors, 628 tests — at the bottom)

### Real backend connected

**Old**: Mock data hardcoded in `products.ts`. Search did nothing. Filters filtered arrays in memory.

**New**: 
- `scripts/seed-catalog.ts` populates SQLite with 22 products, 67 offers, 16 categories, 7 suppliers
- `src/app/api/catalog/route.ts` — REST API querying the real database
- Landing page `fetch()`es from API. Search queries the backend. Filters re-execute fetch.
- Each product card shows offers from multiple suppliers with real prices and stock

### Logo redesigned

**Old**: 'Z' from previous project (Dropshipping Platform).

**Evolution**: Z → SF monogram with gradient → SF + magnifying glass → SF with 3-level transformation → continuous gradient + lens at S-F intersection → **magnifying glass** (final: simple, universal, recognizable at 16×16).

## 2026-07-13

### AMD connector added

Second `ConnectorKind.Manufacturer` connector. Validates `common/` SDK with AMD's category-grouped spec format (different from Intel's flat list).

### Manufacturer Enrichment stage (A2.7b) created

New pipeline stage between Resolution (A2.7) and AI Evaluation (A2.8):
- `ManufacturerSource` artifact
- `EnrichmentPolicy` (3 implementations: ManufacturerWins, MergeByConfidence, HighestReliability)
- `EnrichmentCoordinator` (routes by brand → connector → fetch → policy → merge)
- `EnrichedCanonicalProduct` (CanonicalProduct + enrichment fields)

### Intel connector added

First `ConnectorKind.Manufacturer` connector. Validates `BaseManufacturerConnector` SDK with Intel Ark API format (flat spec list).
