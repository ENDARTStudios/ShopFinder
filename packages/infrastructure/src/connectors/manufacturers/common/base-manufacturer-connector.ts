/**
 * @workspace/infrastructure/connectors/manufacturers/common/base-manufacturer-connector
 *
 * BaseManufacturerConnector — abstract base class for manufacturer connectors.
 *
 * Composes transport, auth, rate-limiter, retry, cache, and (optional)
 * datasheet-fetcher + image-validator.
 *
 * Concrete connectors (IntelConnector, AmdConnector, etc.) extend this
 * class and implement:
 *   - buildEnrichRequest(request): HttpRequest  — build the API call
 *   - parseSpec(response): ParsedManufacturerSpec  — parse manufacturer's response
 *
 * The base class handles:
 *   - Auth injection
 *   - Rate limiting
 *   - Retry with backoff
 *   - Cache lookup (before fetch) and write (after fetch)
 *   - Mapping ParsedManufacturerSpec → ManufacturerSource artifact
 *   - Optional: datasheet download + image fingerprinting
 *   - Metrics collection
 *
 * Unlike BaseConnector (which yields pages), ManufacturerConnector returns
 * a single artifact per call. The cache short-circuits repeat calls for
 * the same (provider, mpn).
 */
import type { ManufacturerConnectorConfig, ParsedManufacturerSpec } from "./types";
import type {
  ManufacturerSource,
  ManufacturerConnector,
  ManufacturerEnrichmentRequest,
  ManufacturerCapabilities,
  ManufacturerCode,
  ManufacturerSourceId
} from "@workspace/domain/discovery/enrichment/types";
import type {
  HttpRequest,
  HttpResponse,
  ConnectorError
} from "../../core/types";
import { toConnectorError } from "../../core/retry";
import { fromHttpStatus } from "../../core/errors";
import { createConnectorMetricsCollector } from "../../core/metrics";
import type { ConnectorMetricsCollector } from "../../core/types";
import { matchMpn } from "./spec-parser";

let _seq = 0;
function nextManufacturerSourceId(): ManufacturerSourceId {
  _seq += 1;
  return `msrc_${Date.now()}_${_seq}` as unknown as ManufacturerSourceId;
}

export abstract class BaseManufacturerConnector implements ManufacturerConnector {
  abstract readonly manufacturer: ManufacturerCode;
  abstract readonly providerVersion: string;
  abstract readonly capabilities: ManufacturerCapabilities;

  protected readonly config: ManufacturerConnectorConfig;
  protected readonly metrics: ConnectorMetricsCollector;

  constructor(config: ManufacturerConnectorConfig) {
    this.config = config;
    this.metrics = config.metrics ?? createConnectorMetricsCollector();
  }

  /**
   * Build the HTTP request to fetch the manufacturer's product page for
   * the given MPN/identifier.
   */
  protected abstract buildEnrichRequest(request: ManufacturerEnrichmentRequest): HttpRequest;

  /**
   * Parse the manufacturer's HTTP response into a ParsedManufacturerSpec.
   * Concrete connectors implement this (manufacturer-specific JSON/HTML).
   */
  protected abstract parseSpec(response: HttpResponse): ParsedManufacturerSpec;

  /**
   * Enrich a CanonicalProduct's identification into a ManufacturerSource.
   *
   * Flow:
   *   1. Cache lookup by (provider, mpn) — return immediately if hit
   *   2. Build HTTP request, authenticate, rate-limit, retry-execute
   *   3. Parse response into ParsedManufacturerSpec
   *   4. Map ParsedManufacturerSpec → ManufacturerSource artifact
   *   5. (Optional) Download datasheets via datasheetFetcher
   *   6. (Optional) Fingerprint images via imageValidator
   *   7. Write to cache
   *   8. Return artifact
   */
  async enrich(request: ManufacturerEnrichmentRequest): Promise<ManufacturerSource> {
    // 1. Cache lookup
    if (request.mpn) {
      const cached = await this.config.cache.get(this.config.provider, request.mpn);
      if (cached) {
        // Return a fresh artifact with new id but same data — caching is data-level
        return { ...cached, id: nextManufacturerSourceId() };
      }
    }

    // 2. Build & execute request
    const start = Date.now();
    let httpRequest = this.buildEnrichRequest(request);
    httpRequest = { ...httpRequest, timeoutMs: this.config.timeoutMs };
    httpRequest = await this.config.auth.authenticate(httpRequest);
    await this.config.rateLimiter.acquire();

    let response: HttpResponse;
    try {
      response = await this.executeWithRetry(httpRequest);
    } catch (err) {
      const error = err as ConnectorError;
      // 404 → not_found; everything else → error
      const status: "not_found" | "error" = error.statusCode === 404 ? "not_found" : "error";
      return this.buildErrorSource(request, error.message ?? "fetch failed", status);
    }

    const fetchLatency = Date.now() - start;
    this.metrics.recordRequest(fetchLatency, response.status < 400);

    // 3. Handle 404 → not_found
    if (response.status === 404) {
      return this.buildErrorSource(request, `MPN ${request.mpn} not found`, "not_found");
    }

    // 4. Parse
    let parsed: ParsedManufacturerSpec;
    try {
      parsed = this.parseSpec(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.buildErrorSource(request, `Parse error: ${message}`, "error");
    }

    // 5. Match MPN (manufacturer may return a different MPN than requested)
    const matchedMpn = matchMpn(request.mpn, parsed.matchedMpn, undefined);
    if (!matchedMpn) {
      return this.buildErrorSource(
        request,
        `Manufacturer returned MPN ${parsed.matchedMpn} does not match requested ${request.mpn}`,
        "not_found"
      );
    }

    // 6. Build artifact
    const source = await this.buildSource(request, parsed, matchedMpn, fetchLatency);

    // 7. Write to cache
    if (request.mpn) {
      await this.config.cache.set(this.config.provider, request.mpn, source);
    }

    return source;
  }

  /**
   * Map a ParsedManufacturerSpec into a ManufacturerSource artifact.
   * Subclasses can override to add manufacturer-specific enrichment.
   */
  protected async buildSource(
    request: ManufacturerEnrichmentRequest,
    parsed: ParsedManufacturerSpec,
    matchedMpn: string,
    fetchLatencyMs: number
  ): Promise<ManufacturerSource> {
    // Optionally fingerprint images
    const images = await Promise.all(
      parsed.images.map(async (img) => {
        if (this.config.imageValidator) {
          const validated = await this.config.imageValidator.validate(img.url);
          return {
            url: img.url,
            kind: img.kind,
            width: img.width ?? validated.width,
            height: img.height ?? validated.height,
            fingerprint: validated.fingerprint
          };
        }
        return {
          url: img.url,
          kind: img.kind,
          width: img.width,
          height: img.height,
          fingerprint: {
            algorithm: "sha256-url",
            version: "v1",
            value: img.url // fallback: URL itself (no dedup)
          }
        };
      })
    );

    // Optionally download datasheets
    const downloads = await Promise.all(
      parsed.downloads.map(async (dl) => {
        if (this.config.datasheetFetcher && dl.kind === "datasheet") {
          try {
            const fetched = await this.config.datasheetFetcher.fetch(dl.url, dl.mimeType);
            return {
              ...dl,
              url: fetched.objectKey, // replace manufacturer URL with object key
              sizeBytes: fetched.sizeBytes
            };
          } catch {
            // Keep original URL if fetch fails
            return dl;
          }
        }
        return dl;
      })
    );

    return {
      id: nextManufacturerSourceId(),
      canonicalProductId: "" as never, // filled in by the EnrichmentCoordinator
      manufacturer: this.manufacturer,
      matchedMpn,
      identifiers: parsed.identifiers,
      specifications: parsed.specifications,
      lifecycle: parsed.lifecycle,
      downloads,
      images,
      certifications: parsed.certifications,
      warranty: parsed.warranty,
      physical: parsed.physical,
      compatibility: parsed.compatibility,
      fetchStatus: parsed.fetchWarnings.length > 0 ? "partial" : "ok",
      fetchWarnings: parsed.fetchWarnings,
      fetchedAt: new Date(),
      sourceUrl: parsed.sourceUrl,
      schemaVersion: "1.0.0"
    };
  }

  /**
   * Build an error/not_found ManufacturerSource.
   * Used when the fetch fails, the MPN doesn't match, or parsing errors.
   */
  protected buildErrorSource(
    request: ManufacturerEnrichmentRequest,
    message: string,
    status: "not_found" | "error"
  ): ManufacturerSource {
    return {
      id: nextManufacturerSourceId(),
      canonicalProductId: "" as never,
      manufacturer: this.manufacturer,
      matchedMpn: request.mpn ?? "",
      identifiers: {
        mpn: request.mpn,
        ean: null,
        upc: null,
        gtin: null,
        family: null,
        successorMpn: null
      },
      specifications: [],
      lifecycle: {
        status: "unknown",
        launchDate: null,
        eolDate: null,
        endOfSaleDate: null,
        successorMpn: null,
        sourceUrl: ""
      },
      downloads: [],
      images: [],
      certifications: [],
      warranty: {
        durationMonths: null,
        type: "unknown",
        region: null,
        termsUrl: null
      },
      physical: {
        lengthMm: null,
        widthMm: null,
        heightMm: null,
        weightGrams: null,
        packageContents: []
      },
      compatibility: [],
      fetchStatus: status,
      fetchWarnings: [message],
      fetchedAt: new Date(),
      sourceUrl: "",
      schemaVersion: "1.0.0"
    };
  }

  /**
   * Execute an HTTP request with retry logic. Same pattern as BaseConnector.
   */
  private async executeWithRetry(request: HttpRequest): Promise<HttpResponse> {
    let attempt = 0;
    let lastError: ConnectorError | null = null;

    while (attempt < this.config.retryPolicy.maxAttempts) {
      attempt++;

      try {
        const response = await this.config.transport.execute(request);
        this.metrics.recordRequest(0, response.status < 400);

        if (response.status >= 400) {
          const error = fromHttpStatus(response.status, response.body, request.url);
          lastError = error;

          if (this.config.retryPolicy.shouldRetry(attempt, error)) {
            this.metrics.recordRetry();
            const delay = this.config.retryPolicy.getDelay(attempt);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          throw error;
        }

        return response;
      } catch (error) {
        const connectorError = (error as ConnectorError).code
          ? (error as ConnectorError)
          : toConnectorError(error);
        lastError = connectorError;
        this.metrics.recordRequest(0, false);

        if (this.config.retryPolicy.shouldRetry(attempt, connectorError)) {
          this.metrics.recordRetry();
          const delay = this.config.retryPolicy.getDelay(attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw connectorError;
      }
    }

    throw lastError ?? { code: "UNKNOWN", message: "Exhausted retries", retriable: false };
  }

  getMetrics() {
    return this.metrics.snapshot();
  }
}
