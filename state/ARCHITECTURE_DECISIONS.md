# Architecture Decision Records — ShopFinder

> Summarized ADRs. Each records WHY a decision was made, what alternatives were discarded, and what consequences follow.

## ADR-001: 15-stage discovery pipeline

**Decision**: Adopt a 15-stage pipeline from DiscoverySignal to BusinessMetricsSnapshot.

**Motivation**: Product data from multiple sources (marketplaces, distributors, manufacturers) is noisy, duplicated, and inconsistent. A linear pipeline with immutable artifacts at each stage provides traceability, auditability, and replay capability.

**Alternatives discarded**:
- Single-stage ETL: no traceability, no replay, no per-stage observability
- Microservices per stage: too much operational overhead for current scale
- Event sourcing without stages: events without structure, hard to debug

**Consequences**:
- Each stage produces exactly one artifact type
- Stages communicate via events, not direct calls
- Artifacts are immutable (reprocessing creates new versions)
- 15 stages is the minimum for full coverage (fewer = missing transformations)

---

## ADR-002: AI is advisory, Policies are authoritative

**Decision**: The AI (InferenceProvider) proposes scores and recommendations. The PolicyEngine makes the final decision.

**Motivation**: AI output is probabilistic and non-deterministic. Production decisions must be auditable, repeatable, and explainable. A policy layer between AI and action ensures deterministic governance.

**Alternatives discarded**:
- AI decides directly: non-auditable, non-repeatable, hard to debug
- Human approves every decision: doesn't scale
- No AI: loses the intelligence advantage

**Consequences**:
- Every decision has a DecisionTrace
- PolicyEngine can override AI recommendation
- AI can be swapped (OpenAI, Ollama, vLLM) without changing decisions
- DecisionExplanation provides structured audit trail

---

## ADR-003: Product Knowledge Graph

**Decision**: The catalog is a projection of a Product Knowledge Graph. The graph (KnowledgeNode + KnowledgeEdge) is the source of truth.

**Motivation**: A flat catalog cannot represent relationships between products, manufacturers, brands, attributes, and evidence. A graph enables semantic search, RAG, analytics, and explainability.

**Alternatives discarded**:
- Relational catalog only: no relationships, no provenance graph
- Document store: flexible but no typed edges
- Graph database (Neo4j): too much infrastructure for current scale

**Consequences**:
- KnowledgeNode (14 types) + KnowledgeEdge (16 types)
- ProductAttribute has AttributeEvidence[] (conclusion, not assertion)
- Ontology provides canonical attribute IDs (cpu.socket, gpu.memory)
- Catalog materialization is a projection, not the source

---

## ADR-004: Separation of Manufacturer × Connector

**Decision**: Manufacturer is a static identity entity. ConnectorDefinition + ConnectorInstance are operational aggregates. They are separate.

**Motivation**: Multiple connectors can serve the same manufacturer (official API + scraper + mirror). Swapping a connector should not change the manufacturer identity. Operational metrics should not pollute the domain.

**Alternatives discarded**:
- Single ManufacturerConnector entity: couples identity with operations
- Connector inside Manufacturer: same coupling problem

**Consequences**:
- Manufacturer has no connectorHealth field
- ConnectorDefinition (template) + ConnectorInstance (runtime)
- Multiple instances per definition (production, staging, partner)
- Legacy compat aliases maintain compilation during migration

---

## ADR-005: AuthorityPolicy (dynamic, not static)

**Decision**: Authority is resolved dynamically by a Policy that considers source type, confidence, freshness, and connector quality. Not a static number per manufacturer.

**Motivation**: Authority varies by attribute (manufacturer is authoritative for specs but not for pricing), by source type (datasheet > marketplace), by freshness (newer > older), and by connector quality (official API > scraper).

**Alternatives discarded**:
- Static authorityScore per manufacturer: too coarse, doesn't reflect per-attribute differences
- Manual authority assignment: doesn't scale to 77 manufacturers

**Consequences**:
- AuthorityPolicyInput has 7 factors
- AuthorityPolicyResult has score + reason + factors[]
- DEFAULT_AUTHORITY_POLICY implements weighted sum (source 40%, confidence 30%, freshness 15%, connector 15%)
- Custom policies can be plugged in

---

## ADR-006: CapabilityLevel (quality, not boolean)

**Decision**: Capabilities use 4 levels (none/partial/good/excellent) instead of boolean.

**Motivation**: A boolean tells IF a manufacturer provides a resource, but not HOW WELL. The pipeline needs to know quality to decide which enrichment steps to execute and which source to prefer.

**Alternatives discarded**:
- Boolean capabilities: too coarse
- Numeric score per capability: less readable, harder to maintain

**Consequences**:
- DataCapability has level + formats + languages + 7 boolean flags (supportsSearch, supportsBulk, etc.)
- 3 presets: EXCELLENT_REST_CAPABILITY, GOOD_REST_CAPABILITY, PARTIAL_SCRAPE_CAPABILITY
- The pipeline discovers automatically how to consume each manufacturer

---

## ADR-007: Chinese manufacturers as first-class citizens

**Decision**: 35 Chinese manufacturers (Tier C) are full citizens with multilingual aliases, brands, and connector definitions.

**Motivation**: The ShopFinder consolidates hardware from multiple origins. Chinese manufacturers represent a significant market share. Excluding them would limit coverage.

**Alternatives discarded**:
- Western manufacturers only: incomplete catalog
- Chinese manufacturers as second-class (no enrichment): lower data quality

**Consequences**:
- Aliases include Chinese characters + pinyin (七彩虹, qicaihong, colorful)
- Scraper connectors for manufacturers without official APIs
- CCC certification added to the Certification type
- Country of origin tracked per manufacturer
