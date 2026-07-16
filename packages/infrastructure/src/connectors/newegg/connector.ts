/**
 * @workspace/infrastructure/connectors/newegg/connector
 *
 * NeweggConnector — implements DiscoveryConnector for Newegg Marketplace API.
 * First ConnectorKind.Retailer — validates SDK with specialized retailer data.
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
import { NeweggParser } from "./parser";
import { NeweggProductMapper } from "./mapper";

export class NeweggConnector extends BaseConnector {
  readonly provider: MarketplaceProvider = "newegg";
  readonly providerVersion = "1.0";
  readonly capabilities: MarketplaceCapabilities = {
    kind: ConnectorKind.Retailer,
    supportsRealtimeSearch: true,
    supportsCursorPagination: true,
    supportsIncrementalSync: false,
    supportsImages: true,
    supportsVariants: true,
    supportsAffiliateLinks: false,
    supportsInventory: true,
    supportsPriceHistory: true,
  };

  private readonly parser: NeweggParser;
  private readonly mapper: NeweggProductMapper;
  private readonly apiBaseUrl: string;

  constructor(
    config: ConnectorConfig,
    apiBaseUrl?: string,
    metrics?: ConnectorMetricsCollector
  ) {
    super(config, metrics);
    this.parser = new NeweggParser();
    this.mapper = new NeweggProductMapper();
    this.apiBaseUrl = apiBaseUrl ?? "https://api.newegg.com/marketplace";
  }

  protected buildRequest(request: DiscoveryRequest, cursor: unknown): HttpRequest {
    const params: Record<string, string> = {
      pageSize: String(request.limit),
    };

    if (cursor) params.pageNumber = String(cursor);
    if (request.keyword) params.keyword = request.keyword;
    if (request.category) params.category = request.category;

    return {
      method: "GET",
      url: `${this.apiBaseUrl}/v1/product/search`,
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

    const nextPage = parsed.currentPage + 1;
    return {
      products,
      nextCursor: parsed.hasMore ? String(nextPage) : null,
      hasMore: parsed.hasMore,
      apiCallsUsed: 1,
    };
  }
}

export function createNeweggConnector(
  config: ConnectorConfig,
  apiBaseUrl?: string,
  metrics?: ConnectorMetricsCollector
): NeweggConnector {
  return new NeweggConnector(config, apiBaseUrl, metrics);
}
