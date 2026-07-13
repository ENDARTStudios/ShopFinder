/**
 * @workspace/domain/discovery/workers/provider-selection
 *
 * ProviderSelector implementation.
 *
 * Selection order:
 *   1. Exact match by job.providerCode (if connector is registered)
 *   2. Fallback: throw NoProviderAvailable
 *
 * Health metadata is returned alongside the connector so the worker
 * can adjust expectations (degraded providers may be slower).
 */
import type {
  ProviderSelector,
  DiscoveryConnector,
  DiscoveryJob,
  ProviderHealth,
  WorkerError
} from "./types";

export class DefaultProviderSelector implements ProviderSelector {
  select(
    job: DiscoveryJob,
    connectors: ReadonlyMap<string, DiscoveryConnector>
  ): { connector: DiscoveryConnector; health: ProviderHealth | null } {
    const connector = connectors.get(job.providerCode);
    if (!connector) {
      // Throw a structured WorkerError so the worker's error handling
      // recognizes the code instead of wrapping it as UNKNOWN.
      const error: WorkerError & Error = Object.assign(
        new Error(`No connector registered for providerCode '${job.providerCode}' (job ${job.id})`),
        {
          code: "NO_PROVIDER",
          retriable: false
        }
      );
      throw error;
    }
    // Health is fetched separately by the Worker if needed; the selector
    // is kept pure (no DB / registry lookups).
    return { connector, health: null };
  }
}

export class NoProviderAvailable extends Error {
  readonly code = "NO_PROVIDER";
  readonly retriable = false;
  constructor(message: string) {
    super(message);
    this.name = "NoProviderAvailable";
  }
}

export function createProviderSelector(): ProviderSelector {
  return new DefaultProviderSelector();
}
