/**
 * @workspace/infrastructure/connectors/manufacturers/common
 *
 * Shared abstractions for the Manufacturer Connector family.
 *
 * These contracts are SHARED across all manufacturer connectors
 * (intel, amd, nvidia, asus, msi, gigabyte, kingston, corsair, samsung, wdc).
 * Each connector implements ManufacturerConnector (from the domain) using
 * the SDK building blocks defined here:
 *
 *   - ManufacturerConnectorConfig — transport + auth + cache + retry + rate-limit
 *   - BaseManufacturerConnector  — abstract base composing all of the above
 *   - ManufacturerCache           — TTL cache (in-memory default, Redis swappable)
 *   - DatasheetFetcher            — downloads PDFs to ObjectStorage
 *   - ImageValidator              — fingerprints official images
 *   - spec-parser helpers         — parseNumericSpec, normalizeSpecName, etc.
 *
 * The domain's ManufacturerConnector interface (in
 * @workspace/domain/discovery/enrichment/types) is the BEHAVIOR contract.
 * These SDK contracts are the IMPLEMENTATION building blocks.
 */

export * from "./types";
export * from "./cache";
export * from "./spec-parser";
export * from "./datasheet-fetcher";
export * from "./image-validator";
export * from "./base-manufacturer-connector";
