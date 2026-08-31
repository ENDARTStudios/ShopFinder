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
  // (docs/eng/OBSERVABILITY.md — instrumentation.ts os importa em runtime)
  serverExternalPackages: [
    "@opentelemetry/api",
    "@opentelemetry/sdk-node",
    "@opentelemetry/resources",
    "@opentelemetry/semantic-conventions",
    "@opentelemetry/auto-instrumentations-node",
    "@opentelemetry/exporter-trace-otlp-http"
  ],
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
