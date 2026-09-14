/**
 * @workspace/infrastructure/connectors/manufacturers/common/types
 *
 * Shared types for the Manufacturer Connector family.
 *
 * Manufacturer connectors do NOT discover products — they enrich already-
 * consolidated CanonicalProducts with authoritative manufacturer data.
 *
 * This module is the SDK contract that all manufacturer connectors
 * (intel, amd, nvidia, asus, msi, gigabyte, kingston, corsair, samsung, wdc)
 * compose internally. It mirrors the design of the marketplace SDK:
 *   - HttpTransport, AuthProvider, retry, rate-limit (reused from core)
 *   - Plus: spec-parser, datasheet-fetcher, image-validator, ttl-cache
 *
 * The domain-facing contract (ManufacturerConnector) lives in
 * @workspace/domain/discovery/enrichment/types. This SDK module provides
 * the IMPLEMENTATION building blocks that manufacturer connectors compose
 * internally to satisfy that contract.
 */
import { ConnectorKind } from "../../core/types";
import type {
  ManufacturerCode,
  ManufacturerSource,
  ManufacturerEnrichmentRequest,
  ManufacturerCapabilities
} from "@workspace/domain/discovery/enrichment/types";

// ── Manufacturer provider ──────────────────────────────────

/**
 * Static registry of all manufacturer providers. Each manufacturer has a
 * ConnectorKind.Manufacturer and is mapped to a ManufacturerCode in the
 * domain layer.
 */
export type ManufacturerProvider =
  | "intel"
  | "amd"
  | "nvidia"
  | "asus"
  | "msi"
  | "gigabyte"
  | "kingston"
  | "corsair"
  | "samsung"
  | "wdc";

export const MANUFACTURER_PROVIDER_TO_CODE: Readonly<Record<ManufacturerProvider, ManufacturerCode>> = {
  intel: "intel",
  amd: "amd",
  nvidia: "nvidia",
  asus: "asus",
  msi: "msi",
  gigabyte: "gigabyte",
  kingston: "kingston",
  corsair: "corsair",
  samsung: "samsung",
  wdc: "wdc"
};

// ── Connector kind ─────────────────────────────────────────

export const MANUFACTURER_CONNECTOR_KIND = ConnectorKind.Manufacturer;

// ── Source metadata for manufacturer sources ───────────────

/**
 * Manufacturer sources are always primary — reliability = 100.
 * This is the maximum possible reliability score, used by the
 * EnrichmentPolicy to favor manufacturer data over marketplace data.
 */
export const MANUFACTURER_RELIABILITY_SCORE = 100;

/**
 * Source metadata block that manufacturer connectors attach to every
 * ManufacturerSource artifact they produce.
 */
export interface ManufacturerSourceMetadata {
  readonly provider: ManufacturerProvider;
  readonly providerType: typeof ConnectorKind.Manufacturer;
  readonly reliabilityScore: number; // always 100 for manufacturers
  readonly freshness: Date;
  readonly latencyMs: number;
  /** Cache TTL in seconds — manufacturer data is slow-moving, so 24h default. */
  readonly cacheTtlSeconds: number;
}

// ── Manufacturer capabilities (default) ────────────────────

/**
 * Most manufacturers publish the same kinds of data (specs, datasheets,
 * lifecycle, certifications, warranty). The default capabilities block
 * can be overridden per-connector when a manufacturer doesn't publish
 * a particular data type (e.g. AMD doesn't publish BIOS downloads for CPUs).
 */
export const DEFAULT_MANUFACTURER_CAPABILITIES: ManufacturerCapabilities = {
  supportsDatasheets: true,
  supportsDrivers: true,
  supportsBios: false,
  supportsFirmware: false,
  supportsLifecycle: true,
  supportsCertifications: true,
  supportsWarranty: true,
  supportsPhysicalSpecs: true,
  supportsCompatibility: true,
  supportsOfficialImages: true
};

// ── Parsed manufacturer spec (intermediate representation) ─

/**
 * Intermediate representation produced by the spec parser, before being
 * mapped to the domain's ManufacturerSource artifact.
 *
 * Each manufacturer has its own spec-parser that knows the shape of the
 * manufacturer's product page JSON/HTML. The parser outputs a
 * ParsedManufacturerSpec which the mapper then converts to ManufacturerSource.
 *
 * This separation mirrors the marketplace pattern:
 *   - Parser: knows the manufacturer's response shape
 *   - Mapper: knows the domain's ManufacturerSource shape
 */
export interface ParsedManufacturerSpec {
  readonly matchedMpn: string;
  readonly identifiers: {
    readonly mpn: string | null;
    readonly ean: string | null;
    readonly upc: string | null;
    readonly gtin: string | null;
    readonly family: string | null;
    readonly successorMpn: string | null;
  };
  readonly specifications: ReadonlyArray<{
    readonly name: string;
    readonly value: string;
    readonly unit: string | null;
    readonly sourceUrl: string;
    readonly confidence: number;
  }>;
  readonly lifecycle: {
    readonly status: "active" | "announced" | "end_of_life" | "discontinued" | "obsolete" | "unknown";
    readonly launchDate: string | null;
    readonly eolDate: string | null;
    readonly endOfSaleDate: string | null;
    readonly successorMpn: string | null;
    readonly sourceUrl: string;
  };
  readonly downloads: ReadonlyArray<{
    readonly kind: "datasheet" | "manual" | "driver" | "bios" | "firmware" | "certificate" | "other";
    readonly title: string;
    readonly url: string;
    readonly mimeType: string;
    readonly sizeBytes: number | null;
    readonly version: string | null;
    readonly publishedAt: string | null;
  }>;
  readonly images: ReadonlyArray<{
    readonly url: string;
    readonly kind: "primary" | "angle" | "detail" | "diagram" | "package" | "environmental";
    readonly width: number | null;
    readonly height: number | null;
  }>;
  readonly certifications: ReadonlyArray<{
    readonly name: string;
    readonly code: string | null;
    readonly issuedBy: string | null;
    readonly validUntil: string | null;
    readonly sourceUrl: string;
  }>;
  readonly warranty: {
    readonly durationMonths: number | null;
    readonly type: "limited" | "lifetime" | "extended" | "none" | "unknown";
    readonly region: string | null;
    readonly termsUrl: string | null;
  };
  readonly physical: {
    readonly lengthMm: number | null;
    readonly widthMm: number | null;
    readonly heightMm: number | null;
    readonly weightGrams: number | null;
    readonly packageContents: ReadonlyArray<string>;
  };
  readonly compatibility: ReadonlyArray<string>;
  readonly sourceUrl: string;
  readonly fetchWarnings: ReadonlyArray<string>;
}

// ── Manufacturer connector config ──────────────────────────

import type {
  HttpTransport,
  AuthProvider,
  ConnectorRateLimiter,
  ConnectorRetryPolicy,
  ConnectorMetricsCollector
} from "../../core/types";

/**
 * Configuration for a ManufacturerConnector.
 *
 * Similar to ConnectorConfig (for DiscoveryConnector) but adapted for
 * enrichment:
 *   - No pagination (enrichment is a single fetch per product)
 *   - Cache is mandatory (manufacturer data is slow-moving)
 *   - Datasheet fetcher is optional (only if manufacturer publishes PDFs)
 */
export interface ManufacturerConnectorConfig {
  readonly provider: ManufacturerProvider;
  readonly transport: HttpTransport;
  readonly auth: AuthProvider;
  readonly rateLimiter: ConnectorRateLimiter;
  readonly retryPolicy: ConnectorRetryPolicy;
  readonly timeoutMs: number;
  /** Base URL for the manufacturer's API or website. */
  readonly apiBaseUrl: string;
  /** Cache instance (shared TTL cache). */
  readonly cache: ManufacturerCache;
  /** Optional datasheet fetcher (downloads PDFs to ObjectStorage). */
  readonly datasheetFetcher?: DatasheetFetcher;
  /** Optional image validator (fingerprints and validates official images). */
  readonly imageValidator?: ImageValidator;
  /** Optional metrics collector. */
  readonly metrics?: ConnectorMetricsCollector;
}

// ── Cache ──────────────────────────────────────────────────

/**
 * TTL cache for manufacturer sources. Keyed by (provider, mpn).
 *
 * Manufacturer data is slow-moving (specs rarely change), so a 24-hour TTL
 * is the default. The cache is shared across all manufacturer connectors
 * to allow cross-manufacturer deduplication of identical MPNs.
 */
export interface ManufacturerCache {
  get(provider: ManufacturerProvider, mpn: string): Promise<ManufacturerSource | null>;
  set(provider: ManufacturerProvider, mpn: string, source: ManufacturerSource): Promise<void>;
  delete(provider: ManufacturerProvider, mpn: string): Promise<void>;
  clear(): Promise<void>;
  readonly size: number;
}

// ── Datasheet fetcher ──────────────────────────────────────

/**
 * Downloads manufacturer datasheets to ObjectStorage and returns the
 * object key. This decouples datasheet hosting from the manufacturer's
 * CDN (which may rate-limit or expire URLs).
 */
export interface DatasheetFetcher {
  fetch(url: string, mimeType: string): Promise<{
    objectKey: string;
    sizeBytes: number;
    sha256: string;
  }>;
}

// ── Image validator ────────────────────────────────────────

/**
 * Validates official manufacturer images. Computes a perceptual
 * fingerprint (phash) so duplicate images can be deduplicated.
 */
export interface ImageValidator {
  validate(url: string): Promise<{
    fingerprint: { algorithm: string; version: string; value: string };
    width: number | null;
    height: number | null;
    format: string | null;
  }>;
}

// ── Re-exports ─────────────────────────────────────────────

export type {
  ManufacturerCode,
  ManufacturerSource,
  ManufacturerEnrichmentRequest,
  ManufacturerCapabilities
};
