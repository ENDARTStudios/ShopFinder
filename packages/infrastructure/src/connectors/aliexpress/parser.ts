/**
 * @workspace/infrastructure/connectors/aliexpress/parser
 *
 * TopApiResponseParser — parses raw AliExpress Top API JSON responses
 * into a normalized intermediate representation.
 *
 * The parser does NOT map to domain types — that's the mapper's job.
 * The parser only extracts the raw data from the API-specific JSON structure.
 */
import type { HttpResponse } from "../core/types";
import type { ConnectorError } from "../core/types";
import { fromHttpStatus } from "../core/errors";

// ── Parsed types (intermediate representation) ─────────────

export interface ParsedAliExpressProduct {
  readonly product_id: string;
  readonly product_title: string;
  readonly product_detail_url?: string;
  readonly shop_url?: string;
  readonly shop_name?: string;
  readonly category_id?: string;
  readonly category_name?: string;
  readonly first_level_category_id?: string;
  readonly first_level_category_name?: string;
  readonly second_level_category_id?: string;
  readonly second_level_category_name?: string;
  readonly product_image_url?: string;
  readonly product_small_image_urls?: string[];
  readonly original_price?: string;
  readonly sale_price?: string;
  readonly discount?: string;
  readonly currency?: string;
  readonly evaluate_rate?: string;
  readonly evaluation_count?: string;
  readonly trade_count?: string;
  readonly order_count?: string;
  readonly shop_id?: string;
  readonly shop_title?: string;
  readonly logistics?: string;
  readonly lastest_volume?: string;
  readonly product_props?: Array<{
    readonly prop_name: string;
    readonly prop_value: string;
  }>;
}

export interface ParsedAliExpressPage {
  readonly products: ReadonlyArray<ParsedAliExpressProduct>;
  readonly currentPage: number;
  readonly totalPages: number;
  readonly totalResults: number;
  readonly hasMore: boolean;
}

export interface ParsedAliErrorResponse {
  readonly code: number;
  readonly msg: string;
  readonly sub_code?: string;
  readonly sub_msg?: string;
  readonly request_id?: string;
}

// ── Parser ─────────────────────────────────────────────────

export class TopApiResponseParser {
  /**
   * Parse a successful aliexpress.affiliate.product.query response.
   * Throws ConnectorError if the API returned an error.
   */
  parse(response: HttpResponse): ParsedAliExpressPage {
    if (response.status >= 400) {
      throw this.parseError(response);
    }

    const json = this.safeParseJson(response.body);

    // Check for API-level errors
    const errorResult = this.checkApiError(json);
    if (errorResult) throw errorResult;

    // Navigate the response structure:
    // aliexpress_affiliate_product_query_response.resp_result.result.products.product[]
    const queryResponse = this.extractPath(json, [
      "aliexpress_affiliate_product_query_response",
      "resp_result",
      "result"
    ]);

    if (!queryResponse) {
      return this.emptyPage();
    }

    const productsRaw = this.extractPath(queryResponse, ["products", "product"]);
    const products: ParsedAliExpressProduct[] = [];

    if (Array.isArray(productsRaw)) {
      for (const p of productsRaw) {
        const mapped = this.mapProduct(p);
        if (mapped) products.push(mapped);
      }
    } else if (productsRaw && typeof productsRaw === "object") {
      // Single product (not wrapped in array)
      const mapped = this.mapProduct(productsRaw);
      if (mapped) products.push(mapped);
    }

    const currentPage = Number(this.extractPath(queryResponse, ["current_page_no"]) ?? 1);
    const totalPages = Number(this.extractPath(queryResponse, ["total_page_no"]) ?? 1);
    const totalResults = Number(this.extractPath(queryResponse, ["total_results"]) ?? products.length);

    return {
      products,
      currentPage,
      totalPages,
      totalResults,
      hasMore: currentPage < totalPages
    };
  }

  /**
   * Parse an error response.
   */
  parseError(response: HttpResponse): ConnectorError {
    if (response.status === 401 || response.status === 403) {
      return {
        code: "AUTH",
        message: `AliExpress auth failed: ${response.status}`,
        retriable: false,
        statusCode: response.status
      };
    }

    try {
      const json = JSON.parse(response.body);
      const errorResponse: ParsedAliErrorResponse = {
        code: json?.error_response?.code ?? response.status,
        msg: json?.error_response?.msg ?? "Unknown error",
        sub_code: json?.error_response?.sub_code,
        sub_msg: json?.error_response?.sub_msg,
        request_id: json?.error_response?.request_id
      };

      // Rate limit error
      if (errorResponse.code === 429 || errorResponse.sub_code?.includes("RATE_LIMIT")) {
        return {
          code: "RATE_LIMIT",
          message: `AliExpress rate limited: ${errorResponse.msg}`,
          retriable: true,
          statusCode: 429
        };
      }

      return fromHttpStatus(response.status, errorResponse.msg, "aliexpress");
    } catch {
      return fromHttpStatus(response.status, response.body, "aliexpress");
    }
  }

  // ── Helpers ──────────────────────────────────────────────

  private safeParseJson(body: string): unknown {
    try {
      return JSON.parse(body);
    } catch {
      throw {
        code: "INVALID_RESPONSE",
        message: `Failed to parse AliExpress response as JSON: ${body.slice(0, 200)}`,
        retriable: false
      } as ConnectorError;
    }
  }

  private checkApiError(json: unknown): ConnectorError | null {
    const errorResponse = this.extractPath(json, ["error_response"]);
    if (errorResponse && typeof errorResponse === "object") {
      const code = (errorResponse as Record<string, unknown>).code as number ?? 0;
      const msg = (errorResponse as Record<string, unknown>).msg as string ?? "Unknown error";

      return {
        code: code === 429 || String(code).includes("29") ? "RATE_LIMIT" : "INVALID_RESPONSE",
        message: `AliExpress API error ${code}: ${msg}`,
        retriable: code === 429 || code >= 500,
        statusCode: code
      };
    }
    return null;
  }

  private extractPath(obj: unknown, path: string[]): unknown {
    let current: unknown = obj;
    for (const part of path) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }
    return current;
  }

  private mapProduct(raw: unknown): ParsedAliExpressProduct | null {
    if (!raw || typeof raw !== "object") return null;
    const p = raw as Record<string, unknown>;

    // Extract product props if present
    const propsRaw = p.product_props;
    let productProps: ParsedAliExpressProduct["product_props"];
    if (Array.isArray(propsRaw)) {
      productProps = propsRaw.map((prop: Record<string, unknown>) => ({
        prop_name: String(prop.prop_name ?? ""),
        prop_value: String(prop.prop_value ?? "")
      }));
    }

    // Extract small image URLs
    const smallImagesRaw = p.product_small_image_urls;
    let imageUrls: string[];
    if (typeof smallImagesRaw === "string") {
      imageUrls = smallImagesRaw.split(";").filter(Boolean);
    } else if (Array.isArray(smallImagesRaw)) {
      imageUrls = smallImagesRaw.map(String);
    } else if (smallImagesRaw && typeof smallImagesRaw === "object" && "string" in smallImagesRaw) {
      const s = (smallImagesRaw as Record<string, unknown>).string;
      imageUrls = Array.isArray(s) ? s.map(String) : s ? [String(s)] : [];
    } else {
      imageUrls = [];
    }

    return {
      product_id: String(p.product_id ?? ""),
      product_title: String(p.product_title ?? ""),
      product_detail_url: p.product_detail_url ? String(p.product_detail_url) : undefined,
      shop_url: p.shop_url ? String(p.shop_url) : undefined,
      shop_name: p.shop_name ? String(p.shop_name) : undefined,
      category_id: p.category_id ? String(p.category_id) : undefined,
      category_name: p.category_name ? String(p.category_name) : undefined,
      first_level_category_id: p.first_level_category_id ? String(p.first_level_category_id) : undefined,
      first_level_category_name: p.first_level_category_name ? String(p.first_level_category_name) : undefined,
      second_level_category_id: p.second_level_category_id ? String(p.second_level_category_id) : undefined,
      second_level_category_name: p.second_level_category_name ? String(p.second_level_category_name) : undefined,
      product_image_url: p.product_image_url ? String(p.product_image_url) : undefined,
      product_small_image_urls: imageUrls.length > 0 ? imageUrls : undefined,
      original_price: p.original_price ? String(p.original_price) : undefined,
      sale_price: p.sale_price ? String(p.sale_price) : undefined,
      discount: p.discount ? String(p.discount) : undefined,
      currency: p.currency ? String(p.currency) : undefined,
      evaluate_rate: p.evaluate_rate ? String(p.evaluate_rate) : undefined,
      evaluation_count: p.evaluation_count ? String(p.evaluation_count) : undefined,
      trade_count: p.trade_count ? String(p.trade_count) : undefined,
      order_count: p.order_count ? String(p.order_count) : undefined,
      shop_id: p.shop_id ? String(p.shop_id) : undefined,
      shop_title: p.shop_title ? String(p.shop_title) : undefined,
      logistics: p.logistics ? String(p.logistics) : undefined,
      lastest_volume: p.lastest_volume ? String(p.lastest_volume) : undefined,
      product_props: productProps
    };
  }

  private emptyPage(): ParsedAliExpressPage {
    return { products: [], currentPage: 1, totalPages: 1, totalResults: 0, hasMore: false };
  }
}
