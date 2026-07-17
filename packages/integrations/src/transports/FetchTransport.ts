/**
 * FetchTransport — real HTTPS transport backed by the global `fetch`.
 *
 * Used in production. Never throws on HTTP errors (returns them in the
 * response envelope so callers can branch on `status`). Throws only on
 * network failures (DNS, TCP, TLS, timeout).
 *
 * Auth strategies:
 *   - `none`     — no auth
 *   - `bearer`   — static bearer token, sent as `Authorization: Bearer <token>`
 *   - `basic`    — username/password, sent as `Authorization: Basic <base64>`
 *   - `oauth2-client-credentials` — RFC 6749 §4.4 client-credentials grant.
 *     Token is cached in-memory for the duration of the process and refreshed
 *     automatically 60 seconds before expiry.
 *
 * The OAuth2 client-credentials flow is what eBay's Browse API uses — POST to
 * the token URL with `grant_type=client_credentials` and Basic auth, receive
 * `{ access_token, expires_in }`, then send `Authorization: Bearer <access_token>`
 * on subsequent requests.
 */
import type { Transport, TransportRequest, TransportResponse } from "./Transport";
import { buildQueryString } from "./Transport";

export type AuthStrategy =
  | { kind: "none" }
  | { kind: "bearer"; token: string }
  | { kind: "basic"; username: string; password: string }
  | {
      kind: "oauth2-client-credentials";
      tokenUrl: string;
      clientId: string;
      clientSecret: string;
      /** Optional scope to request. */
      scope?: string;
      /** Optional audience to request (some providers require it). */
      audience?: string;
    };

export interface FetchTransportOptions {
  baseUrl: string;
  auth?: AuthStrategy;
  /** Default headers sent on every request. */
  defaultHeaders?: Record<string, string>;
  /** Default timeout in ms (per request). */
  defaultTimeoutMs?: number;
  /** Custom fetch implementation (defaults to global fetch). */
  fetchImpl?: typeof fetch;
}

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

const REFRESH_LEADWAY_MS = 60_000; // refresh 60s before expiry

export class FetchTransport implements Transport {
  readonly kind = "fetch";
  private readonly baseUrl: string;
  private readonly auth: AuthStrategy;
  private readonly defaultHeaders: Record<string, string>;
  private readonly defaultTimeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private cachedToken: CachedToken | null = null;

  constructor(opts: FetchTransportOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.auth = opts.auth ?? { kind: "none" };
    this.defaultHeaders = opts.defaultHeaders ?? {};
    this.defaultTimeoutMs = opts.defaultTimeoutMs ?? 15_000;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  }

  async execute<T = unknown>(req: TransportRequest): Promise<TransportResponse<T>> {
    const url = this.buildUrl(req);
    const body = this.serializeBody(req.body);
    const headers = await this.buildHeaders(req, body);

    const controller = new AbortController();
    const timeoutMs = req.timeoutMs ?? this.defaultTimeoutMs;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();

    try {
      const res = await this.fetchImpl(url, {
        method: req.method ?? "GET",
        headers,
        body,
        signal: controller.signal,
        redirect: "follow"
      });

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });

      const text = await res.text();
      let parsedBody: unknown = text;
      const contentType = responseHeaders["content-type"] ?? "";
      if (
        text &&
        (contentType.includes("application/json") ||
          text.trim().startsWith("{") ||
          text.trim().startsWith("["))
      ) {
        try {
          parsedBody = JSON.parse(text);
        } catch {
          // Keep raw text — JSON parsing failed
        }
      }

      return {
        status: res.status,
        headers: responseHeaders,
        body: parsedBody as T,
        source: "network",
        durationMs: Date.now() - start,
        finalUrl: res.url
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private buildUrl(req: TransportRequest): string {
    const qs = buildQueryString(req.query);
    return `${this.baseUrl}${req.path}${qs ? `?${qs}` : ""}`;
  }

  private serializeBody(body: unknown): BodyInit | undefined {
    if (body === undefined || body === null) return undefined;
    if (typeof body === "string") return body;
    return JSON.stringify(body);
  }

  private async buildHeaders(
    req: TransportRequest,
    body: string | undefined
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...this.defaultHeaders,
      ...req.headers
    };

    if (req.body !== undefined && typeof req.body !== "string") {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    }

    switch (this.auth.kind) {
      case "none":
        break;
      case "bearer":
        headers["Authorization"] = `Bearer ${this.auth.token}`;
        break;
      case "basic": {
        const cred = `${this.auth.username}:${this.auth.password}`;
        headers["Authorization"] = `Basic ${Buffer.from(cred).toString("base64")}`;
        break;
      }
      case "oauth2-client-credentials": {
        const token = await this.getAccessToken();
        headers["Authorization"] = `Bearer ${token}`;
        break;
      }
    }

    return headers;
  }

  private async getAccessToken(): Promise<string> {
    if (
      this.cachedToken &&
      Date.now() < this.cachedToken.expiresAtMs - REFRESH_LEADWAY_MS
    ) {
      return this.cachedToken.accessToken;
    }

    // Assert oauth2 strategy — TS narrowing helper.
    if (this.auth.kind !== "oauth2-client-credentials") {
      throw new Error("FetchTransport: getAccessToken called without oauth2 strategy");
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials"
    });
    if (this.auth.scope) body.set("scope", this.auth.scope);
    if (this.auth.audience) body.set("audience", this.auth.audience);

    const cred = `${this.auth.clientId}:${this.auth.clientSecret}`;
    const res = await this.fetchImpl(this.auth.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(cred).toString("base64")}`
      },
      body: body.toString()
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `FetchTransport: OAuth2 token request failed (${res.status} ${res.statusText}): ${text}`
      );
    }

    const tokenResponse = (await res.json()) as {
      access_token: string;
      expires_in?: number;
      token_type?: string;
    };

    if (!tokenResponse.access_token) {
      throw new Error("FetchTransport: OAuth2 token response missing access_token");
    }

    const expiresInSec = tokenResponse.expires_in ?? 3600;
    this.cachedToken = {
      accessToken: tokenResponse.access_token,
      expiresAtMs: Date.now() + expiresInSec * 1000
    };

    return this.cachedToken.accessToken;
  }
}
