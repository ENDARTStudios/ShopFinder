/**
 * @workspace/integrations/transports — Transport contract.
 *
 * A `Transport` is the boundary between ShopFinder and an external API.
 * The pipeline never calls `fetch()` directly — it always goes through a
 * Transport. This makes it trivial to swap:
 *
 *   - `ReplayTransport`  → returns fixture data (sandbox / tests)
 *   - `FetchTransport`   → real HTTPS calls (production)
 *
 * Each Transport returns a `TransportResponse` — a normalized envelope with
 * status, headers, body (parsed JSON), and a `source` tag for provenance.
 */

export interface TransportRequest {
  /** Path relative to the transport's baseUrl (must start with `/`). */
  path: string;
  /** HTTP method. Defaults to `GET`. */
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Query string parameters. */
  query?: Record<string, string | number | boolean | undefined>;
  /** JSON body (will be serialized). */
  body?: unknown;
  /** Extra headers to send. */
  headers?: Record<string, string>;
  /** Per-request timeout in ms. */
  timeoutMs?: number;
}

export interface TransportResponse<T = unknown> {
  /** HTTP status code. */
  status: number;
  /** Response headers (lowercased keys). */
  headers: Record<string, string>;
  /** Parsed JSON body (or raw text if JSON parsing failed). */
  body: T;
  /** Where the response came from — used in evidence trails. */
  source: "network" | "replay" | "mock";
  /** Wall-clock time the request took (ms). */
  durationMs: number;
  /** Final URL after redirects, if any. */
  finalUrl?: string;
}

export interface Transport {
  /** A short label identifying the transport (e.g. "fetch", "replay"). */
  readonly kind: string;
  /** Execute a request. Must not throw on HTTP errors — return them in the response. */
  execute<T = unknown>(req: TransportRequest): Promise<TransportResponse<T>>;
}

/**
 * Build a query string from a record. Skips `undefined` values.
 * Returns `""` if no params. Does NOT prepend `?`.
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined> | undefined
): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return entries
    .map(
      ([k, v]) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
    )
    .join("&");
}
