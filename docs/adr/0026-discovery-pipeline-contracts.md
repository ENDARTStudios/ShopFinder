# ADR-0026: Discovery Pipeline Contracts

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** project lead
- **Supersedes:** —

## Context

Epic A2 (Product Discovery Engine) needs a complete event-driven data processing
pipeline. Without formal contracts for each pipeline stage, the implementation
would couple modules and make it hard to scale to millions of products.

10 contracts are needed before implementation begins:

1. DiscoveryJob — unit of work for the scheduler
2. DiscoveryCheckpoint — resume from where it stopped
3. RawProductRecord — raw payload storage for audit/debug/reprocess
4. DuplicateCandidate — potential duplicate pair with similarity score
5. SimilarityService — interface for comparing two products
6. EvaluationRequest/Result — AI evaluation contract
7. ApprovalPolicy — deterministic rules (AI recommends, policy decides)
8. DiscoveryScheduler — decides what/when/where to discover
9. MarketplaceTaxonomy — category mapping (marketplace → canonical)
10. Discovery Events — all pipeline events

## Decision

Create `@workspace/domain/discovery` bounded context with all 10 contracts.

### Pipeline (event-driven, no direct module calls):

```
DiscoveryRequested → DiscoveryStarted → DiscoveryCompleted
→ ProductsNormalized → DuplicatesDetected → EvaluationCompleted
→ ProductApproved/Rejected → ProductPublished
```

### Key design decisions:

**DiscoveryJob**: formal unit of work with type (trending/category_scan/keyword_search/inventory_sync/price_sync/full_catalog), priority, cursor, attempts, maxAttempts, status, result.

**DiscoveryCheckpoint**: per-provider, per-category cursor + page + itemsProcessed. Enables resuming without restarting.

**RawProductRecord**: stores the original JSON payload from the marketplace API + SHA-256 hash for dedup. Never discarded — used for audit, debug, reprocessing, normalizer evolution.

**DuplicateCandidate**: potential duplicate pair with similarityScore (0-100) + SimilarityFactors (title, image, attribute, price, brand, category, SKU match). Status: pending → confirmed/rejected/merged. AI suggests; human or auto decides.

**SimilarityService**: interface that compares two NormalizedDiscoveredProducts and returns a score + factors + recommendation. Implementation can use embeddings, cosine similarity, rules, or hybrid — the pipeline doesn't care.

**EvaluationRequest/Result**: formal AI evaluation contract. Request includes product + context (storeId, region, targetMargin, competitorPrices, historicalData). Result includes aiScore (0-100), confidence (0-100), factors (15 AIScoreFactors), recommendation (publish/review/reject), reasons, suggestedPrice, modelUsed. Multiple models can compete.

**ApprovalPolicy**: deterministic rules that decide based on AI evaluation. Default: score ≥ 70 + confidence ≥ 80 → publish; score ≥ 50 → review; score < 50 → reject. The AI recommends; the policy decides. Policy is replaceable.

**DiscoveryScheduler**: decides which provider, category, country, priority. The AI never schedules jobs directly — it goes through the scheduler.

**MarketplaceTaxonomy**: maps marketplace-specific categories to our CanonicalCategory tree. Example: AliExpress "Computer Components" → CanonicalCategory ["Technology", "Hardware", "Graphics Card"]. Includes confidence score and auto-mapping flag.

**Discovery Events**: 12 event types covering the full pipeline. Each stage emits an event; no module calls another directly. Events carry payloads with relevant data for the next stage.

## Consequences

**Positive**

- Pipeline is fully event-driven — stages are independently deployable, testable, and scalable.
- Raw product storage enables reprocessing when the normalizer evolves.
- Checkpoints enable resuming large syncs without data loss.
- SimilarityService and ApprovalPolicy are replaceable without touching the pipeline.
- Multiple AI models can compete (A/B testing evaluations).
- Marketplace taxonomy abstraction enables cross-marketplace category filtering.

**Negative**

- More types to maintain (10 contracts + event payloads).
- Event-driven pipeline adds latency (each stage is async).
- Raw product storage consumes disk (mitigated by TTL + compression).

## Roadmap refinement (A2 sub-epics)

A2.1: Discovery Scheduler
A2.2: Provider Workers
A2.3: Raw Product Store
A2.4: Normalizer
A2.5: Similarity Engine
A2.6: Duplicate Detection
A2.7: AI Evaluation
A2.8: Approval Workflow
A2.9: Catalog Publisher

Each can be implemented, tested, and scaled independently.

## References

- ADR-0024 (AI Commerce Platform — A2 is the second epic)
- ADR-0025 (Marketplace Connector Refinements — A1 provides the connector framework)
- `packages/domain/src/discovery/index.ts` (all 10 contracts)
