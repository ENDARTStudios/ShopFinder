/**
 * @workspace/domain/discovery/workers/provider-selection
 *
 * ProviderSelector implementation that delegates to a ProviderSelectionPolicy.
 *
 * Two layers:
 *   - ProviderSelectionPolicy (contracts.ts): swappable strategy
 *     (cheapest/fastest/healthiest/weighted/exact). Pure data-in, data-out.
 *   - ProviderSelector (types.ts): integrates with the Worker's runtime
 *     types (DiscoveryJob, DiscoveryConnector map, ProviderHealth).
 *
 * The selector builds ProviderSelectionInput from the job + connectors,
 * invokes the policy, and returns the chosen connector.
 */
import type {
  ProviderSelector,
  DiscoveryConnector,
  DiscoveryJob,
  ProviderHealth,
  WorkerError
} from "./types";
import type {
  ProviderSelectionPolicy,
  ProviderCandidate,
  ProviderSelectionInput
} from "./contracts";
import { ExactProviderPolicy, createSelectionPolicy } from "./contracts";

export class DefaultProviderSelector implements ProviderSelector {
  constructor(private readonly policy?: ProviderSelectionPolicy) {}

  select(
    job: DiscoveryJob,
    connectors: ReadonlyMap<string, DiscoveryConnector>
  ): { connector: DiscoveryConnector; health: ProviderHealth | null } {
    // Build candidates from registered connectors
    const candidates: ProviderCandidate[] = [];
    for (const [code, connector] of connectors) {
      candidates.push({
        providerCode: code,
        providerVersion: connector.providerVersion,
        health: {
          providerCode: code,
          status: "healthy",
          lastSuccess: new Date(),
          consecutiveFailures: 0,
          averageLatencyMs: 0,
          errorRate: 0,
          totalRequests: 0,
          totalErrors: 0
        },
        costScore: 50,
        latencyMs: 100,
        priority: 50
      });
    }

    // Determine policy: explicit policy, or exact-match fallback
    const policy = this.policy ?? new ExactProviderPolicy(job.providerCode);

    const input: ProviderSelectionInput = {
      capability: "discovery",
      region: job.region,
      candidates
    };

    const output = policy.select(input);

    if (!output.providerCode) {
      const error: WorkerError & Error = Object.assign(
        new Error(
          `No connector selected for providerCode '${job.providerCode}' (job ${job.id}). Reason: ${output.reason}`
        ),
        { code: "NO_PROVIDER", retriable: false }
      );
      throw error;
    }

    const connector = connectors.get(output.providerCode);
    if (!connector) {
      const error: WorkerError & Error = Object.assign(
        new Error(`Selected provider '${output.providerCode}' not registered (job ${job.id})`),
        { code: "NO_PROVIDER", retriable: false }
      );
      throw error;
    }

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

export function createProviderSelector(policy?: ProviderSelectionPolicy): ProviderSelector {
  return new DefaultProviderSelector(policy);
}

/**
 * Convenience: create a selector with a specific strategy.
 *   createProviderSelectorWithStrategy("cheapest")
 *   createProviderSelectorWithStrategy("exact", { requestedCode: "aliexpress" })
 */
export function createProviderSelectorWithStrategy(
  strategy: Parameters<typeof createSelectionPolicy>[0],
  options?: Parameters<typeof createSelectionPolicy>[1]
): ProviderSelector {
  return new DefaultProviderSelector(createSelectionPolicy(strategy, options));
}
