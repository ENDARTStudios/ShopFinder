/**
 * @workspace/infrastructure/connectors/aliexpress/connector
 *
 * AliExpressConnector — complete implementation using the Connector SDK.
 *
 * Flow:
 *   request → auth (HMAC sign) → transport → parser → mapper → products
 *
 * The connector ONLY coordinates. All transformation lives in:
 *   - auth.ts: HMAC-MD5 signature
 *   - parser.ts: Top API response parsing
 *   - mapper.ts: ParsedAliExpressProduct → NormalizedDiscoveredProduct
 */
import { BaseConnector } from "../core/connector";
import type {
  DiscoveryRequest,
  DiscoveredProductPage,
  HttpRequest,
  HttpResponse,
  MarketplaceProvider,
  MarketplaceCapabilities,
  ConnectorConfig,
  ConnectorMetricsCollector,
  PaginationStrategy,
} from "../core/types";
import { ConnectorKind } from "../core/types";
import { TopApiResponseParser } from "./parser";
import { ProductMapper } from "./mapper";

/**
 * AliExpress-specific pagination: uses page_no + total_page_no.
 * The cursor is the page number as a string.
 */
export class AliExpressPagination implements PaginationStrategy<string> {
  readonly name = "aliexpress-page";

  first(_request: DiscoveryRequest): string {
    return "1";
  }

  next(response: HttpResponse, cursor: string): string | null {
    try {
      const json = JSON.parse(response.body);
      const result = json?.aliexpress_affiliate_product_query_response?.resp_result?.result;
      if (!result) return null;
      const current = Number(result.current_page_no ?? cursor);
      const total = Number(result.total_page_no ?? 1);
      if (current < total) {
        return String(current + 1);
      }
      return null;
    } catch {
      return null;
    }
  }

  apply(request: HttpRequest, cursor: string): HttpRequest {
    return {
      ...request,
      query: {
        ...request.query,
        page_no: cursor
      }
    };
  }
}

export class AliExpressConnector extends BaseConnector {
  readonly provider: MarketplaceProvider = "aliexpress";
  readonly providerVersion = "1.0.0";
  readonly capabilities: MarketplaceCapabilities = {
    kind: ConnectorKind.Marketplace,
    supportsRealtimeSearch: true,
    supportsCursorPagination: true,
    supportsIncrementalSync: false,
    supportsImages: true,
    supportsVariants: false,
    supportsAffiliateLinks: true,
    supportsInventory: false,
    supportsPriceHistory: false,
  };

  private readonly parser: TopApiResponseParser;
  private readonly mapper: ProductMapper;
  private readonly apiBaseUrl: string;
  private readonly trackingId: string;

  constructor(
    config: ConnectorConfig,
    trackingId: string,
    apiBaseUrl?: string,
    metrics?: ConnectorMetricsCollector
  ) {
    super(config, metrics);
    this.parser = new TopApiResponseParser();
    this.mapper = new ProductMapper();
    this.trackingId = trackingId;
    this.apiBaseUrl = apiBaseUrl ?? "https://api-sg.aliexpress.com/sync";
  }

  protected buildRequest(request: DiscoveryRequest, cursor: unknown): HttpRequest {
    const params: Record<string, string> = {
      method: "aliexpress.affiliate.product.query",
      format: "json",
      v: "2.0",
      tracking_id: this.trackingId,
      locale: request.language,
      target_currency: "USD",
      target_language: request.language,
      page_size: String(request.limit)
    };

    // page_no is applied by AliExpressPagination.apply(), not here.
    // But we set it initially for the first request (cursor = "1").
    if (cursor) {
      params.page_no = String(cursor);
    }

    if (request.keyword) {
      params.keywords = request.keyword;
    }
    if (request.category) {
      params.category_ids = request.category;
    }

    return {
      method: "GET",
      url: this.apiBaseUrl,
      headers: { "Content-Type": "application/json" },
      query: params,
      timeoutMs: this.config.timeoutMs
    };
  }

  protected parsePage(response: HttpResponse): DiscoveredProductPage {
    const parsed = this.parser.parse(response);
    const products = this.mapper.mapAll(parsed.products);

    return {
      products,
      nextCursor: parsed.hasMore ? String(parsed.currentPage + 1) : null,
      hasMore: parsed.hasMore,
      apiCallsUsed: 1
    };
  }
}

export function createAliExpressConnector(
  config: ConnectorConfig,
  trackingId: string,
  apiBaseUrl?: string,
  metrics?: ConnectorMetricsCollector
): AliExpressConnector {
  return new AliExpressConnector(config, trackingId, apiBaseUrl, metrics);
}
