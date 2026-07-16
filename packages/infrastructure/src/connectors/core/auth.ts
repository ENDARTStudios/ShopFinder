/**
 * @workspace/infrastructure/connectors/core/auth
 *
 * AuthProvider implementations.
 * Each marketplace authenticates differently — swap without
 * changing the connector or domain.
 */
import type { AuthProvider, HttpRequest } from "./types";

// ── NoopAuth ───────────────────────────────────────────────

export class NoopAuthProvider implements AuthProvider {
  readonly name = "noop";
  async authenticate(request: HttpRequest): Promise<HttpRequest> {
    return request;
  }
}

// ── BearerAuth ─────────────────────────────────────────────

export class BearerAuthProvider implements AuthProvider {
  readonly name = "bearer";
  constructor(private readonly token: string) {}

  async authenticate(request: HttpRequest): Promise<HttpRequest> {
    return {
      ...request,
      headers: {
        ...request.headers,
        Authorization: `Bearer ${this.token}`
      }
    };
  }
}

// ── ApiKeyAuth (query param) ───────────────────────────────

export class ApiKeyAuthProvider implements AuthProvider {
  readonly name = "api-key";
  constructor(
    private readonly keyName: string,
    private readonly keyValue: string
  ) {}

  async authenticate(request: HttpRequest): Promise<HttpRequest> {
    return {
      ...request,
      query: {
        ...request.query,
        [this.keyName]: this.keyValue
      }
    };
  }
}

// ── SignatureAuth (HMAC) ───────────────────────────────────

/**
 * HMAC signature auth — used by AliExpress (Top API) and Amazon SP-API.
 * The actual signing algorithm is provider-specific; this is the contract.
 */
export class SignatureAuthProvider implements AuthProvider {
  readonly name = "signature";
  constructor(
    private readonly appKey: string,
    private readonly appSecret: string,
    private readonly signFn: (params: {
      method: string;
      url: string;
      body?: string;
      appKey: string;
      appSecret: string;
      timestamp: number;
    }) => string
  ) {}

  async authenticate(request: HttpRequest): Promise<HttpRequest> {
    const timestamp = Date.now();
    const signature = this.signFn({
      method: request.method,
      url: request.url,
      body: request.body,
      appKey: this.appKey,
      appSecret: this.appSecret,
      timestamp
    });

    return {
      ...request,
      query: {
        ...request.query,
        app_key: this.appKey,
        timestamp: timestamp.toString(),
        sign: signature
      }
    };
  }
}

// ── Factories ──────────────────────────────────────────────

export function createNoopAuthProvider(): AuthProvider {
  return new NoopAuthProvider();
}

export function createBearerAuthProvider(token: string): AuthProvider {
  return new BearerAuthProvider(token);
}

export function createApiKeyAuthProvider(keyName: string, keyValue: string): AuthProvider {
  return new ApiKeyAuthProvider(keyName, keyValue);
}
