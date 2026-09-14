/**
 * @workspace/seo/metadata
 *
 * Helpers for the Next.js Metadata API. Produces per-route metadata objects
 * with consistent Open Graph / Twitter / canonical defaults.
 */

import type { Metadata } from "next";

export const PACKAGE_NAME = "@workspace/seo" as const;
export const PACKAGE_VERSION = "0.1.0" as const;

export const SITE_DEFAULTS = {
  siteName: process.env.NEXT_PUBLIC_SITE_NAME ?? "Dropshipping Platform",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  defaultLocale: "en",
  twitterHandle: "@dropshipping"
} as const;

export function buildMetadata(params: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  keywords?: string[];
}): Metadata {
  const url = params.path ? `${SITE_DEFAULTS.siteUrl}${params.path}` : SITE_DEFAULTS.siteUrl;
  const image = params.image ?? `${SITE_DEFAULTS.siteUrl}/opengraph-image`;
  return {
    title: params.title,
    description: params.description,
    keywords: params.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: params.title,
      description: params.description,
      url,
      siteName: SITE_DEFAULTS.siteName,
      images: [{ url: image, width: 1200, height: 630 }],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: params.title,
      description: params.description,
      images: [image],
      creator: SITE_DEFAULTS.twitterHandle
    },
    robots: params.noIndex ? { index: false, follow: false } : { index: true, follow: true }
  };
}
