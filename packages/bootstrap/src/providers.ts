/**
 * @workspace/bootstrap/providers — Register provider adapters
 *
 * Register all external provider implementations (supplier SDKs, payment
 * providers, etc.) with the ProviderCapabilityRegistry.
 *
 * This is where SDK-specific code is wired. The rest of the app consumes
 * the ProviderCapabilityRegistry interface — never the SDK directly.
 *
 * Example (Epic 2 — Supplier):
 *   import { AliExpressProvider } from "@workspace/providers/aliexpress";
 *   registry.registerSupplier(new AliExpressProvider(apiKey));
 *
 * Example (Epic 5 — Checkout):
 *   import { StripeProvider } from "@workspace/providers/stripe";
 *   registry.registerPayment(new StripeProvider(secretKey));
 */

import type { ProviderCapabilityRegistry } from "@workspace/providers";

export function registerProviders(_registry: ProviderCapabilityRegistry): void {
  // Provider adapters will be registered here as epics are built.
  //
  // For now, the registry is empty — no external providers are connected.
  // When Epic 2 (Supplier) is implemented, supplier providers will be
  // registered here with their API keys resolved from env/secrets.
}
