# ADR-0025: Marketplace Connector Refinements

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** project lead
- **Supersedes:** —

## Context

Epic A1 (Marketplace Connector Framework) delivered the initial connector interfaces.
Before advancing to Epic A2 (Discovery Engine), 4 refinements are needed to prevent
strong coupling with specific marketplaces and to support the autonomous operation vision:

1. ProviderCapabilityRegistry — track capabilities + health per connector
2. NormalizedDiscoveredProduct — single DTO returned by ALL providers
3. CanonicalProductId — global product identity independent of supplier
4. ProviderHealth — operational metadata for scheduler decisions

Additional refinements: 5. Capability Versioning — providerVersion per connector 6. Confidence Score — how confident we are in product data 7. Dynamic Capability Discovery — findProviders("discovery") instead of instanceof 8. Roadmap refinement — A1-A13 (finer granularity)

## Decision

### 1. ProviderCapabilityRegistry (replaces ProviderRegistry)

- `registerConnector(connector)` — registers with capabilities
- `findProviders(capability)` — dynamic discovery (no instanceof)
- `getDiscoveryProviders()` — convenience for discovery capacity
- `getHealthiestProviders(capability, limit)` — sorted by health + error rate + latency
- Health tracking: `recordSuccess`, `recordFailure`, `updateRateLimit`
- Status transitions: healthy → degraded (2 failures) → offline (5 failures)

### 2. NormalizedDiscoveredProduct

Single DTO returned by ALL providers. The rest of the system never knows which
marketplace the data came from. Fields: externalId, marketplace, supplierName,
sourceUrl, title, description, category, brand, images, attributes, variants,
price, compareAtPrice, currency, inventory, shippingCost, shippingFromCountry,
estimatedDeliveryDays, rating, reviewCount, salesCount, discoveredAt, confidenceScore.

### 3. CanonicalProductId (already exists)

`CanonicalProduct` with `CanonicalProductId` (branded) is the global product identity.
Multiple `SupplierProduct` entries (from different marketplaces) point to the same
CanonicalProduct. This enables deduplication, price comparison, and supplier switching.

### 4. ProviderHealth

Each connector has operational metadata:

- status: healthy | degraded | offline
- lastSuccess, lastFailure, consecutiveFailures
- requestsRemaining, resetAt (rate limits)
- averageLatencyMs, errorRate, totalRequests, totalErrors

The scheduler uses `getHealthiestProviders()` to choose the best connectors.

### 5. Capability Versioning

`MarketplaceConnector.providerVersion` — e.g., "v3". When an API changes,
only that provider's adapter is updated.

### 6. Confidence Score

`CanonicalProduct.confidenceScore` (0-100) — how confident we are in the product data.
Low confidence → review queue or additional validation before publishing.
Also on `NormalizedDiscoveredProduct.confidenceScore` — initial confidence from provider.

### 7. Roadmap refinement (A1-A13)

A1: Provider Framework (this)
A2: Discovery Engine
A3: Normalizer
A4: Duplicate Detection
A5: AI Evaluation
A6: Approval Workflow
A7: Global Catalog
A8: Pricing Engine
A9: Content Engine
A10: Translation
A11: Recommendation
A12: Automation Center
A13: Order Orchestrator

## Consequences

**Positive**

- Dynamic capability discovery eliminates hard dependencies on specific connectors.
- Health tracking enables autonomous connector selection and failover.
- NormalizedDiscoveredProduct ensures the pipeline never breaks when a new marketplace is added.
- Confidence Score gates low-quality products before they reach the catalog.

**Negative**

- More metadata to maintain (health, version, confidence).
- NormalizedDiscoveredProduct requires careful mapping per marketplace.

## References

- ADR-0018 (Provider Architecture — extended by this)
- ADR-0024 (AI Commerce Platform — A1 is the first epic)
- `packages/providers/src/index.ts` (ProviderCapabilityRegistry + ProviderHealth)
- `packages/domain/src/marketplace/index.ts` (NormalizedDiscoveredProduct + confidenceScore)
