/**
 * ShopFinder — Captura de erros (client & server)
 *
 * Sempre loga (JSON estruturado); forward para o adapter registrado
 * (Sentry via instrumentation, ver src/instrumentation*.ts) quando
 * SENTRY_DSN estiver configurado (docs/eng/OBSERVABILITY.md).
 * Client-safe: sem imports de node.
 */
import { forwardError } from "./error-forwarder";

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

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
  if (dsn) {
    forwardError(error, { ...context, _serialized: serialized });
  }
}
