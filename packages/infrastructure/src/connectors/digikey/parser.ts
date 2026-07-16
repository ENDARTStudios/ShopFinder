/**
 * @workspace/infrastructure/connectors/digikey/parser
 *
 * DigiKey Product Search API response parser.
 * Parses raw JSON into ParsedDigiKeyProduct (intermediate representation).
 */
import type { HttpResponse } from "../core/types";
import type { ConnectorError } from "../core/types";
import { fromHttpStatus } from "../core/errors";

// ── Parsed types ───────────────────────────────────────────

export interface ParsedDigiKeyProduct {
  readonly digiKeyPartNumber: string;
  readonly manufacturerPartNumber: string;
  readonly manufacturerName: string;
  readonly manufacturerId?: number;
  readonly productDescription: string;
  readonly detailedDescription: string;
  readonly productUrl?: string;
  readonly primaryPhotoUrl?: string;
  readonly primaryDatasheetUrl?: string;
  readonly unitPrice?: number;
  readonly currency?: string;
  readonly quantityAvailable?: number;
  readonly minimumOrderQuantity?: number;
  readonly productStatus?: string; // Active, Obsolete, Discontinued
  readonly rohsStatus?: string;
  readonly leadStatus?: string;
  readonly customTariffNumber?: string;
  readonly parameters?: Array<{
    parameterName: string;
    parameterValue: string;
  }>;
  readonly category?: string;
  readonly subcategory?: string;
  readonly series?: string;
}

export interface ParsedDigiKeyPage {
  readonly products: ReadonlyArray<ParsedDigiKeyProduct>;
  readonly totalCount: number;
  readonly count: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

// ── Parser ─────────────────────────────────────────────────

export class DigiKeyParser {
  parse(response: HttpResponse): ParsedDigiKeyPage {
    if (response.status >= 400) {
      throw this.parseError(response);
    }

    const json = this.safeParseJson(response.body);

    const productsRaw = json?.Products?.Products ?? [];
    const products: ParsedDigiKeyProduct[] = [];

    for (const raw of productsRaw) {
      const parsed = this.mapProduct(raw);
      if (parsed) products.push(parsed);
    }

    const totalCount = Number(json?.Products?.TotalCount ?? 0);
    const count = Number(json?.Products?.Count ?? 0);
    const offset = Number(json?.Products?.Offset ?? 0);
    const hasMore = offset + count < totalCount;

    return { products, totalCount, count, offset, hasMore };
  }

  parseError(response: HttpResponse): ConnectorError {
    if (response.status === 401 || response.status === 403) {
      return { code: "AUTH", message: `DigiKey auth failed: ${response.status}`, retriable: false, statusCode: response.status };
    }
    try {
      const json = JSON.parse(response.body);
      return {
        code: response.status === 429 ? "RATE_LIMIT" : "DIGIKEY_API_ERROR",
        message: json?.message ?? `DigiKey API error: ${response.status}`,
        retriable: response.status === 429 || response.status >= 500,
        statusCode: response.status,
      };
    } catch {
      return fromHttpStatus(response.status, response.body, "digikey");
    }
  }

  private safeParseJson(body: string): unknown {
    try { return JSON.parse(body); }
    catch { throw { code: "INVALID_RESPONSE", message: `Failed to parse DigiKey response: ${body.slice(0, 200)}`, retriable: false } as ConnectorError; }
  }

  private mapProduct(raw: unknown): ParsedDigiKeyProduct | null {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;

    const dkpn = String(item.DigiKeyPartNumber ?? "");
    if (!dkpn) return null;

    const parametersRaw = item.Parameters as Array<Record<string, unknown>> | undefined;
    const parameters = Array.isArray(parametersRaw)
      ? parametersRaw.map(p => ({
          parameterName: String(p.ParameterName ?? ""),
          parameterValue: String(p.ParameterValue ?? ""),
        }))
      : undefined;

    return {
      digiKeyPartNumber: dkpn,
      manufacturerPartNumber: String(item.ManufacturerPartNumber ?? ""),
      manufacturerName: String(item.ManufacturerName ?? ""),
      manufacturerId: item.ManufacturerId ? Number(item.ManufacturerId) : undefined,
      productDescription: String(item.ProductDescription ?? ""),
      detailedDescription: String(item.DetailedDescription ?? ""),
      productUrl: item.ProductUrl ? String(item.ProductUrl) : undefined,
      primaryPhotoUrl: item.PrimaryPhotoUrl ? String(item.PrimaryPhotoUrl) : undefined,
      primaryDatasheetUrl: item.PrimaryDatasheetUrl ? String(item.PrimaryDatasheetUrl) : undefined,
      unitPrice: item.UnitPrice ? Number(item.UnitPrice) : undefined,
      currency: item.Currency ? String(item.Currency) : undefined,
      quantityAvailable: item.QuantityAvailable ? Number(item.QuantityAvailable) : undefined,
      minimumOrderQuantity: item.MinimumOrderQuantity ? Number(item.MinimumOrderQuantity) : undefined,
      productStatus: item.ProductStatus ? String(item.ProductStatus) : undefined,
      rohsStatus: item.RohsStatus ? String(item.RohsStatus) : undefined,
      leadStatus: item.LeadStatus ? String(item.LeadStatus) : undefined,
      customTariffNumber: item.CustomTariffNumber ? String(item.CustomTariffNumber) : undefined,
      parameters,
      category: item.ClassValue ? String(item.ClassValue) : undefined,
      subcategory: item.ProductGroup ? String(item.ProductGroup) : undefined,
      series: item.Series ? String(item.Series) : undefined,
    };
  }
}
