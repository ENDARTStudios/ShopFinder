/**
 * @workspace/infrastructure/connectors/manufacturers/intel
 *
 * Intel Ark API Connector.
 * First ConnectorKind.Manufacturer — validates SDK with manufacturer data:
 *   - Official specifications (cores, frequency, TDP, socket, memory)
 *   - Datasheets (PDF downloads from cdrdv2.intel.com)
 *   - Lifecycle (launched, end-of-life, successor)
 *   - Certifications (RoHS, CE, FCC)
 *   - Warranty (3-year limited)
 *   - Physical specs (dimensions, weight, package contents)
 *   - Compatibility (socket, chipset)
 *   - Official identifiers (MPN, EAN, GTIN)
 *
 * Modules:
 *   auth.ts       — API key auth (Intel Developer API key in X-Intel-API-Key header)
 *   parser.ts     — Intel Ark JSON response parser
 *   mapper.ts     — ParsedIntelArkSpec → ParsedManufacturerSpec
 *   connector.ts  — IntelConnector (extends BaseManufacturerConnector)
 *   fixtures/     — Real Intel Ark responses (i9-14900K, Core Ultra 9 285K)
 */

export * from "./auth";
export * from "./parser";
export * from "./mapper";
export * from "./connector";
