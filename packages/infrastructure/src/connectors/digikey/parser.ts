/**
 * @workspace/infrastructure/connectors/digikey/parser
 *
 * DigiKey Product Information V4 response parser (swagger: basePath
 * /products/v4, KeywordSearch POST /search/keyword).
 * Parses the raw JSON into ParsedDigiKeyProduct (intermediate representation).
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

// ── Raw v4 shapes (somente o que consumimos) ──────────────

interface RawDigiKeyProduct {
  Description?: { ProductDescription?: string; DetailedDescription?: string };
  Manufacturer?: { Id?: number; Name?: string };
  ManufacturerProductNumber?: string;
  UnitPrice?: number;
  ProductUrl?: string;
  PhotoUrl?: string;
  DatasheetUrl?: string;
  ProductVariations?: Array<{
    DigiKeyProductNumber?: string;
    MinimumOrderQuantity?: number;
    StandardPricing?: Array<{ UnitPrice?: number }>;
  }>;
  QuantityAvailable?: number;
  ProductStatus?: { Status?: string };
  Parameters?: Array<{ ParameterText?: string; ValueText?: string }>;
  Category?: { Name?: string };
  Series?: { Name?: string };
}

interface RawDigiKeySearchResponse {
  Products?: RawDigiKeyProduct[];
  ProductsCount?: number;
  message?: string;
}

// ── Parser ─────────────────────────────────────────────────

export class DigiKeyParser {
  /**
   * Offset solicitado nesta página (v4 não ecoa o offset na resposta);
   * o connector informa para o cálculo do próximo cursor.
   */
  parse(response: HttpResponse, offset = 0): ParsedDigiKeyPage {
    if (response.status >= 400) {
      throw this.parseError(response);
    }

    const json = this.safeParseJson(response.body) as RawDigiKeySearchResponse | null;

    const productsRaw = json?.Products ?? [];
    const products: ParsedDigiKeyProduct[] = [];

    for (const raw of productsRaw) {
      const parsed = this.mapProduct(raw);
      if (parsed) products.push(parsed);
    }

    const totalCount = Number(json?.ProductsCount ?? 0);
    const count = products.length;
    const hasMore = offset + count < totalCount;

    return { products, totalCount, count, offset, hasMore };
  }

  parseError(response: HttpResponse): ConnectorError {
    if (response.status === 401 || response.status === 403) {
      return {
        code: "AUTH",
        message: `DigiKey auth failed: ${response.status}`,
        retriable: false,
        statusCode: response.status
      };
    }
    try {
      const json = JSON.parse(response.body);
      return {
        code: response.status === 429 ? "RATE_LIMIT" : "DIGIKEY_API_ERROR",
        message: json?.message ?? `DigiKey API error: ${response.status}`,
        retriable: response.status === 429 || response.status >= 500,
        statusCode: response.status
      };
    } catch {
      return fromHttpStatus(response.status, response.body, "digikey");
    }
  }

  private mapProduct(raw: RawDigiKeyProduct): ParsedDigiKeyProduct | null {
    const digiKeyPartNumber = raw.ProductVariations?.[0]?.DigiKeyProductNumber;
    const productDescription = raw.Description?.ProductDescription;
    if (!digiKeyPartNumber && !productDescription) return null;

    const variation = raw.ProductVariations?.[0];

    return {
      digiKeyPartNumber: digiKeyPartNumber ?? "",
      manufacturerPartNumber: raw.ManufacturerProductNumber ?? "",
      manufacturerName: raw.Manufacturer?.Name ?? "",
      manufacturerId: raw.Manufacturer?.Id,
      productDescription: productDescription ?? "",
      detailedDescription: raw.Description?.DetailedDescription ?? "",
      productUrl: raw.ProductUrl,
      primaryPhotoUrl: raw.PhotoUrl,
      primaryDatasheetUrl: raw.DatasheetUrl,
      unitPrice: raw.UnitPrice ?? variation?.StandardPricing?.[0]?.UnitPrice,
      currency: "USD",
      quantityAvailable: raw.QuantityAvailable,
      minimumOrderQuantity: variation?.MinimumOrderQuantity,
      productStatus: raw.ProductStatus?.Status,
      parameters: raw.Parameters?.map((p) => ({
        parameterName: p.ParameterText ?? "",
        parameterValue: p.ValueText ?? ""
      })),
      category: raw.Category?.Name,
      series: raw.Series?.Name
    };
  }

  private safeParseJson(body: string): unknown {
    try {
      return JSON.parse(body);
    } catch {
      throw {
        code: "INVALID_RESPONSE",
        message: `Failed to parse DigiKey response: ${body.slice(0, 200)}`,
        retriable: false
      } as ConnectorError;
    }
  }
}
