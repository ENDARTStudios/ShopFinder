/**
 * @workspace/infrastructure/connectors/amazon/connector
 *
 * AmazonConnector — implements DiscoveryConnector for Amazon SP-API
 * Catalog Items API.
 *
 * Flow:
 *   request → auth (LWA + SigV4) → transport → parser → mapper → products
 *
 * The connector ONLY coordinates. All transformation lives in:
 *   - auth.ts: LWA OAuth2 + AWS SigV4 signing
 *   - parser.ts: Catalog Items API response parsing
 *   - mapper.ts: ParsedAmazonCatalogItem → NormalizedDiscoveredProduct
 *   - pagination.ts: NextToken cursor pagination
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
import { AmazonCatalogParser } from "./parser";
import { AmazonProductMapper } from "./mapper";
import { AmazonNextTokenPagination } from "./pagination";

export class AmazonConnector extends BaseConnector {
  readonly provider: MarketplaceProvider = "amazon";
  readonly providerVersion = "2024-01-01"; // SP-API version
  readonly capabilities: MarketplaceCapabilities = {
    kind: ConnectorKind.Marketplace,
    supportsRealtimeSearch: true,
    supportsCursorPagination: true,
    supportsIncrementalSync: true,
    supportsImages: true,
    supportsVariants: true,
    supportsAffiliateLinks: false,
    supportsInventory: true,
    supportsPriceHistory: true,
  };

  private readonly parser: AmazonCatalogParser;
  private readonly mapper: AmazonProductMapper;
  private readonly apiBaseUrl: string;
  private readonly marketplaceId: string;

  constructor(
    config: ConnectorConfig,
    marketplaceId: string = "ATVPDKIKX0DER", // US marketplace
    apiBaseUrl?: string,
    metrics?: ConnectorMetricsCollector
  ) {
    super(config, metrics);
    this.parser = new AmazonCatalogParser();
    this.mapper = new AmazonProductMapper();
    this.marketplaceId = marketplaceId;
    this.apiBaseUrl = apiBaseUrl ?? "https://sellingpartnerapi-na.amazon.com";
  }

  protected buildRequest(request: DiscoveryRequest, cursor: unknown): HttpRequest {
    const params: Record<string, string> = {
      marketplaceIds: this.marketplaceId,
      pageSize: String(request.limit),
      includedData: "images,attributes,productTypes,browseClassification,summaries",
    };

    // Apply cursor (NextToken) if not first page
    const nextToken = cursor ? String(cursor) : "";
    if (nextToken) {
      params.pageType = "NEXT_TOKEN";
      params.nextToken = nextToken;
    }

    // If keyword provided, add keywords param
    if (request.keyword) {
      params.keywords = request.keyword;
    }

    // If category provided, add classification param
    if (request.category) {
      params.classificationId = request.category;
    }

    return {
      method: "GET",
      url: `${this.apiBaseUrl}/catalog/2022-04-01/items`,
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

    return {
      products,
      nextCursor: parsed.nextToken,
      hasMore: parsed.hasMore,
      apiCallsUsed: 1,
    };
  }
}

export function createAmazonConnector(
  config: ConnectorConfig,
  marketplaceId?: string,
  apiBaseUrl?: string,
  metrics?: ConnectorMetricsCollector
): AmazonConnector {
  return new AmazonConnector(config, marketplaceId, apiBaseUrl, metrics);
}

export function createAmazonPagination(): AmazonNextTokenPagination {
  return new AmazonNextTokenPagination();
}
