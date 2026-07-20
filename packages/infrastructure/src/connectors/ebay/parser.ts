/**
 * @workspace/infrastructure/connectors/ebay/parser
 *
 * eBay Browse API (search) response parser.
 */
import type { HttpResponse } from "../core/types";
import type { ConnectorError } from "../core/types";
import { fromHttpStatus } from "../core/errors";

export interface ParsedEbayItem {
  readonly itemId: string;
  readonly title: string;
  readonly price?: { value: string; currency: string };
  readonly image?: { imageUrl: string };
  readonly additionalImages?: Array<{ imageUrl: string }>;
  readonly brand?: string;
  readonly categoryPath?: string;
  readonly categoryId?: string;
  readonly condition?: string;
  readonly itemWebUrl?: string;
  readonly seller?: { username: string; feedbackPercentage?: string };
  readonly shippingOptions?: Array<{ shippingCost?: { value: string; currency: string }; type: string }>;
  readonly itemLocation?: { country?: string };
  readonly shortDescription?: string;
}

export interface ParsedEbayPage {
  readonly items: ReadonlyArray<ParsedEbayItem>;
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

export class EbayBrowseParser {
  parse(response: HttpResponse): ParsedEbayPage {
    if (response.status >= 400) {
      throw this.parseError(response);
    }

    const json = this.safeParseJson(response.body);

    const itemSummaries = json?.itemSummaries ?? [];
    const items: ParsedEbayItem[] = [];

    for (const raw of itemSummaries) {
      const parsed = this.mapItem(raw);
      if (parsed) items.push(parsed);
    }

    const total = Number(json?.total ?? 0);
    const limit = Number(json?.limit ?? 0);
    const offset = Number(json?.offset ?? 0);
    const hasMore = offset + items.length < total;

    return { items, total, limit, offset, hasMore };
  }

  parseError(response: HttpResponse): ConnectorError {
    if (response.status === 401 || response.status === 403) {
      return { code: "AUTH", message: `eBay auth failed: ${response.status}`, retriable: false, statusCode: response.status };
    }
    try {
      const json = JSON.parse(response.body);
      const errors = json?.errors ?? [];
      const first = errors[0];
      return {
        code: response.status === 429 ? "RATE_LIMIT" : "EBAY_API_ERROR",
        message: first?.message ?? `eBay API error: ${response.status}`,
        retriable: response.status === 429 || response.status >= 500,
        statusCode: response.status,
      };
    } catch {
      return fromHttpStatus(response.status, response.body, "ebay");
    }
  }

  private safeParseJson(body: string): unknown {
    try { return JSON.parse(body); }
    catch { throw { code: "INVALID_RESPONSE", message: `Failed to parse eBay response: ${body.slice(0, 200)}`, retriable: false } as ConnectorError; }
  }

  private mapItem(raw: unknown): ParsedEbayItem | null {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;

    const itemId = String(item.itemId ?? "");
    if (!itemId) return null;

    const price = item.price as { value: string; currency: string } | undefined;
    const image = item.image as { imageUrl: string } | undefined;
    const additionalImages = item.additionalImages as Array<{ imageUrl: string }> | undefined;
    const seller = item.seller as { username: string; feedbackPercentage?: string } | undefined;
    const shippingOptions = item.shippingOptions as Array<{ shippingCost?: { value: string; currency: string }; type: string }> | undefined;
    const itemLocation = item.itemLocation as { country?: string } | undefined;

    return {
      itemId,
      title: String(item.title ?? ""),
      price: price ? { value: price.value, currency: price.currency } : undefined,
      image: image ? { imageUrl: image.imageUrl } : undefined,
      additionalImages,
      brand: item.brand ? String(item.brand) : undefined,
      categoryPath: item.categoryPath ? String(item.categoryPath) : undefined,
      categoryId: item.categoryId ? String(item.categoryId) : undefined,
      condition: item.condition ? String(item.condition) : undefined,
      itemWebUrl: item.itemWebUrl ? String(item.itemWebUrl) : undefined,
      seller,
      shippingOptions,
      itemLocation,
      shortDescription: item.shortDescription ? String(item.shortDescription) : undefined,
    };
  }
}
