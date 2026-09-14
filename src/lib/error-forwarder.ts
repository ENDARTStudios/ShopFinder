/**
 * ShopFinder — Forwarder global de erros (client & server)
 *
 * Registry desacoplado entre `reportError` (client-safe) e adapters de
 * backend (Sentry/OTLP): o adapter registra um forwarder no boot e o
 * reportError o invoca sem importar SDKs pesados no bundle compartilhado.
 */

export type ErrorForwarder = (error: unknown, context: Record<string, unknown>) => void;

const FORWARDER_KEY = "__shopfinderErrorForwarder" as const;

interface ForwarderHost {
  [FORWARDER_KEY]?: ErrorForwarder;
}

function host(): ForwarderHost {
  return globalThis as unknown as ForwarderHost;
}

/** Registra o forwarder ativo (último registrado vence). */
export function setErrorForwarder(forwarder: ErrorForwarder | null): void {
  host()[FORWARDER_KEY] = forwarder ?? undefined;
}

/** Invoca o forwarder registrado, se houver. Nunca lança. */
export function forwardError(error: unknown, context: Record<string, unknown>): void {
  try {
    host()[FORWARDER_KEY]?.(error, context);
  } catch {
    // Forwarder nunca deve derrubar o fluxo que reportou o erro.
  }
}
