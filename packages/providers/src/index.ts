/**
 * @workspace/providers — Marketplace Connector Framework
 */

export type ConnectorCapability =
  "discovery" | "catalog" | "inventory" | "pricing" | "order" | "tracking" | "webhook";

export interface ProviderHealth {
  readonly providerCode: string;
  readonly status: "healthy" | "degraded" | "offline";
  readonly lastSuccess: Date;
  readonly lastFailure?: Date;
  readonly consecutiveFailures: number;
  readonly requestsRemaining?: number;
  readonly resetAt?: Date;
  readonly averageLatencyMs: number;
  readonly errorRate: number;
  readonly totalRequests: number;
  readonly totalErrors: number;
}

export interface MarketplaceConnector {
  readonly providerCode: string;
  readonly providerName: string;
  readonly providerVersion: string;
  readonly capabilities: ReadonlyArray<ConnectorCapability>;
  discovery?: ProductDiscoveryProvider;
  catalog?: ProductCatalogProvider;
  inventory?: InventoryProvider;
  pricing?: PricingProvider;
  order?: OrderProvider;
  tracking?: TrackingProvider;
  webhook?: WebhookProvider;
}

export interface ProductDiscoveryProvider {
  readonly providerCode: string;
  discoverProducts(params: DiscoveryParams): Promise<DiscoveryResult>;
  getTrending(limit?: number): Promise<unknown[]>;
  getByCategory(category: string, limit?: number): Promise<unknown[]>;
}
export interface ProductCatalogProvider {
  readonly providerCode: string;
  getProduct(externalId: string): Promise<unknown | null>;
}
export interface InventoryProvider {
  readonly providerCode: string;
  getInventory(externalId: string): Promise<{ externalId: string; inventory: number } | null>;
}
export interface PricingProvider {
  readonly providerCode: string;
  getPrice(
    externalId: string
  ): Promise<{ externalId: string; price: { amount: number; currency: string } } | null>;
}
export interface OrderProvider {
  readonly providerCode: string;
  placeOrder(params: unknown): Promise<unknown>;
  getOrder(ref: string): Promise<unknown | null>;
}
export interface TrackingProvider {
  readonly providerCode: string;
  getTracking(ref: string): Promise<unknown | null>;
}
export interface WebhookProvider {
  readonly providerCode: string;
  parseWebhook(h: Record<string, string>, b: string): unknown | null;
  verifyWebhookSignature(h: Record<string, string>, b: string): boolean;
}

export interface DiscoveryParams {
  readonly keyword?: string;
  readonly category?: string;
  readonly limit?: number;
  readonly cursor?: string;
}
export interface DiscoveryResult {
  readonly products: unknown[];
  readonly nextCursor?: string;
  readonly hasMore: boolean;
}
export interface ParsedWebhook {
  readonly eventType: string;
  readonly externalId: string;
  readonly payload: unknown;
}

export class ProviderCapabilityRegistry {
  private connectors = new Map<string, MarketplaceConnector>();
  private health = new Map<string, ProviderHealth>();
  private paymentProviders = new Map<string, unknown>();

  registerConnector(c: MarketplaceConnector): void {
    this.connectors.set(c.providerCode, c);
    if (!this.health.has(c.providerCode))
      this.health.set(c.providerCode, {
        providerCode: c.providerCode,
        status: "healthy",
        lastSuccess: new Date(),
        consecutiveFailures: 0,
        averageLatencyMs: 0,
        errorRate: 0,
        totalRequests: 0,
        totalErrors: 0
      });
  }
  getConnector(code: string): MarketplaceConnector | undefined {
    return this.connectors.get(code);
  }
  listConnectorCodes(): string[] {
    return [...this.connectors.keys()];
  }
  findProviders(cap: ConnectorCapability): MarketplaceConnector[] {
    return [...this.connectors.values()].filter((c) => c.capabilities.includes(cap));
  }
  getHealthiestProviders(cap: ConnectorCapability, limit?: number): MarketplaceConnector[] {
    return this.findProviders(cap).slice(0, limit);
  }
  getHealth(code: string): ProviderHealth | undefined {
    return this.health.get(code);
  }
  recordSuccess(code: string, lat: number): void {
    const h = this.health.get(code);
    if (h)
      this.health.set(code, {
        ...h,
        status: "healthy",
        lastSuccess: new Date(),
        consecutiveFailures: 0,
        averageLatencyMs: (h.averageLatencyMs * h.totalRequests + lat) / (h.totalRequests + 1),
        totalRequests: h.totalRequests + 1
      });
  }
  recordFailure(code: string): void {
    const h = this.health.get(code);
    if (h) {
      const cf = h.consecutiveFailures + 1;
      this.health.set(code, {
        ...h,
        status: cf >= 5 ? "offline" : cf >= 2 ? "degraded" : "healthy",
        lastFailure: new Date(),
        consecutiveFailures: cf,
        totalRequests: h.totalRequests + 1,
        totalErrors: h.totalErrors + 1
      });
    }
  }
}

let _registry: ProviderCapabilityRegistry | null = null;
export function getProviderRegistry(): ProviderCapabilityRegistry {
  if (!_registry) _registry = new ProviderCapabilityRegistry();
  return _registry;
}
