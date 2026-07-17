/**
 * EbayConnector — hybrid real/fixture connector for eBay's Browse API.
 *
 * Construction strategy:
 *   - If `EBAY_APP_ID` and `EBAY_CERT_ID` are both set in the environment
 *     AND the connector is not forced into sandbox mode, the connector uses
 *     `FetchTransport` with `oauth2-client-credentials` against
 *     `https://api.ebay.com` (production) or
 *     `https://api.sandbox.ebay.com` (sandbox, default).
 *   - Otherwise (no credentials, or `EBAY_FORCE_REPLAY=true`), it falls
 *     back to `ReplayTransport` reading from `fixtures/ebay`.
 *
 * eBay's Browse API uses OAuth2 with the `client_credentials` grant (RFC
 * 6749 §4.4). The scope `https://api.ebay.com/oauth/api_scope` is required
 * for public Browse API calls.
 *
 * Search items:
 *   GET https://api.ebay.com/buy/browse/v1/item_summary/search?q=<keyword>
 *     Authorization: Bearer <access_token>
 *     X-EBAY-C-MARKETPLACE-ID: EBAY_US
 *
 * Response shape (truncated):
 *   {
 *     "itemSummaries": [
 *       { "itemId", "title", "price": { "value", "currency" },
 *         "seller": { "username", "feedbackPercentage" },
 *         "itemLocation": { "country" }, "itemWebUrl",
 *         "condition": "NEW" | "USED" | ... }
 *     ],
 *     "total": <n>
 *   }
 */
import path from "node:path";

import {
  FetchTransport,
  ReplayTransport,
  type Transport,
  type TransportResponse
} from "../../transports";

// ── eBay Browse API types (subset) ─────────────────────────

export interface EbayPrice {
  value: string;
  currency: string;
}

export interface EbaySeller {
  username: string;
  feedbackPercentage?: number;
  feedbackScore?: number;
}

export interface EbayItemLocation {
  country: string;
  postalCode?: string;
}

export interface EbayItemSummary {
  itemId: string;
  title: string;
  price?: EbayPrice;
  seller?: EbaySeller;
  itemLocation?: EbayItemLocation;
  itemWebUrl?: string;
  condition?: string;
  thumbnailImages?: Array<{ imageUrl: string }>;
  categories?: Array<{ categoryId: string; categoryPath: string }>;
  shortDescription?: string;
}

export interface EbaySearchResponse {
  itemSummaries?: EbayItemSummary[];
  total?: number;
  href?: string;
  next?: string;
  prev?: string;
  warnings?: Array<{ category: string; message: string }>;
}

export interface EbayItemDetailsResponse extends EbayItemSummary {
  description?: string;
  images?: Array<{ imageUrl: string; width: number; height: number }>;
  brand?: string;
  mpn?: string;
  gtin?: string;
  estimatedAvailabilities?: Array<{
    estimatedAvailableQuantity: number;
    deliveryOptions: string[];
  }>;
}

// ── Configuration ──────────────────────────────────────────

export interface EbayConnectorConfig {
  appId?: string;
  certId?: string;
  /** Alias for appId — accepts the OAuth2 client_id naming. */
  clientId?: string;
  /** Alias for certId — accepts the OAuth2 client_secret naming. */
  clientSecret?: string;
  /** When true, forces the ReplayTransport even if credentials are present. */
  forceReplay?: boolean;
  /** Use sandbox endpoint (default true in development). */
  sandbox?: boolean;
  /** Custom transport override — for testing. */
  transport?: Transport;
}

const SANDBOX_BASE = "https://api.sandbox.ebay.com";
const PROD_BASE = "https://api.ebay.com";
const TOKEN_PATH = "/identity/v1/oauth2/token";
const SEARCH_PATH = "/buy/browse/v1/item_summary/search";
const ITEM_PATH = (itemId: string) => `/buy/browse/v1/item/${encodeURIComponent(itemId)}`;

// Resolve fixtures dir relative to project root (cwd), not __dirname, so
// it works regardless of whether the caller is bun, next, or vitest.
const FIXTURE_DIR = path.resolve(process.cwd(), "fixtures", "ebay");

// ── Connector ──────────────────────────────────────────────

export class EbayConnector {
  readonly connectorId = "ebay";
  readonly transport: Transport;
  readonly mode: "live" | "replay";

  constructor(config: EbayConnectorConfig = {}) {
    // Accept either (appId, certId) or (clientId, clientSecret) — eBay's
    // portal exposes both naming conventions.
    const appId =
      config.appId ??
      config.clientId ??
      process.env.EBAY_APP_ID ??
      process.env.EBAY_CLIENT_ID;
    const certId =
      config.certId ??
      config.clientSecret ??
      process.env.EBAY_CERT_ID ??
      process.env.EBAY_CLIENT_SECRET;
    const forceReplay =
      config.forceReplay ?? process.env.EBAY_FORCE_REPLAY === "true";
    const sandbox = config.sandbox ?? process.env.EBAY_SANDBOX !== "false"; // default to sandbox

    if (config.transport) {
      this.transport = config.transport;
      this.mode = "replay";
      return;
    }

    if (appId && certId && !forceReplay) {
      const base = sandbox ? SANDBOX_BASE : PROD_BASE;
      this.transport = new FetchTransport({
        baseUrl: base,
        auth: {
          kind: "oauth2-client-credentials",
          tokenUrl: base + TOKEN_PATH,
          clientId: appId,
          clientSecret: certId,
          scope: "https://api.ebay.com/oauth/api_scope"
        },
        defaultHeaders: {
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
          Accept: "application/json"
        },
        defaultTimeoutMs: 15_000
      });
      this.mode = "live";
    } else {
      this.transport = new ReplayTransport({ fixtureDir: FIXTURE_DIR });
      this.mode = "replay";
    }
  }

  /** Search items by keyword. */
  async searchByKeyword(
    keyword: string,
    opts: { limit?: number; offset?: number } = {}
  ): Promise<TransportResponse<EbaySearchResponse>> {
    return this.transport.execute<EbaySearchResponse>({
      path: SEARCH_PATH,
      method: "GET",
      query: {
        q: keyword,
        limit: opts.limit ?? 50,
        offset: opts.offset ?? 0
      }
    });
  }

  /** Fetch full details for a single item by eBay item ID. */
  async getItemDetails(
    itemId: string
  ): Promise<TransportResponse<EbayItemDetailsResponse>> {
    return this.transport.execute<EbayItemDetailsResponse>({
      path: ITEM_PATH(itemId),
      method: "GET"
    });
  }

  hasCredentials(): boolean {
    return this.mode === "live";
  }
}
