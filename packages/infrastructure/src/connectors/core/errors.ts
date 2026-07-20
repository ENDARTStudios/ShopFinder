/**
 * @workspace/infrastructure/connectors/core/errors
 *
 * Connector error taxonomy — maps HTTP/network errors to
 * the domain's ErrorTaxonomy (from evaluation/contracts).
 */
export const ConnectorErrors = {
  rateLimited: (retryAfter?: number) => ({
    code: "RATE_LIMIT",
    message: retryAfter ? `Rate limited, retry after ${retryAfter}s` : "Rate limited",
    retriable: true,
    statusCode: 429
  }),

  timeout: (url: string, ms: number) => ({
    code: "TIMEOUT",
    message: `Request to ${url} timed out after ${ms}ms`,
    retriable: true
  }),

  network: (url: string, cause: unknown) => ({
    code: "NETWORK",
    message: `Network error requesting ${url}: ${cause instanceof Error ? cause.message : String(cause)}`,
    retriable: true,
    cause
  }),

  auth: (provider: string) => ({
    code: "AUTH",
    message: `Authentication failed for ${provider}`,
    retriable: false,
    statusCode: 401
  }),

  forbidden: (provider: string) => ({
    code: "AUTH",
    message: `Access forbidden for ${provider}`,
    retriable: false,
    statusCode: 403
  }),

  notFound: (resource: string) => ({
    code: "NOT_FOUND",
    message: `${resource} not found`,
    retriable: false,
    statusCode: 404
  }),

  badRequest: (detail: string) => ({
    code: "BAD_DATA",
    message: `Bad request: ${detail}`,
    retriable: false,
    statusCode: 400
  }),

  serverError: (status: number, body: string) => ({
    code: "NETWORK",
    message: `Server error ${status}: ${body.slice(0, 200)}`,
    retriable: true,
    statusCode: status
  }),

  overQuota: (provider: string) => ({
    code: "OVER_QUOTA",
    message: `Quota exceeded for ${provider}`,
    retriable: true,
    statusCode: 429
  }),

  invalidResponse: (detail: string) => ({
    code: "INVALID_RESPONSE",
    message: `Invalid response: ${detail}`,
    retriable: true
  }),

  unknown: (cause: unknown) => ({
    code: "UNKNOWN",
    message: cause instanceof Error ? cause.message : String(cause),
    retriable: false,
    cause
  })
} as const;

/**
 * Map an HTTP status code to a connector error.
 */
export function fromHttpStatus(status: number, body: string, url: string): {
  code: string;
  message: string;
  retriable: boolean;
  statusCode: number;
} {
  if (status === 401) return ConnectorErrors.auth(url);
  if (status === 403) return ConnectorErrors.forbidden(url);
  if (status === 404) return ConnectorErrors.notFound(url);
  if (status === 429) return ConnectorErrors.rateLimited();
  if (status >= 400 && status < 500) return ConnectorErrors.badRequest(`HTTP ${status}`);
  if (status >= 500) return ConnectorErrors.serverError(status, body);
  return ConnectorErrors.unknown(`Unexpected status: ${status}`);
}
