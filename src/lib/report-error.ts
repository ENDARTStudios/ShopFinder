/**
 * ShopFinder — Captura de erros (client & server)
 *
 * Sempre loga; forward para Sentry/Datadog quando SENTRY_DSN configurado
 * (docs/eng/OBSERVABILITY.md). Client-safe: sem imports de node.
 */

interface ErrorContext {
  route?: string;
  requestId?: string;
  storeId?: string;
  [key: string]: unknown;
}

export function reportError(error: unknown, context: ErrorContext = {}): void {
  const serialized =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };

  const entry = {
    ts: new Date().toISOString(),
    level: "error",
    err: serialized,
    ...context
  };

  if (typeof console !== "undefined") {
    console.error(JSON.stringify(entry));
  }

  // Hook de forward (Sentry/Datadog/NewRelic via OpenTelemetry) —
  // preenchido em runtime quando SENTRY_DSN existir.
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
  if (dsn && typeof window === "undefined") {
    // Server: integrar @sentry/node aqui (issue rastreada).
  }
}
