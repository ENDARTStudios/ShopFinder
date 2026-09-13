/**
 * @workspace/infrastructure/connectors/ebay
 *
 * eBay Browse API Connector.
 *
 * Modules:
 *   auth.ts       — OAuth2 client credentials flow
 *   pagination.ts — Offset-based pagination
 *   parser.ts     — Browse API search response parsing
 *   mapper.ts     — ParsedEbayItem → NormalizedDiscoveredProduct
 *   connector.ts  — EbayConnector (coordinates auth + transport + parser + mapper)
 *   fixtures/     — Recorded API responses for ReplayTransport
 */

export * from "./auth";
export * from "./pagination";
export * from "./parser";
export * from "./mapper";
export * from "./connector";
