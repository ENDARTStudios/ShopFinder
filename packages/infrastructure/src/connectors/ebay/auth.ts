/**
 * @workspace/infrastructure/connectors/ebay/auth
 *
 * eBay Browse API authentication — OAuth2 client credentials flow.
 */
import type { AuthProvider, HttpRequest } from "../core/types";

export interface EbayAuthConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly scopes?: string; // default: "https://api.ebay.com/oauth/api_scope"
  readonly tokenEndpoint?: string; // default: https://api.ebay.com/identity/v1/oauth2/token
}

interface EbayToken {
  accessToken: string;
  expiresAt: number;
}

export class EbayAuthProvider implements AuthProvider {
  readonly name = "ebay-oauth2";
  private token: EbayToken | null = null;
  private readonly tokenEndpoint: string;
  private readonly scopes: string;

  constructor(private readonly config: EbayAuthConfig) {
    this.tokenEndpoint = config.tokenEndpoint ?? "https://api.ebay.com/identity/v1/oauth2/token";
    this.scopes = config.scopes ?? "https://api.ebay.com/oauth/api_scope";
  }

  async authenticate(request: HttpRequest): Promise<HttpRequest> {
    const token = await this.getAccessToken();
    return {
      ...request,
      headers: {
        ...request.headers,
        Authorization: `Bearer ${token}`,
      },
    };
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 60_000) {
      return this.token.accessToken;
    }

    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64");
    const response = await fetch(this.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: this.scopes,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`eBay OAuth2 token failed: ${response.status} ${body}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.token = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return this.token.accessToken;
  }
}

export function createEbayAuthProvider(config: EbayAuthConfig): EbayAuthProvider {
  return new EbayAuthProvider(config);
}
