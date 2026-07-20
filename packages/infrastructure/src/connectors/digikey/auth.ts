/**
 * @workspace/infrastructure/connectors/digikey/auth
 *
 * DigiKey API authentication — OAuth2 client credentials flow.
 *
 * DigiKey uses OAuth2 with a client_id + client_secret, but also
 * requires a redirect_uri even for server-to-server flows.
 * The token endpoint is https://api.digikey.com/v1/oauth2/token.
 */
import type { AuthProvider, HttpRequest } from "../core/types";

export interface DigiKeyAuthConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly tokenEndpoint?: string;
}

interface DigiKeyToken {
  accessToken: string;
  expiresAt: number;
}

export class DigiKeyAuthProvider implements AuthProvider {
  readonly name = "digikey-oauth2";
  private token: DigiKeyToken | null = null;
  private readonly tokenEndpoint: string;

  constructor(private readonly config: DigiKeyAuthConfig) {
    this.tokenEndpoint = config.tokenEndpoint ?? "https://api.digikey.com/v1/oauth2/token";
  }

  async authenticate(request: HttpRequest): Promise<HttpRequest> {
    const token = await this.getAccessToken();
    return {
      ...request,
      headers: {
        ...request.headers,
        Authorization: `Bearer ${token}`,
        "X-DIGIKEY-Client-Id": this.config.clientId,
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
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`DigiKey OAuth2 token failed: ${response.status} ${body}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.token = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return this.token.accessToken;
  }
}

export function createDigiKeyAuthProvider(config: DigiKeyAuthConfig): DigiKeyAuthProvider {
  return new DigiKeyAuthProvider(config);
}
