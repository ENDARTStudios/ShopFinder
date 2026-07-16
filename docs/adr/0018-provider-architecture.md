# ADR-0018: Provider Architecture

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The platform integrates with multiple external systems: supplier APIs (AliExpress, CJ, Zendrop, ...), payment providers (Stripe, PayPal), shipping, tax, email. Without a provider layer, SDK code leaks into the domain and integrations packages.

## Decision

Create `@workspace/providers` package. All external SDKs live here behind standard interfaces:

- `SupplierProvider` — listProducts, getProduct, placeOrder, getOrder, parseWebhook, verifyWebhookSignature.
- `PaymentProvider` — createPaymentIntent, capturePayment, refundPayment, parseWebhook, verifyWebhookSignature.
- `ProviderRegistry` — register/get by code.

Pattern: SDK (npm) → Provider adapter (this package) → Interface (consumed by domain/jobs/integrations).

## Consequences

**Positive**: SDK swap = new adapter, no domain change. SDK versions isolated. Testable with mocks.
**Negative**: Adapter boilerplate per provider. Acceptable for decoupling.

## References

- ADR-0004 (Decoupled AI provider layer — same pattern)
- `packages/providers/src/` (implementation)
