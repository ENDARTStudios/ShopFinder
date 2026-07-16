/**
 * @workspace/infrastructure/connectors/manufacturers/amd/parser
 *
 * AMD Product Master API response parser.
 *
 * AMD's API returns specs grouped by CATEGORY, unlike Intel's flat list:
 *
 *   {
 *     "Product": {
 *       "ProductCode": "100-100000514WOF",
 *       "ProductName": "AMD Ryzen 9 7950X",
 *       "ProductFamily": "AMD Ryzen 9 Desktop Processors",
 *       "ProductStatus": "Active",
 *       "LaunchDate": "2022-09-27",
 *       "EndOfLifeDate": null,
 *       "SuccessorProductCode": null,
 *       "Categories": [
 *         {
 *           "CategoryName": "General Specifications",
 *           "Specifications": [
 *             { "Name": "# of CPU Cores", "Value": "16" },
 *             { "Name": "# of Threads", "Value": "32" },
 *             { "Name": "Base Clock", "Value": "4.5 GHz" },
 *             ...
 *           ]
 *         },
 *         {
 *           "CategoryName": "Memory Specifications",
 *           "Specifications": [...]
 *         },
 *         ...
 *       ],
 *       "Downloads": [...],
 *       "Images": [...]
 *     }
 *   }
 *
 * The parser flattens the category-grouped specs into a single list of
 * ParsedAmdProductSpec entries (carrying the category for context).
 */
import type { HttpResponse } from "../../core/types";
import type { ConnectorError } from "../../core/types";
import { fromHttpStatus } from "../../core/errors";

// ── Parsed types ───────────────────────────────────────────

export interface AmdSpec {
  readonly name: string;
  readonly value: string;
  readonly unit: string | null;
  readonly category: string;
}

export interface AmdDownload {
  readonly title: string;
  readonly url: string;
  readonly type: string;
  readonly version: string | null;
  readonly publishedDate: string | null;
}

export interface AmdImage {
  readonly url: string;
  readonly alt: string;
  readonly width: number | null;
  readonly height: number | null;
}

export interface ParsedAmdProductSpec {
  readonly found: boolean;
  readonly productName: string | null;
  readonly productCode: string | null; // AMD OPN (Ordering Part Number) — equivalent to MPN
  readonly productFamily: string | null;
  readonly launchDate: string | null;
  readonly eolDate: string | null;
  readonly status: string | null;
  readonly successorCode: string | null;
  readonly specs: ReadonlyArray<AmdSpec>;
  readonly downloads: ReadonlyArray<AmdDownload>;
  readonly images: ReadonlyArray<AmdImage>;
  readonly sourceUrl: string;
}

// ── Parser ─────────────────────────────────────────────────

export class AmdProductParser {
  parse(response: HttpResponse): ParsedAmdProductSpec {
    if (response.status === 404) {
      return this.emptySpec(response.url ?? "");
    }

    if (response.status >= 400) {
      throw this.parseError(response);
    }

    const json = this.safeParseJson(response.body);
    const product = this.extractField(json, "Product") ?? json;

    const productName = String(this.extractField(product, "ProductName") ?? "");
    const productCode = String(this.extractField(product, "ProductCode") ?? "");
    const productFamily = String(this.extractField(product, "ProductFamily") ?? "");
    const launchDate = String(this.extractField(product, "LaunchDate") ?? "") || null;
    const eolDate = String(this.extractField(product, "EndOfLifeDate") ?? "") || null;
    const status = String(this.extractField(product, "ProductStatus") ?? "") || null;
    const successorCode = String(this.extractField(product, "SuccessorProductCode") ?? "") || null;

    // Categories → flatten specs
    const categoriesRaw = this.extractField(product, "Categories") as Array<Record<string, unknown>> | undefined;
    const specs: AmdSpec[] = [];
    if (Array.isArray(categoriesRaw)) {
      for (const cat of categoriesRaw) {
        const categoryName = String(cat.CategoryName ?? cat.categoryName ?? "");
        const catSpecs = cat.Specifications ?? cat.specifications;
        if (!Array.isArray(catSpecs)) continue;
        for (const item of catSpecs) {
          const name = String(item.Name ?? item.name ?? "");
          const value = String(item.Value ?? item.value ?? "");
          if (name && value) {
            const unit = this.extractUnit(value);
            specs.push({
              name,
              value: unit ? value.replace(unit, "").trim() : value,
              unit,
              category: categoryName
            });
          }
        }
      }
    }

    // Downloads
    const downloadsRaw = this.extractField(product, "Downloads") as Array<Record<string, unknown>> | undefined;
    const downloads: AmdDownload[] = [];
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

    // Images
    const imagesRaw = this.extractField(product, "Images") as Array<Record<string, unknown>> | undefined;
    const images: AmdImage[] = [];
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
      productFamily: productFamily || null,
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

  private emptySpec(sourceUrl: string): ParsedAmdProductSpec {
    return {
      found: false,
      productName: null,
      productCode: null,
      productFamily: null,
      launchDate: null,
      eolDate: null,
      status: null,
      successorCode: null,
      specs: [],
      downloads: [],
      images: [],
      sourceUrl
    };
  }

  parseError(response: HttpResponse): ConnectorError {
    if (response.status === 401 || response.status === 403) {
      return {
        code: "AUTH",
        message: `AMD auth failed: ${response.status}`,
        retriable: false,
        statusCode: response.status
      };
    }
    try {
      const json = JSON.parse(response.body);
      return {
        code: response.status === 429 ? "RATE_LIMIT" : "AMD_API_ERROR",
        message: json?.message ?? `AMD API error: ${response.status}`,
        retriable: response.status === 429 || response.status >= 500,
        statusCode: response.status
      };
    } catch {
      return fromHttpStatus(response.status, response.body, "amd");
    }
  }

  private safeParseJson(body: string): unknown {
    try {
      return JSON.parse(body);
    } catch {
      throw {
        code: "INVALID_RESPONSE",
        message: `Failed to parse AMD Product Master response: ${body.slice(0, 200)}`,
        retriable: false
      } as ConnectorError;
    }
  }

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

  private extractUnit(value: string): string | null {
    const match = value.match(/\s([A-Za-z°/]+)$/);
    return match ? match[1]! : null;
  }
}
