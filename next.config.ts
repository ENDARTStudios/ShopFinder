import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true
  },
  reactStrictMode: false,
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
