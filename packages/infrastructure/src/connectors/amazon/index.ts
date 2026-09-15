/**
 * @workspace/infrastructure/connectors/amazon
 *
 * Amazon SP-API Connector — Catalog Items API.
 *
 * Modules:
 *   auth.ts       — LWA OAuth2 + AWS SigV4 signing
 *   pagination.ts — NextToken cursor pagination
 *   parser.ts     — Catalog Items API response parsing
 *   mapper.ts     — ParsedAmazonCatalogItem → NormalizedDiscoveredProduct
 *   errors.ts     — Amazon-specific error helpers
 *   connector.ts  — AmazonConnector (coordinates auth + transport + parser + mapper)
 *   fixtures/     — Recorded API responses for ReplayTransport (CI without API)
 */

export * from "./auth";
export * from "./pagination";
export * from "./parser";
export * from "./mapper";
export * from "./errors";
export * from "./connector";
