# Glossary — ShopFinder

> Domain vocabulary. Use these terms precisely. Never confuse them.

## Product lifecycle

| Term | Definition |
|---|---|
| **Offer** | A single product listing from a single supplier (Amazon, Newegg, etc.). The rawest form of product data. Multiple offers can refer to the same physical product. |
| **Normalized Offer** | An offer after 7 normalization stages (title, brand, category, attributes, images, price, semantic hash). Structured and deduplicated by fingerprint. |
| **Canonical Product** | A consolidated product built from multiple normalized offers that represent the same physical item. Has priceRange (min/max across offers). |
| **Enriched Canonical Product** | A Canonical Product augmented with official manufacturer data (specs, datasheets, lifecycle, certifications, warranty). |
| **Catalog Product** | An Enriched Canonical Product that has passed AI Evaluation + Compliance and been materialized into the catalog (has SKU, slug, SEO). |
| **Published Product** | A Catalog Product that has been published to one or more destinations (store, marketplace, ERP). |

## Identifiers

| Term | Definition |
|---|---|
| **SKU** | Stock Keeping Unit. Internal catalog identifier assigned by the Catalog Materializer. |
| **MPN** | Manufacturer Part Number. The canonical part number assigned by the manufacturer (e.g., "BX8071514900K"). |
| **EAN** | European Article Number (13-digit barcode). |
| **UPC** | Universal Product Code (12-digit, North America). |
| **GTIN** | Global Trade Item Number (umbrella for EAN/UPC). |
| **OPN** | Ordering Part Number (AMD's term for MPN, e.g., "100-100000514WOF"). |

## Sources

| Term | Definition |
|---|---|
| **Manufacturer** | The entity that makes the product. Authority 100 for specs. NOT authority for pricing/inventory. |
| **Distributor** | Specialized wholesaler (e.g., DigiKey). Authority 90. Good for technical attributes and stock. |
| **Retailer** | Retail seller (e.g., Newegg). Authority 80. Good for price and stock. |
| **Marketplace** | Open marketplace (e.g., Amazon, eBay, AliExpress). Authority 70. Wide coverage, noisy data. |
| **Supplier** | Generic term for any source of offers. |

## Authority & Confidence

| Term | Definition |
|---|---|
| **AuthorityScore** | 0-100. How trustworthy a source is for a given attribute. Manufacturer=100 for specs, 5 for pricing. |
| **CoverageScore** | 0-100. How complete the manufacturer's data is. Varies per segment. |
| **AuthorityPolicy** | Dynamic resolver that computes authority based on source type, confidence, freshness, and connector quality. Not a static number. |
| **ConfidenceScore** | Multi-dimensional: overall, manufacturer, consensus, freshness, parser, ai. Each 0-100. Overall is auto-computed. |
| **Consensus** | Agreement across multiple evidence sources. Higher when more sources agree. |
| **Freshness** | How recent the data is. Decays over 30 days. |

## Knowledge Graph

| Term | Definition |
|---|---|
| **KnowledgeNode** | Typed node in the Product Knowledge Graph (manufacturer, product, brand, category, offer, attribute, etc.). |
| **KnowledgeEdge** | Typed relationship between nodes (manufactures, owns_brand, compatible_with, has_attribute, etc.). |
| **AttributeEvidence** | A single source observation of an attribute value. Has sourceType, confidence, extractedValue, normalizedValue, checksum, URL. |
| **ProductAttribute** | A concluded attribute value with multiple AttributeEvidence[]. Not a single assertion — a conclusion. |
| **AttributeDefinition** | Canonical attribute identity in the Ontology (e.g., "cpu.socket"). Has normalizer + validator functions. |
| **Ontology** | The formal vocabulary of 45 canonical attribute definitions. `resolveAttribute("Socket")` → `cpu.socket`. |
| **DecisionExplanation** | Structured audit trail: chosenValue, winningEvidence, discardedEvidence[], policyApplied, reason. |

## Connectors

| Term | Definition |
|---|---|
| **Discovery Connector** | Finds offers in the world (marketplaces, distributors, retailers). Implements `BaseConnector`. Yields pages. |
| **Manufacturer Connector** | Enriches canonical products with official data. Implements `BaseManufacturerConnector`. Returns single `ManufacturerSource`. |
| **ConnectorDefinition** | Template: protocol, endpoint, authType, capabilities, parserModule, mapperModule. |
| **ConnectorInstance** | Runtime: environment (production/staging), status (healthy/degraded), health metrics, credentials. |
| **ConnectorKind** | `official_api`, `scraper`, `mirror`, `partner`. |
| **CapabilityLevel** | `none`, `partial`, `good`, `excellent`. Quality, not just boolean. |
| **DataCapability** | Declarative: level + formats + languages + supportsSearch + supportsBulk + supportsPagination, etc. |

## Pipeline

| Term | Definition |
|---|---|
| **Catalog Intelligence** | The platform's core capability — transforming heterogeneous data into a canonical, enriched, validated catalog. |
| **Pipeline** | 15-stage transformation chain from DiscoverySignal to BusinessMetricsSnapshot. |
| **Artifact** | An immutable, versioned output of a pipeline stage. Carries ArtifactMetadata (traceId, version, producer, createdAt). |
| **StageMetrics** | Per-stage observability (throughput, latency P95, error rate, cost). |
| **PolicyEngine** | The authoritative decision-maker. AI is advisory; PolicyEngine approves. |
| **Traceability** | DiscoveryTraceId flows end-to-end from Stage 1 to Stage 15. Every artifact is traceable to its origin. |

## Tiers

| Term | Definition |
|---|---|
| **Tier A** | Authority 98-100. CPU/GPU/memory/storage giants (Intel, AMD, NVIDIA, Samsung, etc.). 14 manufacturers. |
| **Tier B** | Authority 92-97. Global motherboard/GPU/peripheral manufacturers (ASUS, MSI, Gigabyte, etc.). 18 manufacturers. |
| **Tier C** | Authority 82-91. Major Chinese manufacturers (Colorful, Huananzhi, DeepCool, etc.). 35 manufacturers. |
| **Tier D** | Authority 70-81. Emerging manufacturers (Kllisre, Atermiter, etc.). 10 manufacturers. |
