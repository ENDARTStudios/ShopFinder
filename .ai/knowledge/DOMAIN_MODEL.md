# Domain Model — ShopFinder

> Single source of truth for domain entities, their responsibilities, invariants, and relationships.

## Core entities

### Offer (RawProductRecord)
- **Responsibility**: A single product listing from a single supplier. The rawest form of product data.
- **Invariants**: Immutable. Identified by (executionId, payloadHash). Append-only.
- **Relationships**: Belongs to DiscoveryExecution. Normalized into NormalizedProductRecord.

### NormalizedProductRecord
- **Responsibility**: Structured offer after 7 normalization stages (title, brand, category, attributes, images, price, semantic hash).
- **Invariants**: Immutable. Carries confidenceScore (0-1).
- **Relationships**: Derived from RawProductRecord. Grouped into SimilarityCluster.

### SimilarityCluster
- **Responsibility**: Group of NormalizedProductRecords that likely represent the same physical product.
- **Invariants**: Union-Find clustering. Evidence-based (not heuristic).
- **Relationships**: Contains NormalizedProductRecords. Resolved into CanonicalIdentity.

### CanonicalProduct
- **Responsibility**: The consolidated product — one entity from multiple offers.
- **Invariants**: Immutable. Has priceRange (min/max across offers). Built by CanonicalBuilder.
- **Relationships**: Has CanonicalIdentity. Enriched into EnrichedCanonicalProduct.

### EnrichedCanonicalProduct
- **Responsibility**: CanonicalProduct + manufacturer data (specs, datasheets, lifecycle, certifications, warranty).
- **Invariants**: Immutable. EnrichmentEvidence tracks which source provided each field.
- **Relationships**: Derived from CanonicalProduct + ManufacturerSource.

### Manufacturer
- **Responsibility**: Identity of a product manufacturer (Intel, AMD, Colorful, etc.).
- **Invariants**: Has authorityScore + coverageScore. Has segmentCoverage per segment. Has authority per attribute type. Has CapabilityProfile (none/partial/good/excellent).
- **Relationships**: Owns Brands. Has ConnectorDefinitions. Has ManufacturerVersions.

### Brand
- **Responsibility**: Commercial brand name, separate from manufacturer entity.
- **Invariants**: A manufacturer can own multiple brands (Lenovo → Legion, ThinkPad, ThinkCentre).
- **Relationships**: Belongs to Manufacturer.

### ConnectorDefinition
- **Responsibility**: Template for a data source connector (protocol, endpoint, auth, capabilities).
- **Invariants**: Has ConnectorCapabilityDescriptor (declarative, not opinion-based).
- **Relationships**: Has ConnectorInstances.

### ConnectorInstance
- **Responsibility**: Runtime deployment of a connector (environment, health, sync state).
- **Invariants**: Has status (healthy/degraded/down/not_configured). Multiple instances per definition allowed.
- **Relationships**: References ConnectorDefinition.

### ProductAttribute
- **Responsibility**: A concluded attribute value (e.g., socket=LGA1700) with multiple evidence sources.
- **Invariants**: Has AttributeEvidence[]. Has ConfidenceScore. Has resolver (policy name).
- **Relationships**: Has AttributeEvidence[]. References AttributeDefinition (ontology).

### AttributeEvidence
- **Responsibility**: A single source observation of an attribute value.
- **Invariants**: Has sourceType, confidence, extractedValue, normalizedValue, checksum, URL.
- **Relationships**: Belongs to ProductAttribute.

### AttributeDefinition (Ontology)
- **Responsibility**: Canonical attribute identity (e.g., "cpu.socket"). Eliminates naming ambiguity.
- **Invariants**: Has normalizer function + validator function. Has aliases[] for resolution.
- **Relationships**: Referenced by ProductAttribute.

### KnowledgeNode
- **Responsibility**: Typed node in the Product Knowledge Graph.
- **Invariants**: Has type (14 types: manufacturer, product, brand, category, etc.). Has externalId.
- **Relationships**: Connected via KnowledgeEdge.

### KnowledgeEdge
- **Responsibility**: Typed relationship between KnowledgeNodes.
- **Invariants**: Has type (16 types: manufactures, owns_brand, compatible_with, etc.). Has weight (0-1).
- **Relationships**: Links KnowledgeNode → KnowledgeNode.

### AuthorityPolicy
- **Responsibility**: Dynamically resolves authority score based on source type, confidence, freshness, connector.
- **Invariants**: Returns AuthorityPolicyResult {score, reason, factors[]}. Not a static number.
- **Relationships**: Consumed by PolicyEngine.

### ConfidenceScore
- **Responsibility**: Multi-dimensional confidence (overall, manufacturer, consensus, freshness, parser, ai).
- **Invariants**: Overall is auto-computed via weighted sum. Each dimension is 0-100.
- **Relationships**: Part of ProductAttribute and DecisionExplanation.

### DecisionExplanation
- **Responsibility**: Structured audit trail for a policy decision.
- **Invariants**: Has chosenValue, winningEvidence, discardedEvidence[], policyApplied, reason.
- **Relationships**: Produced by AuthorityPolicy.

### ManufacturerVersion
- **Responsibility**: Immutable history of manufacturer profile changes.
- **Invariants**: Versioned (1, 2, 3...). Has changes[]. Has previousVersionId.
- **Relationships**: Belongs to Manufacturer.

## Aggregates

```
Manufacturer
├── Identity (code, name, country, status)
├── AuthorityProfile (per attribute)
├── CoverageProfile (per segment)
├── CapabilityProfile (per capability, CapabilityLevel)
├── CertificationProfile (CE, FCC, RoHS, UL, ANATEL, CCC)
├── ResourceProfile (website, support, download, datasheet)
├── BrandCatalog (brands[])
└── VersionHistory (ManufacturerVersion[])

ConnectorDefinition
├── Configuration (protocol, endpoint, auth, rateLimit)
├── Capabilities (ConnectorCapabilityDescriptor)
└── Parser/Mapper modules

ConnectorInstance
├── Environment (production, staging, internal, partner)
├── Health (status, successRate, latency)
├── SyncState (lastSuccessfulSync, lastFailure, rateLimit)
└── Credentials reference

ProductAttribute
├── Conclusion (name, value, confidence)
├── Evidence[] (AttributeEvidence)
└── Resolver (policy name, resolvedAt)

KnowledgeGraph
├── Nodes[] (KnowledgeNode)
├── Edges[] (KnowledgeEdge)
└── Query helpers (getNeighbors, getEdges, findNode)
```
