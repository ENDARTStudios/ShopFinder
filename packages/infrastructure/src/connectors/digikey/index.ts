/**
 * @workspace/infrastructure/connectors/digikey
 *
 * DigiKey Product Search API Connector.
 * First ConnectorKind.Distributor — validates SDK with distributor data.
 *
 * Modules:
 *   auth.ts       — OAuth2 client credentials
 *   pagination.ts — Offset-based pagination (TotalCount + Count + Offset)
 *   parser.ts     — Product Search API response parsing
 *   mapper.ts     — ParsedDigiKeyProduct → NormalizedDiscoveredProduct
 *   connector.ts  — DigiKeyConnector (extends BaseConnector, POST body search)
 *   fixtures/     — Real component data (STM32 MCU, TI boost regulator, Samsung cap)
 */

export * from "./auth";
export * from "./pagination";
export * from "./parser";
export * from "./mapper";
export * from "./connector";
export * from "./client";
