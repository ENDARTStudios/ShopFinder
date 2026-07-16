/**
 * @workspace/infrastructure/connectors/amazon/errors
 *
 * Amazon-specific error helpers.
 */
export const AmazonErrors = {
  lwaTokenFailed: (status: number, body: string) => ({
    code: "AUTH",
    message: `LWA token refresh failed (${status}): ${body.slice(0, 200)}`,
    retriable: false,
    statusCode: status,
  }),

  sigV4Failed: (detail: string) => ({
    code: "AUTH",
    message: `SigV4 signing failed: ${detail}`,
    retriable: false,
  }),

  rateLimited: () => ({
    code: "RATE_LIMIT",
    message: "Amazon SP-API rate limit exceeded",
    retriable: true,
    statusCode: 429,
  }),

  quotaExceeded: (quota: string) => ({
    code: "OVER_QUOTA",
    message: `Amazon SP-API quota exceeded: ${quota}`,
    retriable: true,
    statusCode: 429,
  }),

  invalidResponse: (detail: string) => ({
    code: "INVALID_RESPONSE",
    message: `Invalid Amazon response: ${detail}`,
    retriable: false,
  }),
} as const;
