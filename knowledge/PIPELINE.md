# Pipeline — 15 Stages

> Each stage produces one immutable artifact. Stages communicate via events. Never skip stages.

## Pipeline overview

```
DiscoverySignal → DiscoveryJob → RawProductRecord → NormalizedProductRecord
→ SimilarityCluster → CanonicalProduct → EnrichedCanonicalProduct
→ EvaluatedProduct → CompliantProduct → CatalogProduct
→ PublicationJob → PublicationRecord → PricingSnapshot → RankingRecord
→ StageMetrics → BusinessMetricsSnapshot
```

## Stage details

### Stage 1: DiscoverySignal
- **Input**: External trigger (keyword, category, trend, schedule)
- **Output**: `DiscoverySignal` artifact
- **Responsibility**: Capture the intent to discover products
- **Events**: `discovery.signal.created`
- **Invariants**: Signal has keyword/category/region/limit

### Stage 2: DiscoveryPlanner
- **Input**: `DiscoverySignal`
- **Output**: `DiscoveryPlan` → `DiscoveryJob`
- **Responsibility**: Convert signal into executable jobs with provider selection
- **Events**: `discovery.plan.created`, `discovery.job.created`
- **Invariants**: Plan has traceId (born here, flows through entire pipeline)

### Stage 3: DiscoveryWorkers
- **Input**: `DiscoveryJob`
- **Output**: `WorkerResult` (pages of `DiscoveredProductPage`)
- **Responsibility**: Call connectors (marketplaces, distributors, retailers) to fetch offers
- **Events**: `discovery.worker.started`, `discovery.worker.completed`
- **Invariants**: Workers use checkpoint for resume. Rate-limited per provider.

### Stage 4: RawStore
- **Input**: `WorkerResult` (raw product data)
- **Output**: `RawProductRecord`
- **Responsibility**: Persist raw offers (append-only, payloadHash, idempotent)
- **Events**: `discovery.raw.appended`
- **Invariants**: Append-only. Unique by (executionId, payloadHash). Never modified.

### Stage 5: Normalizer
- **Input**: `RawProductRecord`
- **Output**: `NormalizedProductRecord`
- **Responsibility**: 7 normalization stages (title → brand → category → attributes → images → price → semantic hash)
- **Events**: `discovery.normalizer.completed`
- **Invariants**: Has confidenceScore (0-1). Consults Ontology for attribute canonicalization.

### Stage 6: Similarity & Duplicate Detection
- **Input**: `NormalizedProductRecord[]`
- **Output**: `SimilarityCluster` + `DuplicateCandidate`
- **Responsibility**: Union-Find clustering. Evidence-based (not heuristic).
- **Events**: `discovery.similarity.cluster_created`, `discovery.similarity.candidates_detected`
- **Invariants**: Does NOT call IA. Does NOT access marketplaces. Discover only.

### Stage 7: Duplicate Resolution
- **Input**: `SimilarityCluster[]`
- **Output**: `CanonicalIdentity` + `CanonicalProduct` (or `ConflictRecord`)
- **Responsibility**: Pick primary product. Build CanonicalProduct via CanonicalBuilder.
- **Events**: `discovery.resolution.identity_resolved`, `discovery.resolution.product_built`
- **Invariants**: Does NOT call IA. Does NOT modify NormalizedProductRecord. ResolutionPolicy is swappable.

### Stage 7b: Manufacturer Enrichment
- **Input**: `CanonicalProduct`
- **Output**: `EnrichedCanonicalProduct`
- **Responsibility**: Route by brand → ManufacturerConnector → ManufacturerSource → EnrichmentPolicy → merge
- **Events**: `discovery.enrichment.requested`, `discovery.enrichment.fetched`, `discovery.enrichment.applied`
- **Invariants**: Manufacturer connectors do NOT discover products — they enrich. AuthorityPolicy resolves conflicts per attribute.

### Stage 8: AI Evaluation
- **Input**: `EnrichedCanonicalProduct`
- **Output**: `EvaluatedProduct` (EvaluationResult + ApprovalDecision + DecisionTrace)
- **Responsibility**: InferenceProvider (AI) → DecisionProvider → PolicyEngine
- **Events**: `discovery.evaluation.completed`
- **Invariants**: **AI is advisory. Policies are authoritative.** PolicyEngine makes the final decision. DecisionExplanation is produced for audit.

### Stage 9: Compliance PostCheck
- **Input**: `EvaluatedProduct`
- **Output**: `CompliantProduct` (or rejection)
- **Responsibility**: Verify certifications (RoHS, CE, FCC, ANATEL), documentation, regional rules
- **Events**: `discovery.compliance.checked`
- **Invariants**: PreCheck saves AI cost (blocks ineligible before inference). PostCheck validates results.

### Stage 10: Catalog Materializer
- **Input**: `CompliantProduct`
- **Output**: `CatalogProduct`
- **Responsibility**: Assign SKU, slug, variants, SEO metadata. Materialize into catalog.
- **Events**: `discovery.catalog.materialized`
- **Invariants**: Catalog is immutable after materialization. Pricing/ranking/publication are projections.

### Stage 11: Publication
- **Input**: `CatalogProduct`
- **Output**: `PublicationJob` → `PublicationRecord`
- **Responsibility**: Plan multi-destination publication. Execute per destination.
- **Events**: `discovery.publication.planned`, `discovery.publication.published`
- **Invariants**: Publication is a consumer of the catalog, not the core. Multiple destinations supported.

### Stage 12: Pricing
- **Input**: `CatalogProduct` + market data
- **Output**: `PricingSnapshot` → `PriceDecision`
- **Responsibility**: Calculate prices (markup, competitive, repricing). Snapshot is immutable.
- **Events**: `discovery.pricing.snapshot_created`
- **Invariants**: Catalog stays static. Pricing is a projection.

### Stage 13: Ranking
- **Input**: `CatalogProduct` + metrics
- **Output**: `RankingRecord`
- **Responsibility**: Rank products by weighted factors. Catalog stays static.
- **Events**: `discovery.ranking.record_created`
- **Invariants**: Ranking is a projection. Does not mutate catalog.

### Stage 14: Monitoring (StageMetrics)
- **Input**: All stages
- **Output**: `StageMetrics`
- **Responsibility**: Per-stage throughput, latency P95, error rate, cost
- **Events**: `discovery.monitoring.metrics_collected`
- **Invariants**: Observability is derived from the pipeline, not part of the transformation chain.

### Stage 15: BusinessMetrics
- **Input**: `StageMetrics[]`
- **Output**: `BusinessMetricsSnapshot`
- **Responsibility**: Aggregate into business KPIs (revenue, cost, GPM, active products)
- **Events**: `discovery.monitoring.business_snapshot`
- **Invariants**: Temporal aggregation. Does not modify the pipeline.

## Cross-cutting

- **Traceability**: `DiscoveryTraceId` flows from Stage 1 to Stage 15. Every artifact carries `ArtifactMetadata`.
- **Event-driven**: Stages communicate via `DomainEvent`. No direct calls between coordinators.
- **Immutability**: No artifact is ever modified. Reprocessing creates new versions.
- **Separation**: Discovery connectors find offers. Manufacturer connectors enrich products. Never crossed.
