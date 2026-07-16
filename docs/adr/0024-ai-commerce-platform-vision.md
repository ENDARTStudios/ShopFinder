# ADR-0024: AI Commerce Platform — Product Vision & Roadmap Reorganization

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** project lead
- **Supersedes:** ADR-0022 (Feature Slice Organization — replaced by this)

## Context

The project evolved from a "dropshipping hardware store" to a **global AI Commerce Platform**.
The original roadmap (Identity → Supplier → Catalog → Cart → Checkout → Orders → Payments → Storefront)
was optimized for a traditional e-commerce. The new vision requires:

1. **Autonomous operation**: the platform discovers, evaluates, prices, publishes, and operates products 24/7.
2. **Multi-supplier**: CanonicalProduct → SupplierProduct → MarketplaceListing model (not Product → Supplier).
3. **AI-first**: specialized AI agents for discovery, evaluation, pricing, content, translation, recommendation.
4. **Scale**: 10M+ products, 100M+ images, 100 countries, 50 languages, 1000 orders/hour.
5. **Governance**: respect platform ToS, use official APIs, transparent to consumers.

The infrastructure (CQRS, UoW, Repositories, QueryServices, Bootstrap, EventBus, Outbox, Jobs, Providers, Events, API, Design System) is frozen. New features build on this foundation without structural changes.

## Decision

### Roadmap reorganization

Replace the original epic sequence with two phases:

**Fase A — Plataforma Global (autônoma)**

- A1: Marketplace Connector Framework (provider interfaces + adapters)
- A2: Product Discovery Engine (pipeline: discover → normalize → deduplicate → evaluate → approve → catalog)
- A3: AI Evaluation Engine (composite score 0-100)
- A4: Product Approval Workflow (state machine: DISCOVERED → ANALYZING → APPROVED → PUBLISHED → BOOSTED → DECLINING → REMOVED)
- A5: Global Catalog (CanonicalProduct + SupplierProduct + MarketplaceListing)
- A6: Dynamic Pricing (continuous price calculation)
- A7: AI Content Generator (title, description, SEO, FAQ)
- A8: Translation Engine (13+ languages)
- A9: Search & Recommendation (semantic, vector, hybrid search)
- A10: Automation Center (AI brain — hundreds of decisions)
- A11: Supplier Orchestrator (automatic best-supplier selection per order)

**Fase B — Operação**

- B1: Identity (RBAC completo — middleware, guards, <Can> components)
- B2: Checkout & Order Orchestration
- B3: Customer Experience (notifications, tracking, post-sale)
- B4: Admin & Analytics (dashboard, operational management)
- B5: Multi-niche Homepage (dynamic, AI-driven)

### Data model evolution

Evolve from `Product → SupplierProduct` to:

```
CanonicalProduct (canonical — e.g., "Logitech G304 Mouse")
    ↑
SupplierProduct (supplier offer — e.g., AliExpress $21, Temu $20, CJ $19)
    ↑
MarketplaceListing (our publication — e.g., $34.99 with our brand)
```

This enables:

- Price comparison across suppliers
- Automatic best-supplier selection
- Fallback when a supplier runs out of stock
- Seamless origin switching without customer impact

### AI agents (specialized, decoupled)

10 specialized AI agents, each with a single responsibility:
Discovery, Evaluation, Pricing, Catalog, SEO, Translation, Recommendation, Fraud, Support, Analytics.

All agents publish events via the existing EventBus + Outbox infrastructure.
Agents are desacoplados — can be deployed/replaced independently.

### Governance

- Integrations via official APIs or affiliate/partner programs when available
- Respect platform ToS — no scraping that violates terms of service
- Customer knows they're buying from our company (we're the seller of record)
- Compliance with consumer protection laws in each country
- Don't hide the dropshipping nature or imply we're the manufacturer

## Consequences

**Positive**

- Platform can operate autonomously (discovery → sale → fulfillment) with minimal human intervention
- Multi-supplier model enables price optimization and resilience
- AI agents are independently deployable and replaceable
- Scale-ready architecture (10M+ products)

**Negative**

- Larger scope (10M+ products vs original ~thousands)
- More complex data model (CanonicalProduct + SupplierProduct + MarketplaceListing vs single Product)
- AI agent infrastructure adds operational complexity (model management, cost control)
- Multi-language content generation is expensive (LLM API costs)

## Alternatives Considered

- **Keep original roadmap** (Identity first) — rejected: doesn't align with the autonomous platform vision. Identity is functional; RBAC can be completed in parallel or after discovery engine.
- **Single "AI does everything"** — rejected: specialized agents are more maintainable, testable, and replaceable than a monolithic AI brain.
- **Manual product curation** — rejected: doesn't scale to 10M+ products. Automation is the core differentiator.

## References

- `docs/product-vision.md` (full vision document)
- ADR-0022 (superseded — original feature slice organization)
- ADR-0018 (Provider Architecture — A1 extends this)
- ADR-0005 (Domain Architecture — new bounded contexts added)
