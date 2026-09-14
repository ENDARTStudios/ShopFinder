/**
 * Sentry — server (docs/eng/OBSERVABILITY.md)
 *
 * Importado dinamicamente por src/instrumentation.ts. Sem SENTRY_DSN o
 * init é pulado (SDK fica inerte — sem export, sem overhead).
 */
import * as Sentry from "@sentry/nextjs";
import { setErrorForwarder, type ErrorForwarder } from "@/lib/error-forwarder";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1)
  });
  // contexto de tenant disponível como tag em todos os eventos
  Sentry.setTags({ service: "shopfinder-web" });

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
