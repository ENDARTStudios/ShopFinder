/**
 * @workspace/infrastructure/connectors/newegg/parser
 *
 * Newegg Marketplace API response parser.
 */
import type { HttpResponse } from "../core/types";
import type { ConnectorError } from "../core/types";
import { fromHttpStatus } from "../core/errors";

export interface ParsedNeweggItem {
  readonly itemId: string;
  readonly title: string;
  readonly brand?: string;
  readonly category?: string;
  readonly subCategory?: string;
  readonly price?: number;
  readonly originalPrice?: number;
  readonly currency?: string;
  readonly imageUrl?: string;
  readonly additionalImages?: string[];
  readonly productUrl?: string;
  readonly condition?: string;
  readonly sellerName?: string;
  readonly shipping?: string;
  readonly inStock?: boolean;
  readonly upc?: string;
  readonly model?: string;
  readonly specs?: Record<string, string>;
}

export interface ParsedNeweggPage {
  readonly items: ReadonlyArray<ParsedNeweggItem>;
  readonly totalCount: number;
  readonly totalPages: number;
  readonly currentPage: number;
  readonly hasMore: boolean;
}

export class NeweggParser {
  parse(response: HttpResponse): ParsedNeweggPage {
    if (response.status >= 400) {
      throw this.parseError(response);
    }

    const json = this.safeParseJson(response.body) as { ItemList?: unknown[]; TotalCount?: number; TotalPageCount?: number; CurrentPageNumber?: number; message?: string } | null;
    const itemsRaw = json?.ItemList ?? [];
    const items: ParsedNeweggItem[] = [];

    for (const raw of itemsRaw) {
      const parsed = this.mapItem(raw);
      if (parsed) items.push(parsed);
    }

    const totalCount = Number(json?.TotalCount ?? 0);
    const totalPages = Number(json?.TotalPageCount ?? 1);
    const currentPage = Number(json?.CurrentPageNumber ?? 1);
    const hasMore = currentPage < totalPages;

    return { items, totalCount, totalPages, currentPage, hasMore };
  }

  parseError(response: HttpResponse): ConnectorError {
    if (response.status === 401 || response.status === 403) {
      return { code: "AUTH", message: `Newegg auth failed: ${response.status}`, retriable: false, statusCode: response.status };
    }
    try {
      const json = JSON.parse(response.body);
      return {
        code: response.status === 429 ? "RATE_LIMIT" : "NEWEGG_API_ERROR",
        message: json?.message ?? `Newegg API error: ${response.status}`,
        retriable: response.status === 429 || response.status >= 500,
        statusCode: response.status,
      };
    } catch {
      return fromHttpStatus(response.status, response.body, "newegg");
    }
  }

  private safeParseJson(body: string): unknown {
    try { return JSON.parse(body); }
    catch { throw { code: "INVALID_RESPONSE", message: `Failed to parse Newegg response: ${body.slice(0, 200)}`, retriable: false } as ConnectorError; }
  }

  private mapItem(raw: unknown): ParsedNeweggItem | null {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;

    const itemId = String(item.ItemID ?? item.itemId ?? "");
    if (!itemId) return null;

    const specsRaw = item.Specs as Record<string, unknown> | undefined;
    const specs: Record<string, string> | undefined = specsRaw
      ? Object.fromEntries(
          Object.entries(specsRaw).map(([k, v]) => [k, String(v)])
        )
      : undefined;

    const additionalImages = item.AdditionalImages as string[] | undefined;

    return {
      itemId,
      title: String(item.Title ?? item.title ?? ""),
      brand: item.Brand ? String(item.Brand) : undefined,
      category: item.Category ? String(item.Category) : undefined,
      subCategory: item.SubCategory ? String(item.SubCategory) : undefined,
      price: item.SellingPrice ? Number(item.SellingPrice) : item.Price ? Number(item.Price) : undefined,
      originalPrice: item.OriginalPrice ? Number(item.OriginalPrice) : undefined,
      currency: item.Currency ? String(item.Currency) : "USD",
      imageUrl: item.ImageUrl ? String(item.ImageUrl) : item.OriginalImage ? String(item.OriginalImage) : undefined,
      additionalImages: Array.isArray(additionalImages) ? additionalImages : undefined,
      productUrl: item.ProductUrl ? String(item.ProductUrl) : undefined,
      condition: item.Condition ? String(item.Condition) : undefined,
      sellerName: item.SellerName ? String(item.SellerName) : undefined,
      shipping: item.Shipping ? String(item.Shipping) : undefined,
      inStock: item.InStock !== undefined ? Boolean(item.InStock) : undefined,
      upc: item.UPC ? String(item.UPC) : undefined,
      model: item.Model ? String(item.Model) : undefined,
      specs,
    };
  }
}
