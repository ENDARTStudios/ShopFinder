/**
 * ShopFinder — instrumentation server (Next.js)
 *
 * Inicializa observabilidade em runtime (docs/eng/OBSERVABILITY.md):
 *   - Sentry (server) quando SENTRY_DSN configurado
 *   - OpenTelemetry NodeSDK quando OTEL_EXPORTER_OTLP_ENDPOINT configurado
 *
 * Imports dinâmicos mantêm os SDKs fora do caminho crítico de build
 * quando não configurados.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.SENTRY_DSN) {
      await import("./sentry.server.config");
    }
    if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      await import("./otel");
    }
  }
}

/** Captura erros de streaming/SSR de rotas no Sentry (#25). */
export function onRequestError(
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) {
  if (process.env.SENTRY_DSN) {
    import("@sentry/nextjs").then((Sentry) => Sentry.captureRequestError(...args));
  }
}
