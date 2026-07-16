/**
 * @workspace/infrastructure/connectors/manufacturers/intel/parser
 *
 * Intel Ark JSON response parser.
 *
 * Intel Ark returns a JSON document with a flat list of product specs.
 * Each spec is a { Label, Value } pair. The parser converts this into a
 * ParsedIntelArkSpec intermediate representation, which the mapper then
 * converts to ParsedManufacturerSpec.
 *
 * The parser handles:
 *   - Intel Ark JSON shape: { Product: { ProductName, ProductCode, Specs: [...] } }
 *   - 404 responses (MPN not found)
 *   - Error responses (rate limit, server error)
 */
import type { HttpResponse } from "../../core/types";
import type { ConnectorError } from "../../core/types";
import { fromHttpStatus } from "../../core/errors";

// ── Parsed types ───────────────────────────────────────────

export interface IntelArkSpec {
  readonly label: string;
  readonly value: string;
  readonly unit: string | null;
}

export interface IntelArkDownload {
  readonly title: string;
  readonly url: string;
  readonly type: string; // "Datasheet", "Manual", "Driver", etc.
  readonly version: string | null;
  readonly publishedDate: string | null;
}

export interface IntelArkImage {
  readonly url: string;
  readonly alt: string;
  readonly width: number | null;
  readonly height: number | null;
}

export interface ParsedIntelArkSpec {
  readonly found: boolean;
  readonly productName: string | null;
  readonly productCode: string | null; // MPN
  readonly family: string | null;
  readonly launchDate: string | null;
  readonly eolDate: string | null;
  readonly status: string | null; // "Launched", "End of Life", etc.
  readonly successorCode: string | null;
  readonly specs: ReadonlyArray<IntelArkSpec>;
  readonly downloads: ReadonlyArray<IntelArkDownload>;
  readonly images: ReadonlyArray<IntelArkImage>;
  readonly sourceUrl: string;
}

// ── Parser ─────────────────────────────────────────────────

export class IntelArkParser {
  parse(response: HttpResponse): ParsedIntelArkSpec {
    if (response.status === 404) {
      return {
        found: false,
        productName: null,
        productCode: null,
        family: null,
        launchDate: null,
        eolDate: null,
        status: null,
        successorCode: null,
        specs: [],
        downloads: [],
        images: [],
        sourceUrl: response.url ?? ""
      };
    }

    if (response.status >= 400) {
      throw this.parseError(response);
    }

    const json = this.safeParseJson(response.body);
    const product = this.extractField(json, "Product") ?? json;

    const productName = String(this.extractField(product, "ProductName") ?? "");
    const productCode = String(this.extractField(product, "ProductCode") ?? "");
    const family = String(this.extractField(product, "ProductFamily") ?? "");
    const launchDate = String(this.extractField(product, "LaunchDate") ?? "") || null;
    const eolDate = String(this.extractField(product, "EndOfLifeDate") ?? "") || null;
    const status = String(this.extractField(product, "ProductStatus") ?? "") || null;
    const successorCode = String(this.extractField(product, "SuccessorProductCode") ?? "") || null;

    const specsRaw = this.extractField(product, "Specifications") as Array<Record<string, unknown>> | undefined;
    const specs: IntelArkSpec[] = [];
    if (Array.isArray(specsRaw)) {
      for (const item of specsRaw) {
        const label = String(item.Label ?? item.label ?? "");
        const value = String(item.Value ?? item.value ?? "");
        if (label && value) {
          const unit = this.extractUnit(value);
          specs.push({
            label,
            value: unit ? value.replace(unit, "").trim() : value,
            unit
          });
        }
      }
    }

    const downloadsRaw = this.extractField(product, "Downloads") as Array<Record<string, unknown>> | undefined;
    const downloads: IntelArkDownload[] = [];
    if (Array.isArray(downloadsRaw)) {
      for (const item of downloadsRaw) {
        const title = String(item.Title ?? item.title ?? "");
        const url = String(item.URL ?? item.url ?? item.Link ?? "");
        if (title && url) {
          downloads.push({
            title,
            url,
            type: String(item.Type ?? item.type ?? "other"),
            version: item.Version ? String(item.Version) : null,
            publishedDate: item.Date ? String(item.Date) : null
          });
        }
      }
    }

    const imagesRaw = this.extractField(product, "Images") as Array<Record<string, unknown>> | undefined;
    const images: IntelArkImage[] = [];
    if (Array.isArray(imagesRaw)) {
      for (const item of imagesRaw) {
        const url = String(item.URL ?? item.url ?? "");
        if (url) {
          images.push({
            url,
            alt: String(item.Alt ?? item.alt ?? ""),
            width: item.Width ? Number(item.Width) : null,
            height: item.Height ? Number(item.Height) : null
          });
        }
      }
    }

    return {
      found: true,
      productName: productName || null,
      productCode: productCode || null,
      family: family || null,
      launchDate,
      eolDate,
      status,
      successorCode,
      specs,
      downloads,
      images,
      sourceUrl: response.url ?? ""
    };
  }

  parseError(response: HttpResponse): ConnectorError {
    if (response.status === 401 || response.status === 403) {
      return {
        code: "AUTH",
        message: `Intel auth failed: ${response.status}`,
        retriable: false,
        statusCode: response.status
      };
    }
    try {
      const json = JSON.parse(response.body);
      return {
        code: response.status === 429 ? "RATE_LIMIT" : "INTEL_API_ERROR",
        message: json?.message ?? `Intel API error: ${response.status}`,
        retriable: response.status === 429 || response.status >= 500,
        statusCode: response.status
      };
    } catch {
      return fromHttpStatus(response.status, response.body, "intel");
    }
  }

  private safeParseJson(body: string): unknown {
    try {
      return JSON.parse(body);
    } catch {
      throw {
        code: "INVALID_RESPONSE",
        message: `Failed to parse Intel Ark response: ${body.slice(0, 200)}`,
        retriable: false
      } as ConnectorError;
    }
  }

  /**
   * Extract a field from a record, case-insensitively.
   * Intel Ark sometimes uses PascalCase, sometimes camelCase.
   */
  private extractField(obj: unknown, fieldName: string): unknown {
    if (!obj || typeof obj !== "object") return undefined;
    const rec = obj as Record<string, unknown>;
    if (fieldName in rec) return rec[fieldName];
    const lower = fieldName.toLowerCase();
    for (const key of Object.keys(rec)) {
      if (key.toLowerCase() === lower) return rec[key];
    }
    return undefined;
  }

  /**
   * Extract a unit suffix from a spec value.
   *   "125 W"        → "W"
   *   "3.2 GHz"      → "GHz"
   *   "100 °C"       → "°C"
   *   "LGA1700"      → null
   */
  private extractUnit(value: string): string | null {
    const match = value.match(/\s([A-Za-z°]+)$/);
    return match ? match[1]! : null;
  }
}
