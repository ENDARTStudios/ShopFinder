# ADR-0030: Foundation Freeze — Final Governance Contracts

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** project lead
- **Supersedes:** —

## Context

After 29 ADRs and 21 bounded contexts, the architectural foundation is mature.
8 final governance adjustments are needed to prevent future fragmentation
and enable autonomous operation at scale.

## Decision

### 1. Freeze Bounded Contexts (24 total)

No new bounded context without an ADR. New requirements enter as contracts
within existing contexts. 3 new contexts added (pricing, knowledge, experimentation)
bringing total to 24, organized in 3 capability groups.

### 2. Schema Registry (in planning)

EventSchema (schemaId, schemaVersion, compatibility, producerVersion).
SchemaRegistry (register, validate, deprecate). Every event is versioned.

### 3. Workflow Engine (in planning)

WorkflowDefinition → WorkflowStep → WorkflowContext → WorkflowEngine.
Shared execution for Discovery, Media, Catalog, Search, Repricing.

### 4. Pricing Context (new)

Price, PriceRule, Margin, Markup, Promotion, CurrencyConversion, CompetitorPrice,
DynamicPricingPolicy, PricingEngine. Planner and Approval consult; don't calculate.

### 5. Feature Registry (in planning, extends FeatureFlagService)

FeatureDefinition, FeatureState, RolloutStrategy (percentage, regions, tenants, gradual),
FeatureOverride (tenant, region, store, user). A/B testing ready.

### 6. Knowledge Context (new)

Embedding, VectorDocument, KnowledgeSource, PromptTemplate, PromptVersion,
RetrievalPolicy, KnowledgeBase. RAG-ready without altering the rest of the platform.

### 7. Multi-tenancy (in planning)

Tenant → Organization → Store → Brand. Types: single_brand, multi_brand, white_label,
franchise, b2b. Same platform operates multiple brands, white-label, franchises.

### 8. Experimentation Context (new)

Experiment, ExperimentVariant, TrafficSplit, OptimizationGoal, ExperimentResult,
ExperimentEngine. A/B testing for homepage, ranking, AI, checkout, pricing.

### 9. Foundation Freeze Policy

Infrastructure changes only when:

- A requirement is impossible to implement with current architecture
- Measurable performance problem
- Scalability problem
- Security problem
- An ADR justifies the change

Everything else is implemented as a feature slice.

## Final Bounded Contexts (24)

**Core (11)**: identity, catalog, customer, cart, checkout, order, payment, supplier, store, integration, lookup

**Commerce Intelligence (10)**: discovery, planning, attributes, evaluation, ranking, marketplace, localization, pricing, knowledge, experimentation

**Commerce Operations (3)**: providers, media, search

## Consequences

**Positive**

- Foundation is frozen — all future work is feature slices.
- Schema Registry enables independent consumer evolution.
- Workflow Engine eliminates scattered pipeline logic.
- Pricing, Knowledge, Experimentation have dedicated contexts.
- Multi-tenancy enables white-label and franchise models.
- Feature Registry enables gradual rollout and A/B testing.

**Negative**

- 24 contexts is the maximum — no more without ADR.
- More contracts to maintain (but foundation is now complete).

## References

- ADR-0029 (Domain Consolidation — preceding)
- ADR-0024 (AI Commerce Platform — vision)
- All ADRs 0001-0029 (the foundation)
