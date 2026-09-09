import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Standalone é para self-host (Docker/local com `npm run build`). Na Vercel
  // o builder faz o próprio bundling — com standalone o build do Next 16
  // falha com ENOENT em .next/next-server.js.nft.json.
  output: process.env.VERCEL ? undefined : "standalone",
  typescript: {
    ignoreBuildErrors: false
  },
  reactStrictMode: false,
  // SDKs de observabilidade rodam externos ao bundle do servidor
  // (docs/eng/OBSERVABILITY.md — instrumentation.ts os importa em runtime).
  // T070: a stack OTel saiu desta lista — serverExternalPackages copia o
  // pacote INTEIRO para cada função (ignora outputFileTracingExcludes), e o
  // OTel é peso morto sem OTEL_EXPORTER_OTLP_ENDPOINT (instrumentation.ts
  // guarda por env). Para reativar: devolver os pacotes à lista E remover as
  // outputFileTracingExcludes de @opentelemetry abaixo.
  serverExternalPackages: [],
  // T070 — peso morto FORA do bundle serverless. A stack OTel (e os hooks
  // import-in-the-middle/require-in-the-middle + systeminformation) só roda
  // quando OTEL_EXPORTER_OTLP_ENDPOINT está configurado — hoje não está em
  // produção (src/instrumentation.ts guarda por env). bullmq é exportado pelo
  // barrel do infrastructure mas nenhuma rota o importa. Para REATIVAR OTel,
  // remover estas exclusões e redeployar. Prisma engine NÃO é excluído.
  outputFileTracingExcludes: {
    "*": [
      "**/node_modules/@opentelemetry/**",
      "**/node_modules/import-in-the-middle/**",
      "**/node_modules/require-in-the-middle/**",
      "**/node_modules/systeminformation/**",
      "**/node_modules/@grpc/**",
      "**/node_modules/protobufjs/**",
      "**/node_modules/bullmq/**"
    ]
  },
  // Security headers — docs/eng/SECURITY.md (TLS Full (Strict) na edge)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          }
        ]
      },
      {
        // APIs nunca devem ser cacheadas/framed
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }]
      }
    ];
  }
};

export default withNextIntl(nextConfig);
