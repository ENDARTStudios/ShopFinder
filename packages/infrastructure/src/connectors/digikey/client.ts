/**
 * @workspace/infrastructure/connectors/digikey/client
 *
 * Cliente DigiKey reutilizável (Product Information V4).
 *
 * - OAuth2 client_credentials lendo DIGIKEY_CLIENT_ID/DIGIKEY_CLIENT_SECRET do
 *   process.env — o secret e o token NUNCA são logados nem retornados; os
 *   métodos expõem apenas status HTTP e payloads da API de busca.
 * - Cache do access_token em memória até expires_in (skew de 60s, padrão de
 *   auth.ts/DigiKeyAuthProvider).
 * - Host por ambiente: sandbox-api.digikey.com (default, e quando
 *   DIGIKEY_ENV != "production") | api.digikey.com em produção.
 *
 * Headers exigidos pela API V4: Authorization: Bearer <token>,
 * X-DIGIKEY-Client-Id e locale (site/língua/moeda — default US/en/USD).
 */

export interface DigiKeyClientOptions {
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly env?: string;
}

export interface TokenResult {
  readonly ok: boolean;
  readonly status: number;
  /** Body exato da resposta de erro (não contém segredos). */
  readonly errorBody?: string;
}

export interface ApiResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly json: unknown;
  readonly rawBody: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const TOKEN_SKEW_MS = 60_000;

export class DigiKeyClient {
  private token: CachedToken | null = null;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  constructor(options: DigiKeyClientOptions = {}) {
    this.clientId = options.clientId ?? process.env.DIGIKEY_CLIENT_ID ?? "";
    this.clientSecret = options.clientSecret ?? process.env.DIGIKEY_CLIENT_SECRET ?? "";
    const env = (options.env ?? process.env.DIGIKEY_ENV ?? "sandbox").toLowerCase();
    this.baseUrl =
      env === "production" ? "https://api.digikey.com" : "https://sandbox-api.digikey.com";
  }

  get isConfigured(): boolean {
    return this.clientId.length > 0 && this.clientSecret.length > 0;
  }

  /**
   * Obtém (ou renova) o access_token via POST /v1/oauth2/token
   * (grant_type=client_credentials). Retorna somente o status HTTP.
   */
  async authenticate(): Promise<TokenResult> {
    if (!this.isConfigured) {
      return {
        ok: false,
        status: 0,
        errorBody: "DIGIKEY_CLIENT_ID/DIGIKEY_CLIENT_SECRET ausentes no ambiente"
      };
    }

    const cached = this.token;
    if (cached && Date.now() < cached.expiresAt - TOKEN_SKEW_MS) {
      return { ok: true, status: 200 };
    }

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret
      })
    });

    if (!response.ok) {
      return { ok: false, status: response.status, errorBody: await response.text() };
    }

    const data = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) {
      return {
        ok: false,
        status: response.status,
        errorBody: "resposta de token sem access_token"
      };
    }
    this.token = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 300) * 1000
    };
    return { ok: true, status: response.status };
  }

  /** GET na API com Bearer + X-DIGIKEY-Client-Id (+ locale padrão US/en/USD). */
  async get(path: string): Promise<ApiResponse> {
    const auth = await this.authenticate();
    if (!auth.ok) {
      return { ok: false, status: auth.status, json: null, rawBody: auth.errorBody ?? "" };
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token!.accessToken}`,
        "X-DIGIKEY-Client-Id": this.clientId,
        "X-DIGIKEY-Locale-Site": "US",
        "X-DIGIKEY-Locale-Language": "en",
        "X-DIGIKEY-Locale-Currency": "USD"
      }
    });
    const rawBody = await response.text();
    let json: unknown = null;
    try {
      json = JSON.parse(rawBody);
    } catch {
      // body não-JSON segue em rawBody
    }
    return { ok: response.ok, status: response.status, json, rawBody };
  }

  /**
   * ProductInformation V4 — busca por keyword.
   * Na v4 o keyword é parâmetro de PATH: GET /products/v4/search/{keywords}.
   */
  async searchProducts(keywords: string, limit = 5): Promise<ApiResponse> {
    return this.get(`/products/v4/search/${encodeURIComponent(keywords)}?limit=${limit}`);
  }
}
