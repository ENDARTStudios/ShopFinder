# Roadmap — ShopFinder

> Only approved features. The AI must NOT propose features outside this roadmap.

## Completed ✓

| Feature | Description | Date |
|---|---|---|
| Discovery Pipeline | 15-stage pipeline (DiscoverySignal → BusinessMetricsSnapshot) | 2026-07-13 |
| Connector SDK | BaseConnector + BaseManufacturerConnector with transport, auth, retry, rate-limit, cache | 2026-07-13 |
| Marketplace Connectors | AliExpress, Amazon, eBay (3 marketplaces) | 2026-07-13 |
| Distributor Connector | DigiKey (1 distributor) | 2026-07-13 |
| Retailer Connector | Newegg (1 retailer) | 2026-07-13 |
| Manufacturer Connectors | Intel, AMD (2 manufacturers) | 2026-07-13/14 |
| Manufacturer Enrichment | Stage A2.7b — EnrichedCanonicalProduct with ManufacturerSource | 2026-07-14 |
| SQLite + Prisma | Dev database with 38 tables, repositories, mappers, unit of work | 2026-07-14 |
| Real Catalog API | REST API querying SQLite (products, categories, niches, manufacturers) | 2026-07-15 |
| Real Landing Page | Product-first landing with search bar, niches, categories, products from API | 2026-07-15 |
| Seed Script | 22 products, 67 offers, 16 categories, 7 suppliers | 2026-07-15 |
| Chinese Manufacturers | 35 Tier C manufacturers with multilingual aliases | 2026-07-15 |
| Knowledge Graph | KnowledgeNode (14 types) + KnowledgeEdge (16 types) + query helpers | 2026-07-15 |
| Ontology | 45 canonical AttributeDefinitions with normalizers and validators | 2026-07-15 |
| Authority Engine | AuthorityPolicy (dynamic resolver with 4 weighted factors) | 2026-07-15 |
| Confidence Score | Multi-dimensional (manufacturer, consensus, freshness, parser, ai) | 2026-07-15 |
| Decision Explanation | Structured audit trail (winningEvidence, discardedEvidence, reason) | 2026-07-15 |
| Provenance Graph | ProductAttribute with AttributeEvidence[] (conclusion, not assertion) | 2026-07-15 |
| Connector Registry | ConnectorDefinition + ConnectorInstance (separated from Manufacturer) | 2026-07-15 |
| AI Directives | .ai/ directory with 24 files (constitution, knowledge, workflow, state) | 2026-07-15 |

## Planned (approved, not started)

| Feature | Description | Priority |
|---|---|---|
| Real API credentials | Configure DigiKey OAuth2 and execute pipeline against live API | High |
| Search index | Meilisearch or Typesense for full-text product search | High |
| Authentication | Better Auth integration (login, sessions, MFA) | High |
| Product detail page | Individual product page with full specs, offers comparison, evidence | Medium |
| Cart & checkout | Shopping cart, checkout flow, payment integration | Medium |
| More manufacturer connectors | NVIDIA, ASUS, MSI, Gigabyte, Samsung, Kingston | Medium |
| Real AI evaluation | Execute InferenceProvider against OpenAI with real credentials | Medium |
| Pricing engine | Dynamic pricing with market data, repricing, competitive analysis | Medium |
| Ranking engine | Weighted ranking with trend signals | Medium |
| Dashboard | Operator dashboard with StageMetrics, BusinessMetrics, conflict resolution | Low |
| Connector Marketplace | Plugin system for community-contributed connectors | Low |

## Not in scope (explicitly excluded)

| Feature | Reason |
|---|---|
| Mobile app | Web-first; PWA covers mobile |
| On-premise deployment | Cloud-only (Cloudflare + Vercel) |
| Custom CMS | Not a content platform |
| Email marketing | Not a marketing platform |
| ERP integration (outbound) | API consumers handle their own ERP integration |
