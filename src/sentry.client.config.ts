/**
 * Sentry — browser (docs/eng/OBSERVABILITY.md)
 *
 * Importado por src/instrumentation-client.ts (carregado pelo Next em
 * todas as rotas client). Sem NEXT_PUBLIC_SENTRY_DSN o init é pulado.
 */
import * as Sentry from "@sentry/nextjs";
import { setErrorForwarder, type ErrorForwarder } from "@/lib/error-forwarder";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1)
  });

  const forwarder: ErrorForwarder = (error, context) => {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        if (key !== "_serialized") {
          scope.setTag(`ctx.${key}`, String(value));
        }
      }
      Sentry.captureException(error);
    });
  };
  setErrorForwarder(forwarder);
}
