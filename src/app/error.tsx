"use client";

/**
 * Error boundary de rota (App Router).
 * UI com animação de entrada suave (docs/eng/MOTION-SYSTEM.md).
 */
import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

export default function RouteError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { route: typeof window !== "undefined" ? window.location.pathname : "unknown" });
  }, [error]);

  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center"
      style={{
        animation: "fade-slide-in 250ms cubic-bezier(0.05, 0.7, 0.1, 1) both"
      }}
    >
      <h2 className="text-2xl font-semibold tracking-tight">Algo deu errado</h2>
      <p className="max-w-md text-muted-foreground">
        Encontramos um erro inesperado ao carregar esta página. Nossa equipe já foi
        notificada.
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        Tentar de novo
      </button>
    </div>
  );
}
