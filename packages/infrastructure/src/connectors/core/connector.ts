/**
 * @workspace/infrastructure/connectors/core/connector
 *
 * BaseConnector — abstract base class for marketplace connectors.
 * Composes transport, auth, pagination, rate-limiter, retry, and checkpoint.
 *
 * Concrete connectors (AliExpressConnector, AmazonConnector, etc.) extend
 * this class and implement:
 *   - buildRequest(request, cursor): HttpRequest
 *   - parsePage(response): DiscoveredProductPage
 *
 * The base class handles:
 *   - Auth injection
 *   - Rate limiting
 *   - Retry with backoff
 *   - Pagination iteration (AsyncIterable)
 *   - Metrics collection
 *   - Tracing (DiscoveryTraceId)
 */
import type {
  DiscoveryConnector,
  DiscoveryRequest,
  DiscoveredProductPage,
  HttpRequest,
  HttpResponse,
  MarketplaceProvider,
  MarketplaceCapabilities,
  ConnectorConfig,
  ConnectorMetricsCollector
} from "./types";
import type { ConnectorError } from "./types";
import { createConnectorMetricsCollector } from "./metrics";
import { toConnectorError } from "./retry";
import { fromHttpStatus } from "./errors";

export abstract class BaseConnector implements DiscoveryConnector {
  abstract readonly provider: MarketplaceProvider;
  abstract readonly providerVersion: string;
  abstract readonly capabilities: MarketplaceCapabilities;

  protected readonly config: ConnectorConfig;
  protected readonly metrics: ConnectorMetricsCollector;

  constructor(config: ConnectorConfig, metrics?: ConnectorMetricsCollector) {
    this.config = config;
    this.metrics = metrics ?? createConnectorMetricsCollector();
  }

  /**
   * Build the HTTP request for a given discovery request + cursor.
   * Concrete connectors implement this (URL, method, headers, body).
   */
  protected abstract buildRequest(
    request: DiscoveryRequest,
    cursor: unknown
  ): HttpRequest;

  /**
   * Parse an HTTP response into a DiscoveredProductPage.
   * Concrete connectors implement this (provider-specific JSON parsing).
   */
  protected abstract parsePage(response: HttpResponse): DiscoveredProductPage;

  /**
   * Discover products — yields pages as an AsyncIterable.
   * The Worker iterates, persists products, and saves checkpoints.
   */
  async *discover(request: DiscoveryRequest): AsyncIterable<DiscoveredProductPage> {
    const pagination = this.config.pagination;
    const checkpoint = this.config.checkpointSerializer;

    // Restore from checkpoint if provided
    let cursor: unknown;
    if (request.cursor) {
      cursor = checkpoint.deserialize(request.cursor);
    } else {
      cursor = pagination.first(request);
    }

    let pageCount = 0;

    while (cursor !== null && pageCount < this.config.maxPages) {
      // 1. Build request
      let httpRequest = this.buildRequest(request, cursor);
      httpRequest = { ...httpRequest, timeoutMs: this.config.timeoutMs };

      // 2. Authenticate
      httpRequest = await this.config.auth.authenticate(httpRequest);

      // 3. Apply pagination
      httpRequest = pagination.apply(httpRequest, cursor);

      // 4. Rate limit
      await this.config.rateLimiter.acquire();

      // 5. Execute with retry
      const response = await this.executeWithRetry(httpRequest);

      // 6. Parse page
      const page = this.parsePage(response);
      this.metrics.recordProducts(page.products.length);
      pageCount++;

      yield page;

      // 7. Next cursor
      if (!page.hasMore || !page.nextCursor) {
        break;
      }

      cursor = pagination.next(response, cursor);
    }
  }

  /**
   * Execute an HTTP request with retry logic.
   */
  private async executeWithRetry(request: HttpRequest): Promise<HttpResponse> {
    let attempt = 0;
    let lastError: ConnectorError | null = null;

    while (attempt < this.config.retryPolicy.maxAttempts) {
      attempt++;
      const start = Date.now();

      try {
        const response = await this.config.transport.execute(request);
        const durationMs = Date.now() - start;
        this.metrics.recordRequest(durationMs, response.status < 400);

        // Check for HTTP errors
        if (response.status >= 400) {
          const error = fromHttpStatus(response.status, response.body, request.url);
          lastError = error;

          if (this.config.retryPolicy.shouldRetry(attempt, error)) {
            this.metrics.recordRetry();
            const delay = this.config.retryPolicy.getDelay(attempt);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          throw error;
        }

        return response;
      } catch (error) {
        const connectorError = error.code ? error as ConnectorError : toConnectorError(error);
        lastError = connectorError;
        const durationMs = Date.now() - start;
        this.metrics.recordRequest(durationMs, false);

        if (this.config.retryPolicy.shouldRetry(attempt, connectorError)) {
          this.metrics.recordRetry();
          const delay = this.config.retryPolicy.getDelay(attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw connectorError;
      }
    }

    throw lastError ?? { code: "UNKNOWN", message: "Exhausted retries", retriable: false };
  }

  getMetrics() {
    return this.metrics.snapshot();
  }
}
