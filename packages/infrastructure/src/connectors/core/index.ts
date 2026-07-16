/**
 * @workspace/infrastructure/connectors/core
 *
 * Barrel exports for the Connector SDK core.
 *
 * Contracts:
 *   - DiscoveryConnector: domain-facing interface (AsyncIterable<DiscoveredProductPage>)
 *   - HttpTransport: pluggable HTTP (fetch, undici, replay, mock)
 *   - AuthProvider: pluggable auth (noop, bearer, api-key, signature)
 *   - PaginationStrategy: pluggable pagination (cursor, offset, page)
 *   - ConnectorRateLimiter: per-provider HTTP rate limiting
 *   - ConnectorRetryPolicy: HTTP retry with backoff
 *   - CheckpointSerializer: cursor serialization for resume
 *   - ConnectorMetricsCollector: per-request metrics
 *   - BaseConnector: abstract base composing all of the above
 *
 * ReplayTransport: records/replays HTTP for deterministic CI without
 * external API dependencies.
 */

export * from "./types";
export * from "./transport";
export * from "./auth";
export * from "./pagination";
export * from "./rate-limiter";
export * from "./retry";
export * from "./checkpoint";
export * from "./errors";
export * from "./metrics";
export * from "./connector";
export * from "./fixture-repository";
