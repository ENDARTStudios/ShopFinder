/**
 * @workspace/integrations
 *
 * Supplier + manufacturer adapters (eBay, DigiKey, Amazon, AliExpress, ...)
 * with hybrid Transport layer (FetchTransport + ReplayTransport).
 *
 * ## Top-level exports
 *   - `transports/` — Transport contract + FetchTransport + ReplayTransport
 *   - `connectors/` — concrete connector classes (EbayConnector, ...)
 *
 * Each connector follows the same pattern:
 *   1. Constructor reads credentials from env vars.
 *   2. If credentials present → use FetchTransport (live mode).
 *   3. If credentials missing → fall back to ReplayTransport (sandbox mode).
 *   4. Exposes a `mode` field ("live" | "replay") so callers can show the
 *      operator which connectors are active.
 */

export const PACKAGE_NAME = "@workspace/integrations" as const;
export const PACKAGE_VERSION = "0.2.0" as const;

export * from "./transports";
export * from "./connectors";
