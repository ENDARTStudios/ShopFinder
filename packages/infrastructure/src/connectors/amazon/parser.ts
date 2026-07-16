/**
 * @workspace/infrastructure/connectors/amazon/parser
 *
 * Amazon SP-API Catalog Items API response parser.
 * Parses raw JSON into ParsedAmazonCatalogItem (intermediate representation).
 * Does NOT map to domain types — that's the mapper's job.
 */
import type { HttpResponse } from "../core/types";
import type { ConnectorError } from "../core/types";
import { fromHttpStatus } from "../core/errors";

// ── Parsed types (intermediate representation) ─────────────

export interface ParsedAmazonCatalogItem {
  readonly asin: string;
  readonly title?: string;
  readonly brand?: string;
  readonly browseClassification?: string;
  readonly browseClassificationName?: string;
  readonly images?: Array<{
    url: string;
    variant: string;
    height?: number;
    width?: number;
  }>;
  readonly attributes?: Record<string, unknown>;
  readonly listPrice?: {
    amount: number;
    currency: string;
  };
  readonly productTypes?: string[];
}

export interface ParsedAmazonCatalogPage {
  readonly items: ReadonlyArray<ParsedAmazonCatalogItem>;
  readonly nextToken: string | null;
  readonly hasMore: boolean;
}

// ── Parser ─────────────────────────────────────────────────

export class AmazonCatalogParser {
  parse(response: HttpResponse): ParsedAmazonCatalogPage {
    if (response.status >= 400) {
      throw this.parseError(response);
    }

    const json = this.safeParseJson(response.body);

    // Check for API-level errors
    if (json?.errors) {
      const errors = json.errors as Array<{ code: string; message: string; details?: string }>;
      const first = errors[0];
      throw {
        code: first?.code ?? "AMAZON_API_ERROR",
        message: first?.message ?? "Unknown Amazon API error",
        retriable: false,
        statusCode: response.status,
      } as ConnectorError;
    }

    const itemsRaw = json?.items ?? [];
    const items: ParsedAmazonCatalogItem[] = [];

    for (const item of itemsRaw) {
      const parsed = this.mapItem(item);
      if (parsed) items.push(parsed);
    }

    const nextToken = json?.pagination?.nextToken ?? null;

    return {
      items,
      nextToken,
      hasMore: nextToken !== null && nextToken !== "",
    };
  }

  parseError(response: HttpResponse): ConnectorError {
    if (response.status === 401 || response.status === 403) {
      return {
        code: "AUTH",
        message: `Amazon auth failed: ${response.status}`,
        retriable: false,
        statusCode: response.status,
      };
    }

    try {
      const json = JSON.parse(response.body);
      const errors = json?.errors ?? [];
      const first = errors[0];
      return {
        code: response.status === 429 ? "RATE_LIMIT" : "AMAZON_API_ERROR",
        message: first?.message ?? `Amazon API error: ${response.status}`,
        retriable: response.status === 429 || response.status >= 500,
        statusCode: response.status,
      };
    } catch {
      return fromHttpStatus(response.status, response.body, "amazon");
    }
  }

  private safeParseJson(body: string): unknown {
    try {
      return JSON.parse(body);
    } catch {
      throw {
        code: "INVALID_RESPONSE",
        message: `Failed to parse Amazon response: ${body.slice(0, 200)}`,
        retriable: false,
      } as ConnectorError;
    }
  }

  private mapItem(raw: unknown): ParsedAmazonCatalogItem | null {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;

    const asin = String(item.asin ?? "");
    if (!asin) return null;

    // Extract images from item.images
    const imagesRaw = item.images as Record<string, unknown> | undefined;
    let images: ParsedAmazonCatalogItem["images"];
    if (imagesRaw && Array.isArray(imagesRaw.images)) {
      images = (imagesRaw.images as Array<Record<string, unknown>>).map(img => ({
        url: String(img.url ?? ""),
        variant: String(img.variant ?? "MAIN"),
        height: img.height ? Number(img.height) : undefined,
        width: img.width ? Number(img.width) : undefined,
      }));
    }

    // Extract attributes (nested structured data)
    const attributes = item.attributes as Record<string, unknown> | undefined;

    // Extract summaries (price, title from summaries array)
    const summariesRaw = item.summaries as Array<Record<string, unknown>> | undefined;

    // Extract brand from attributes or item-level
    const brandFromAttr = attributes?.brand as Array<{ value: string }> | undefined;
    const brandFromItem = item.brand ? String(item.brand) : undefined;
    const brand = brandFromAttr?.[0]?.value ?? brandFromItem;

    // Extract title from attributes, item-level, or summaries
    const titleFromAttr = attributes?.item_name as Array<{ value: string }> | undefined;
    const titleFromItem = item.itemName ? String(item.itemName) : undefined;
    const titleFromSummary = summariesRaw?.[0]?.itemName ? String(summariesRaw[0].itemName) : undefined;
    const title = titleFromAttr?.[0]?.value ?? titleFromItem ?? titleFromSummary;

    // Extract list price from summaries (primary) or attributes (fallback)
    const listPriceFromSummary = summariesRaw?.[0]?.listPrice as { amount: number; currency: string } | undefined;
    const listPriceFromAttr = attributes?.list_price as Array<{ amount: number; currency: string }> | undefined;
    const listPriceSource = listPriceFromSummary ?? listPriceFromAttr?.[0];
    const listPrice = listPriceSource ? {
      amount: Number(listPriceSource.amount),
      currency: String(listPriceSource.currency),
    } : undefined;

    // Extract browse classification
    const browseNodeRaw = item.browseClassification as Record<string, unknown> | undefined;
    const browseClassification = browseNodeRaw?.browseNodeId ? String(browseNodeRaw.browseNodeId) : undefined;
    const browseClassificationName = browseNodeRaw?.name ? String(browseNodeRaw.name) : undefined;

    // Extract product types
    const productTypesRaw = item.productTypes ?? [];
    const productTypes = Array.isArray(productTypesRaw)
      ? productTypesRaw.map(String)
      : [];

    return {
      asin,
      title,
      brand,
      browseClassification,
      browseClassificationName,
      images,
      attributes: attributes as Record<string, unknown> | undefined,
      listPrice,
      productTypes,
    };
  }
}
