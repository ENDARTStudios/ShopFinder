# ADR-0028: Platform Architecture Refinements

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** project lead
- **Supersedes:** —

## Context

ADR-0026 (Discovery Pipeline) and ADR-0027 (Discovery Planning) delivered 19 contracts.
Before implementing A2.1 (Scheduler), 10 additional structural refinements are needed
to prevent future coupling and support the AI Commerce Platform at scale.

## Decision

### 1. Separate planning from discovery

New bounded context `planning` (re-exports from discovery + adds new contracts).
Planning is reusable for repricing, campaigns, promotions, inventory sync, marketing AI.

### 2. DiscoveryOrchestrator

Formal orchestrator interface: `plan()`, `execute(plan)`, `resume()`, `rebalance()`.
Scheduler becomes an internal implementation detail.

### 3. FeatureFlagService

14 feature flags (ai_discovery, ai_evaluation, auto_approval, auto_publish, auto_reprice,
auto_translation, auto_media, auto_ordering, auto_seo, auto_categorization, auto_duplicate_detection,
auto_compliance_check, auto_reindex, auto_recommendation). No `if` statements scattered —
all gates go through this service. Scope-based (store, region, category).

### 4. ProductEvaluationProvider (AI as Provider)

AI evaluation inverted — domain defines `ProductEvaluationProvider` interface.
Multiple LLMs implement it: OpenAI, Ollama, vLLM, LM Studio, OpenRouter.
Domain never knows which LLM is used. `evaluate()`, `evaluateBatch()`, `getCapabilities()`.

### 5. Canonical Attribute System (new context: `attributes`)

`CanonicalAttribute` (COLOR, SIZE, WEIGHT, CAPACITY, BRAND) with synonyms (Cor, Couleur, 颜色, Farbe).
`AttributeDictionary` maps marketplace-specific names → canonical.
`AttributeNormalizer` normalizes raw values ("16 GB" → "16GB", "vermelho" → "RED").
Essential for product comparison at scale.

### 6. Quality Score (separate from AI Score)

`QualityScore` = data quality (image quality, description quality, attribute completeness,
variant completeness, media completeness, specification completeness, data consistency, freshness).
AI Score = commercial quality. Both in `attributes` context.

### 7. ComplianceEngine

Service that validates region, brand, supplier, legal restrictions, marketplace policy
BEFORE a product enters the catalog. `validate()` → ComplianceValidationResult with
violations + warnings per region. 5 categories: legal, marketplace_policy, brand_restriction,
product_safety, import_restriction.

### 8. Media Pipeline (new context: `media`)

Independent pipeline: download → optimize → remove background → compress → deduplicate → CDN → publish.
`MediaPipeline` interface with `process()`, `processBatch()`, `getStatus()`, `cancel()`, `retry()`.
`MediaStorage` interface (upload, download, delete, getSignedUrl).
Not implicit in Discovery — triggered by events.

### 9. Search Index Pipeline (new context: `search`)

Independent pipeline: CatalogUpdated → SearchIndexer → OpenSearch/Meilisearch → Vector DB →
Autocomplete → Recommendations.
`SearchIndexPipeline` interface with `index()`, `indexBatch()`, `remove()`, `reindexAll()`.
`VectorSearchService` interface with `embed()`, `search()`, `upsert()`, `delete()`.
Not inside the catalog — separate pipeline triggered by events.

### 10. AI Decision Metrics

Every automated decision records: model, promptVersion, evaluationVersion, latencyMs, cost,
confidence, reason, factors, inputTokens, outputTokens. `AIDecisionRecorder` interface.
Enables re-evaluation of millions of products when switching models.

## New Bounded Contexts

| Context    | Module                         | Purpose                                                                  |
| ---------- | ------------------------------ | ------------------------------------------------------------------------ |
| Planning   | `@workspace/domain/planning`   | Reusable planning (signals, plans, budgets, orchestrator, feature flags) |
| Attributes | `@workspace/domain/attributes` | Canonical attributes, dictionary, normalizer, quality score              |
| Media      | `@workspace/domain/media`      | Media pipeline (download, optimize, deduplicate, CDN)                    |
| Search     | `@workspace/domain/search`     | Search index pipeline + vector search                                    |

Total bounded contexts: 18 (shared, catalog, customer, cart, checkout, order, payment, supplier, store, identity, integration, lookup, marketplace, discovery, planning, attributes, media, search).

## Roadmap refinement (A2.1-A2.13)

A2.1: Discovery Planner
A2.2: Discovery Orchestrator
A2.3: Connector Workers
A2.4: Normalizer
A2.5: Canonical Attributes
A2.6: Similarity
A2.7: AI Evaluation Providers
A2.8: Compliance Engine
A2.9: Approval Engine
A2.10: Media Pipeline
A2.11: Catalog Publisher
A2.12: Search Indexer
A2.13: Observability + Metrics

## Consequences

**Positive**

- Planning reusable across features (repricing, campaigns, promotions).
- AI evaluation swappable (OpenAI, Ollama, vLLM — domain doesn't know).
- Canonical attributes enable cross-marketplace product comparison.
- Compliance engine prevents legal/policy violations before catalog.
- Media pipeline handles millions of images independently.
- Search index pipeline handles reindexing without touching catalog.
- AI decision metrics enable model A/B testing and cost optimization.
- Feature flags enable gradual rollout of automations.

**Negative**

- More contracts to maintain (10 new + 4 new bounded contexts).
- More indirection (planning separate from execution).

## References

- ADR-0026 (Discovery Pipeline Contracts)
- ADR-0027 (Discovery Planning Contracts)
- `packages/domain/src/{planning,attributes,media,search}/`
- `packages/domain/src/discovery/index.ts` (ProductEvaluationProvider, ComplianceEngine, AIMetrics)
