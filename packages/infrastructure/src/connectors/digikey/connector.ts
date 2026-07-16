/**
 * @workspace/infrastructure/connectors/digikey/connector
 *
 * DigiKeyConnector — implements DiscoveryConnector for DigiKey Product Search API.
 * First ConnectorKind.Distributor — validates SDK with distributor-specific data:
 *   MPN, datasheets, lifecycle, RoHS, MOQ, real-time stock.
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
import { DigiKeyParser } from "./parser";
import { DigiKeyProductMapper } from "./mapper";

export class DigiKeyConnector extends BaseConnector {
  readonly provider: MarketplaceProvider = "digikey";
  readonly providerVersion = "v4"; // DigiKey API version
  readonly capabilities: MarketplaceCapabilities = {
    kind: ConnectorKind.Distributor,
    supportsRealtimeSearch: true,
    supportsCursorPagination: true,
    supportsIncrementalSync: true,
    supportsImages: true,
    supportsVariants: true,
    supportsAffiliateLinks: false,
    supportsInventory: true,
    supportsPriceHistory: true,
  };

  private readonly parser: DigiKeyParser;
  private readonly mapper: DigiKeyProductMapper;
  private readonly apiBaseUrl: string;
  private readonly siteId: string;

  constructor(
    config: ConnectorConfig,
    siteId: string = "US",
    apiBaseUrl?: string,
    metrics?: ConnectorMetricsCollector
  ) {
    super(config, metrics);
    this.parser = new DigiKeyParser();
    this.mapper = new DigiKeyProductMapper();
    this.siteId = siteId;
    this.apiBaseUrl = apiBaseUrl ?? "https://api.digikey.com";
  }

  protected buildRequest(request: DiscoveryRequest, cursor: unknown): HttpRequest {
    const params: Record<string, string> = {};

    if (cursor) params.offset = String(cursor);

    // DigiKey Search API uses a POST body for search criteria
    const body: Record<string, unknown> = {
      RecordCount: request.limit,
      SearchOptions: {
        Include_quantity_available: true,
        Include_unit_price: true,
        Include_datasheets: true,
        Include_parameters: true,
        Include_associated_products: false,
      },
      Site: this.siteId,
    };

    if (request.keyword) body.Keywords = request.keyword;
    if (request.category) body.ClassValues = [request.category];

    return {
      method: "POST",
      url: `${this.apiBaseUrl}/Search/v4/Products`,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-DIGIKEY-Site-Id": this.siteId,
      },
      query: params,
      body: JSON.stringify(body),
      timeoutMs: this.config.timeoutMs,
    };
  }

  protected parsePage(response: HttpResponse): DiscoveredProductPage {
    const parsed = this.parser.parse(response);
    const products = this.mapper.mapAll(parsed.products);

    const nextOffset = parsed.offset + parsed.count;
    return {
      products,
      nextCursor: parsed.hasMore ? String(nextOffset) : null,
      hasMore: parsed.hasMore,
      apiCallsUsed: 1,
    };
  }
}

export function createDigiKeyConnector(
  config: ConnectorConfig,
  siteId?: string,
  apiBaseUrl?: string,
  metrics?: ConnectorMetricsCollector
): DigiKeyConnector {
  return new DigiKeyConnector(config, siteId, apiBaseUrl, metrics);
}
