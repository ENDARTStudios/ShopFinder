/**
 * @workspace/infrastructure/connectors/core/retry
 *
 * Connector retry policy — decides whether to retry an HTTP request
 * based on status code and error type.
 */
import type { ConnectorRetryPolicy, ConnectorError } from "./types";

export class HttpRetryPolicy implements ConnectorRetryPolicy {
  readonly name = "http-retry";
  readonly maxAttempts: number;

  private readonly retriableStatusCodes = new Set([
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ]);

  constructor(maxAttempts: number = 3, private readonly baseDelayMs: number = 500) {
    this.maxAttempts = maxAttempts;
  }

  shouldRetry(attempt: number, error: ConnectorError): boolean {
    if (attempt >= this.maxAttempts) return false;
    if (!error.retriable) return false;
    if (error.statusCode && this.retriableStatusCodes.has(error.statusCode)) return true;
    return error.retriable;
  }

  getDelay(attempt: number): number {
    const exp = this.baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = 0.8 + Math.random() * 0.4;
    return Math.round(exp * jitter);
  }
}

export class NoRetryPolicy implements ConnectorRetryPolicy {
  readonly name = "no-retry";
  readonly maxAttempts = 1;
  shouldRetry(): boolean { return false; }
  getDelay(): number { return 0; }
}

export function createHttpRetryPolicy(maxAttempts?: number, baseDelayMs?: number): HttpRetryPolicy {
  return new HttpRetryPolicy(maxAttempts, baseDelayMs);
}

export function createNoRetryPolicy(): NoRetryPolicy {
  return new NoRetryPolicy();
}

// ── Error factory ──────────────────────────────────────────

export function toConnectorError(error: unknown): ConnectorError {
  if (error && typeof error === "object" && "code" in error && "retriable" in error) {
    return error as ConnectorError;
  }
  const message = error instanceof Error ? error.message : String(error);
  const statusCode = (error as { status?: number })?.status;
  return {
    code: statusCode ? `HTTP_${statusCode}` : "UNKNOWN",
    message,
    retriable: statusCode ? statusCode >= 500 || statusCode === 429 : false,
    statusCode,
    cause: error
  };
}
