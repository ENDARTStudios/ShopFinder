/**
 * @workspace/bootstrap/events — Register event consumers
 *
 * Wire all outbox consumers to the event bus. Called once during
 * container initialization.
 *
 * Consumers are already registered in @workspace/events via getConsumerRegistry().
 * This function calls registerAllConsumers to wire them to the bus.
 * Additional epic-specific consumers can be registered here.
 */

import type { DomainEventBus } from "@workspace/domain/shared";
import type { ConsumerRegistry } from "@workspace/events";

export function registerConsumers(_bus: DomainEventBus, _registry: ConsumerRegistry): void {
  // registerAllConsumers is already called in container.ts
  // This function is a placeholder for epic-specific consumer registration.
  //
  // Example (Epic 2 — Supplier):
  //   import { SupplierOrderConsumer } from "@workspace/events";
  //   registry.register(new SupplierOrderConsumer(providerRegistry));
  //
  // Example (Epic 3 — Catalog):
  //   import { MeilisearchIndexConsumer } from "@workspace/events";
  //   registry.register(new MeilisearchIndexConsumer(meilisearchClient));
}
