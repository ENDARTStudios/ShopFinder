/**
 * @workspace/infrastructure/connectors/aliexpress
 *
 * AliExpress Connector — complete implementation using Connector SDK.
 *
 * Modules:
 *   auth.ts     — HMAC-MD5 signature (Top API protocol)
 *   parser.ts   — TopApiResponseParser (raw API JSON → ParsedAliExpressProduct)
 *   mapper.ts   — ProductMapper (ParsedAliExpressProduct → NormalizedDiscoveredProduct)
 *   connector.ts — AliExpressConnector (coordinates auth + transport + parser + mapper)
 *   fixtures/   — Recorded API responses for ReplayTransport (CI without API)
 */

export * from "./auth";
export * from "./parser";
export * from "./mapper";
export * from "./connector";
