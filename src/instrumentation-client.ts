/**
 * ShopFinder — instrumentation client (browser)
 *
 * Carregado pelo Next em todas as rotas client. Inicializa o Sentry
 * browser quando NEXT_PUBLIC_SENTRY_DSN existe (docs/eng/OBSERVABILITY.md).
 */
await import("./sentry.client.config");
