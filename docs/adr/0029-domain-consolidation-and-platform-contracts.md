# ADR-0029: Domain Consolidation & Platform Contracts

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** project lead
- **Supersedes:** —

## Context

ADR-0028 added 4 bounded contexts (planning, attributes, media, search) for a total of 18.
Before implementing A2.1 (Discovery Planner), 9 conceptual adjustments are needed to
prevent domain bloat and ensure the platform scales conceptually as well as technically.

## Decision

### 1. Capability Groups (organizational, not structural)

Group 21 bounded contexts into 3 capability groups:

- **Core**: identity, catalog, customer, cart, checkout, order, payment, supplier, store, integration, lookup
- **Commerce Intelligence**: discovery, planning, attributes, evaluation, ranking, compliance, localization
- **Commerce Operations**: providers, media, search, marketplace

Contexts remain independent — grouping is for governance and documentation.

### 2. PolicyEngine

Unified policy engine in `planning` context. `evaluate<TContext, TResult>(policy, context)`.
10 built-in policy names (product.approval, price.validation, supplier.selection, fraud.detection, etc.).
New rules enter without changing orchestrators. ApprovalPolicy, ComplianceEngine, FeatureFlagService
all become policy evaluators.

### 3. AI Separation (InferenceProvider + DecisionProvider)

In `evaluation` context:

- InferenceProvider: generates raw LLM responses (OpenAI, Ollama, vLLM). 8 inference types.
- DecisionProvider: generates recommendations based on inference + rules. 8 decision types.
- Policy makes the final deterministic decision.

Flow: Inference → Recommendation → Policy → Decision

### 4. Ranking Engine

New `ranking` context. Unified ranking for products, suppliers, niches, categories, brands.
RankingSignal → RankingModel (weighted factors) → RankingResult. Feeds homepage, search,
categories, recommendations. Same engine, multiple consumers.

### 5. ProductScore (unified)

In `evaluation` context. Value Object with 9 components: overall, commercial, quality,
confidence, risk, trend, competition, margin, supplier. Each component independent;
overall is a weighted composite. Enables unified prioritization.

### 6. AI Model Versioning

In `evaluation` context. AIModelVersion: modelVersion, promptVersion, evaluationSchemaVersion,
featureVectorVersion, scoringVersion. AIModelRegistry: getActiveVersion, activateVersion,
compareVersions. Enables reprocessing millions of products when logic evolves.

### 7. Localization Context

New `localization` context. Language, Region, TaxRule, Translation, LocalizedContent,
LocalizedPrice. LocalizationService: translate, getLocalizedContent, getLocalizedPrice,
calculateTax, formatPrice. Discovery, catalog, and checkout all reuse this model.

### 8. Business Metrics

In `discovery` context. 18 business metric types (products_discovered, approval_rate,
time_to_publish, ai_accuracy, conversion_by_niche, etc.). BusinessMetricsRecorder with
query and aggregate. Treated as domain events, not infrastructure metrics.

### 9. Decouple Marketplace from Catalog

In `marketplace` context. SupplierOffer + FulfillmentOption. A CanonicalProduct has
multiple SupplierOffers; each offer has multiple FulfillmentOptions. The connector
remains an infrastructure detail. Adding new suppliers doesn't alter the domain.

## New Bounded Contexts

| Context      | Module                           | Purpose                                                            |
| ------------ | -------------------------------- | ------------------------------------------------------------------ |
| Evaluation   | `@workspace/domain/evaluation`   | InferenceProvider, DecisionProvider, ProductScore, AIModelRegistry |
| Ranking      | `@workspace/domain/ranking`      | RankingSignal, RankingModel, RankingEngine                         |
| Localization | `@workspace/domain/localization` | Language, Region, TaxRule, Translation, LocalizedPrice             |

Total bounded contexts: 21, organized in 3 capability groups.

## Roadmap A2.1 (Discovery Planner) — refined scope

1. Receive DiscoverySignals
2. Apply PolicyEngine (discovery.priority policy)
3. Consult DiscoveryBudget
4. Generate prioritized DiscoveryPlans
5. Persist plans
6. Publish DiscoveryPlanCreated event
7. Do NOT execute any discovery

Execution is exclusively for A2.2 — Discovery Orchestrator.

## Consequences

**Positive**

- PolicyEngine unifies all rules — new rules without changing orchestrators.
- AI separation (inference vs decision) enables A/B testing models.
- Ranking engine feeds multiple consumers with one model.
- ProductScore gives a single view for prioritization.
- Localization is reusable across discovery, catalog, checkout.
- Business metrics are first-class domain events.
- Marketplace decoupled from catalog — new suppliers don't change domain.

**Negative**

- More contracts (9 new + 3 new contexts).
- PolicyEngine adds indirection for rule evaluation.

## References

- ADR-0028 (Platform Architecture Refinements — preceding adjustments)
- ADR-0027 (Discovery Planning Contracts)
- ADR-0026 (Discovery Pipeline Contracts)
- `packages/domain/src/{evaluation,ranking,localization}/`
- `packages/domain/src/planning/index.ts` (PolicyEngine)
- `packages/domain/src/discovery/index.ts` (BusinessMetrics)
- `packages/domain/src/marketplace/index.ts` (SupplierOffer, FulfillmentOption)
