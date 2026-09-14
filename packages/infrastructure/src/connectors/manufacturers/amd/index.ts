/**
 * @workspace/infrastructure/connectors/manufacturers/amd
 *
 * AMD Product Master API Connector.
 * Second ConnectorKind.Manufacturer — validates that the `common/` SDK
 * works for a second manufacturer with a DIFFERENT API shape:
 *
 *   - Intel Ark:  flat list of {Label, Value} specs
 *   - AMD Master: specs grouped by category (General, Memory, Graphics, ...)
 *
 * Despite the shape difference, both connectors reuse the same
 * BaseManufacturerConnector, ManufacturerCache, DatasheetFetcher,
 * ImageValidator, and spec-parser helpers. Only auth + parser + mapper
 * are AMD-specific.
 *
 * Modules:
 *   auth.ts       — API key auth (X-AMD-API-Key header)
 *   parser.ts     — AMD Product Master JSON response parser (category-grouped)
 *   mapper.ts     — ParsedAmdProductSpec → ParsedManufacturerSpec
 *   connector.ts  — AmdConnector (extends BaseManufacturerConnector)
 *   fixtures/     — Real AMD responses (Ryzen 9 7950X, EPYC 9654)
 */

export * from "./auth";
export * from "./parser";
export * from "./mapper";
export * from "./connector";
