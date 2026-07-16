/**
 * @workspace/infrastructure/connectors/ebay/connector
 *
 * eBayConnector — implements DiscoveryConnector for eBay Browse API.
 *
 * Flow:
 *   request → auth (OAuth2) → transport → parser → mapper → products
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
} from "../core/types";
import { ConnectorKind } from "../core/types";
import { EbayBrowseParser } from "./parser";
import { EbayProductMapper } from "./mapper";

export class EbayConnector extends BaseConnector {
  readonly provider: MarketplaceProvider = "ebay";
  readonly providerVersion = "1.1.0"; // Browse API version
  readonly capabilities: MarketplaceCapabilities = {
    kind: ConnectorKind.Marketplace,
    supportsRealtimeSearch: true,
    supportsCursorPagination: true,
    supportsIncrementalSync: false,
    supportsImages: true,
    supportsVariants: false,
    supportsAffiliateLinks: false,
    supportsInventory: true,
    supportsPriceHistory: false,
  };

  private readonly parser: EbayBrowseParser;
  private readonly mapper: EbayProductMapper;
  private readonly apiBaseUrl: string;
  private readonly marketplaceId: string;

  constructor(
    config: ConnectorConfig,
    marketplaceId: string = "EBAY_US",
    apiBaseUrl?: string,
    metrics?: ConnectorMetricsCollector
  ) {
    super(config, metrics);
    this.parser = new EbayBrowseParser();
    this.mapper = new EbayProductMapper();
    this.marketplaceId = marketplaceId;
    this.apiBaseUrl = apiBaseUrl ?? "https://api.ebay.com";
  }

  protected buildRequest(request: DiscoveryRequest, cursor: unknown): HttpRequest {
    const params: Record<string, string> = {
      "X-EBAY-C-MARKETPLACE-ID": this.marketplaceId,
      limit: String(request.limit),
    };

    // offset is applied by EbayOffsetPagination.apply()
    if (cursor) params.offset = String(cursor);

    if (request.keyword) params.q = request.keyword;
    if (request.category) params.category_ids = request.category;

    return {
      method: "GET",
      url: `${this.apiBaseUrl}/buy/browse/v1/item_summary/search`,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      query: params,
      timeoutMs: this.config.timeoutMs,
    };
  }

  protected parsePage(response: HttpResponse): DiscoveredProductPage {
    const parsed = this.parser.parse(response);
    const products = this.mapper.mapAll(parsed.items);

    const nextOffset = parsed.offset + parsed.items.length;
    return {
      products,
      nextCursor: parsed.hasMore ? String(nextOffset) : null,
      hasMore: parsed.hasMore,
      apiCallsUsed: 1,
    };
  }
}

export function createEbayConnector(
  config: ConnectorConfig,
  marketplaceId?: string,
  apiBaseUrl?: string,
  metrics?: ConnectorMetricsCollector
): EbayConnector {
  return new EbayConnector(config, marketplaceId, apiBaseUrl, metrics);
}
