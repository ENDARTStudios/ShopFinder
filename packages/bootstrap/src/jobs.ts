/**
 * @workspace/bootstrap/jobs — Register background jobs
 *
 * Jobs are already registered in @workspace/jobs via getJobRegistry().
 * This function is a placeholder for epic-specific job registration.
 *
 * Example (Epic 2 — Supplier):
 *   import { SyncProductsJob } from "./jobs/sync-products";
 *   registry.register(new SyncProductsJob(providerRegistry, unitOfWork));
 */

import type { JobRegistry } from "@workspace/jobs";

export function registerJobs(_registry: JobRegistry): void {
  // Built-in jobs (OutboxDispatcher, WebhookProcessor, InventoryCleanup)
  // are already registered in getJobRegistry().
  //
  // Epic-specific jobs will be registered here as features are built.
}
