/**
 * @workspace/infrastructure/connectors/digikey/connector
 *
 * DigiKeyConnector — implements DiscoveryConnector for DigiKey Product
 * Information V4, usando exclusivamente o DigiKeyClient (sem HTTP direto):
 *   keyword → client.keywordSearch → parser (v4) → mapper → NormalizedDiscoveredProduct[]
 *
 * O cliente fornece os adapters de transport e auth do Connector SDK
 * (token OAuth2 em cache, headers Bearer + X-DIGIKEY-Client-Id + locale).
 * Rotas conforme o Swagger oficial: basePath /products/v4,
 * KeywordSearch = POST /search/keyword (body KeywordRequest, Offset no body).
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
  HttpTransport,
  AuthProvider,
  PaginationStrategy
} from "../core/types";
import { ConnectorKind } from "../core/types";
import { DigiKeyClient } from "./client";
import { DigiKeyOffsetPagination } from "./pagination";
import { DigiKeyParser } from "./parser";
import { DigiKeyProductMapper } from "./mapper";

/** Transport que delega ao DigiKeyClient (token/cache encapsulados). */
class DigiKeyClientTransport implements HttpTransport {
  readonly name = "digikey-client";
  constructor(private readonly client: DigiKeyClient) {}

  async execute(request: HttpRequest): Promise<HttpResponse> {
    const start = Date.now();
    const url = new URL(request.url);
    const path = `${url.pathname}${url.search}`;
    const body = request.body ? (JSON.parse(request.body) as unknown) : undefined;
    const res = await this.client.execute(request.method === "POST" ? "POST" : "GET", path, body);
    return {
      status: res.status,
      headers: {},
      body: res.rawBody,
      durationMs: Date.now() - start
    };
  }
}

/** Auth que pede os headers prontos ao client (renova token via cache). */
class DigiKeyClientAuth implements AuthProvider {
  readonly name = "digikey-client-oauth2";
  constructor(private readonly client: DigiKeyClient) {}

  async authenticate(request: HttpRequest): Promise<HttpRequest> {
    const authHeaders = await this.client.getAuthHeaders();
    return {
      ...request,
      headers: {
        ...request.headers,
        ...authHeaders,
        "X-DIGIKEY-Locale-Site": "US",
        "X-DIGIKEY-Locale-Language": "en",
        "X-DIGIKEY-Locale-Currency": "USD"
      }
    };
  }
}

export class DigiKeyConnector extends BaseConnector {
  readonly provider: MarketplaceProvider = "digikey";
  readonly providerVersion = "v4";
  readonly capabilities: MarketplaceCapabilities = {
    kind: ConnectorKind.Distributor,
    supportsRealtimeSearch: true,
    supportsCursorPagination: true,
    supportsIncrementalSync: true,
    supportsImages: true,
    supportsVariants: true,
    supportsAffiliateLinks: false,
    supportsInventory: true,
    supportsPriceHistory: true
  };

  private readonly client: DigiKeyClient | null;
  private readonly apiBaseUrl: string;
  private readonly parser: DigiKeyParser;
  private readonly mapper: DigiKeyProductMapper;
  private lastOffset = 0;

  /**
   * @param client quando informado, transport/auth/pagination são providos
   * pelo DigiKeyClient (produção). Quando omitido (testes com fixtures),
   * respeita o config recebido.
   */
  constructor(
    config: ConnectorConfig,
    client?: DigiKeyClient,
    metrics?: ConnectorMetricsCollector
  ) {
    super(
      client
        ? {
            ...config,
            transport: new DigiKeyClientTransport(client),
            auth: new DigiKeyClientAuth(client),
            pagination: new DigiKeyOffsetPagination()
          }
        : config,
      metrics
    );
    this.client = client ?? null;
    this.apiBaseUrl = client?.apiBaseUrl ?? "https://api.digikey.com";
    this.parser = new DigiKeyParser();
    this.mapper = new DigiKeyProductMapper();
  }

  protected buildRequest(request: DiscoveryRequest, cursor: unknown): HttpRequest {
    const offset = Number(cursor ?? 0);
    this.lastOffset = offset;

    const body: Record<string, unknown> = {
      Keywords: request.keyword ?? "",
      Limit: request.limit
    };
    if (offset > 0) body.Offset = offset;

    return {
      method: "POST",
      url: `${this.apiBaseUrl}/products/v4/search/keyword`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      query: {},
      body: JSON.stringify(body),
      timeoutMs: this.config.timeoutMs
    };
  }

  protected parsePage(response: HttpResponse): DiscoveredProductPage {
    const parsed = this.parser.parse(response, this.lastOffset);
    const products = this.mapper.mapAll(parsed.products);

    const nextOffset = parsed.offset + parsed.count;
    return {
      products,
      nextCursor: parsed.hasMore ? String(nextOffset) : null,
      hasMore: parsed.hasMore,
      apiCallsUsed: 1
    };
  }
}

export function createDigiKeyConnector(
  config: ConnectorConfig,
  client?: DigiKeyClient,
  metrics?: ConnectorMetricsCollector
): DigiKeyConnector {
  return new DigiKeyConnector(config, client, metrics);
}
