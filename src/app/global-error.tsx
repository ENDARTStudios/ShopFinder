"use client";

/**
 * Error boundary raiz — substitui <html>/<body> inteiros quando falha o layout.
 */
import { reportError } from "@/lib/report-error";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  reportError(error, { route: "global-error-boundary" });

  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          textAlign: "center",
          padding: "16px"
        }}
      >
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Erro inesperado</h2>
        <p style={{ color: "#666", maxWidth: "28rem" }}>
          O aplicativo encontrou um erro crítico. Tente recarregar a página.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            background: "#111",
            color: "#fff",
            border: "none",
            cursor: "pointer"
          }}
        >
          Recarregar
        </button>
      </body>
    </html>
  );
}
