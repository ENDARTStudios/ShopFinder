/**
 * @workspace/infrastructure/connectors/core/types
 *
 * Core type contracts for the Connector SDK.
 *
 * These contracts are SHARED across all marketplace connectors
 * (AliExpress, Amazon, Mercado Livre, Shopify, WooCommerce).
 * Each connector implements DiscoveryConnector using the transport,
 * auth, pagination, retry, rate-limit, and checkpoint contracts.
 *
 * The domain's DiscoveryConnector interface (in workers/types.ts)
 * is the BEHAVIOR contract. These SDK contracts are the IMPLEMENTATION
 * building blocks that connectors compose internally.
 */
import type { DiscoveryTraceId } from "@workspace/domain/shared";

// ── Marketplace provider ───────────────────────────────────

export type MarketplaceProvider =
  | "aliexpress"
  | "amazon"
  | "ebay"
  | "walmart"
  | "mercadolivre"
  | "shopify"
  | "woocommerce"
  | "digikey"
  | "mouser"
  | "newegg"
  | "internal";

// ── Connector kind ─────────────────────────────────────────

export enum ConnectorKind {
  Marketplace = "Marketplace",
  Distributor = "Distributor",
  Manufacturer = "Manufacturer",
  Retailer = "Retailer",
}

// ── Source metadata ────────────────────────────────────────

/**
 * Enriches each discovered product with metadata about its source.
 * Accompanies NormalizedDiscoveredProduct without altering the
 * domain pipeline. Feeds into ranking, AI, pricing, and monitoring.
 */
export interface SourceMetadata {
  readonly provider: string;
  readonly providerType: ConnectorKind;
  readonly marketplaceRegion: string;
  readonly reliabilityScore: number;  // 0-100
  readonly freshness: Date;
  readonly latencyMs: number;
}

// ── Marketplace capabilities ───────────────────────────────

export interface MarketplaceCapabilities {
  readonly kind: ConnectorKind;
  readonly supportsRealtimeSearch: boolean;
  readonly supportsCursorPagination: boolean;
  readonly supportsIncrementalSync: boolean;
  readonly supportsImages: boolean;
  readonly supportsVariants: boolean;
  readonly supportsAffiliateLinks: boolean;
  readonly supportsInventory: boolean;
  readonly supportsPriceHistory: boolean;
}

// ── Discovery request ──────────────────────────────────────

export interface DiscoveryRequest {
  readonly category?: string;
  readonly keyword?: string;
  readonly region: string;
  readonly language: string;
  readonly limit: number;
  readonly cursor?: string;
  readonly traceId?: DiscoveryTraceId;
}

// ── Discovered product page ────────────────────────────────

export interface DiscoveredProductPage {
  readonly products: ReadonlyArray<unknown>;
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
  readonly apiCallsUsed: number;
}

// ── HTTP transport types ───────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpRequest {
  readonly method: HttpMethod;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly query?: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
}

export interface HttpResponse {
  readonly status: number;
  readonly url?: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly durationMs: number;
}

export interface HttpTransport {
  execute(request: HttpRequest): Promise<HttpResponse>;
  readonly name: string;
}

// ── Auth ───────────────────────────────────────────────────

export interface AuthProvider {
  readonly name: string;
  authenticate(request: HttpRequest): Promise<HttpRequest>;
}

// ── Pagination ─────────────────────────────────────────────

export interface PaginationStrategy<TCursor = string> {
  readonly name: string;
  /** Build the initial cursor for the first page. */
  first(request: DiscoveryRequest): TCursor;
  /** Extract the next cursor from the response, or null if no more pages. */
  next(response: HttpResponse, cursor: TCursor): TCursor | null;
  /** Apply cursor to the HTTP request (query params, headers, body). */
  apply(request: HttpRequest, cursor: TCursor): HttpRequest;
}

// ── Rate limiter ───────────────────────────────────────────

export interface ConnectorRateLimiter {
  acquire(): Promise<void>;
  readonly name: string;
}

// ── Retry ──────────────────────────────────────────────────

export interface ConnectorRetryPolicy {
  readonly name: string;
  shouldRetry(attempt: number, error: ConnectorError): boolean;
  getDelay(attempt: number): number;
  readonly maxAttempts: number;
}

export interface ConnectorError {
  readonly code: string;
  readonly message: string;
  readonly retriable: boolean;
  readonly statusCode?: number;
  readonly cause?: unknown;
}

// ── Checkpoint ─────────────────────────────────────────────

export interface CheckpointSerializer<TCursor = string> {
  serialize(cursor: TCursor): string;
  deserialize(data: string): TCursor;
}

// ── Connector metrics ──────────────────────────────────────

export interface ConnectorMetrics {
  readonly requestsExecuted: number;
  readonly requestsSucceeded: number;
  readonly requestsFailed: number;
  readonly retriesAttempted: number;
  readonly rateLimitWaits: number;
  readonly totalDurationMs: number;
  readonly productsDiscovered: number;
}

export interface ConnectorMetricsCollector {
  recordRequest(durationMs: number, succeeded: boolean): void;
  recordRetry(): void;
  recordRateLimitWait(): void;
  recordProducts(count: number): void;
  snapshot(): ConnectorMetrics;
  reset(): void;
}

// ── Tracing ────────────────────────────────────────────────

export interface ConnectorTraceContext {
  readonly traceId: DiscoveryTraceId;
  readonly provider: MarketplaceProvider;
  readonly stage: string;
}

export function createConnectorTraceContext(
  traceId: DiscoveryTraceId,
  provider: MarketplaceProvider,
  stage: string
): ConnectorTraceContext {
  return { traceId, provider, stage };
}

// ── Connector config ───────────────────────────────────────

export interface ConnectorConfig {
  readonly provider: MarketplaceProvider;
  readonly transport: HttpTransport;
  readonly auth: AuthProvider;
  readonly pagination: PaginationStrategy;
  readonly rateLimiter: ConnectorRateLimiter;
  readonly retryPolicy: ConnectorRetryPolicy;
  readonly checkpointSerializer: CheckpointSerializer;
  readonly timeoutMs: number;
  readonly maxPages: number;
}

// ── DiscoveryConnector (domain-facing) ─────────────────────

/**
 * The connector contract that the Worker calls.
 * Returns an AsyncIterable of pages — the Worker iterates,
 * persists products, and saves checkpoints between pages.
 */
export interface DiscoveryConnector {
  readonly provider: MarketplaceProvider;
  readonly providerVersion: string;
  readonly capabilities: MarketplaceCapabilities;
  discover(request: DiscoveryRequest): AsyncIterable<DiscoveredProductPage>;
}

export type { DiscoveryTraceId };
