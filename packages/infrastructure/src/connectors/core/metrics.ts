/**
 * @workspace/infrastructure/connectors/core/metrics
 *
 * In-memory ConnectorMetricsCollector.
 */
import type { ConnectorMetrics, ConnectorMetricsCollector } from "./types";

class InMemoryConnectorMetricsCollector implements ConnectorMetricsCollector {
  private requests = 0;
  private successes = 0;
  private failures = 0;
  private retries = 0;
  private rateLimitWaits = 0;
  private totalDuration = 0;
  private products = 0;

  recordRequest(durationMs: number, succeeded: boolean): void {
    this.requests++;
    this.totalDuration += durationMs;
    if (succeeded) this.successes++;
    else this.failures++;
  }

  recordRetry(): void { this.retries++; }
  recordRateLimitWait(): void { this.rateLimitWaits++; }
  recordProducts(count: number): void { this.products += count; }

  snapshot(): ConnectorMetrics {
    return {
      requestsExecuted: this.requests,
      requestsSucceeded: this.successes,
      requestsFailed: this.failures,
      retriesAttempted: this.retries,
      rateLimitWaits: this.rateLimitWaits,
      totalDurationMs: this.totalDuration,
      productsDiscovered: this.products
    };
  }

  reset(): void {
    this.requests = 0;
    this.successes = 0;
    this.failures = 0;
    this.retries = 0;
    this.rateLimitWaits = 0;
    this.totalDuration = 0;
    this.products = 0;
  }
}

export function createConnectorMetricsCollector(): ConnectorMetricsCollector {
  return new InMemoryConnectorMetricsCollector();
}
