import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

/**
 * Sitemap dinâmico — rotas estáticas + produtos ativos (docs/eng/SEO-AEO-AIO-GEO.md).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://shopfinder.local";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/compare`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${base}/register`, changeFrequency: "yearly", priority: 0.1 }
  ];

  try {
    const products = await db.product.findMany({
      where: { deletedAt: null },
      select: { slug: true, updatedAt: true },
      take: 5000,
      orderBy: { updatedAt: "desc" }
    });

    return [
      ...staticRoutes,
      ...products.map((p) => ({
        url: `${base}/produtos/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8
      }))
    ];
  } catch {
    // Banco indisponível no build — servir ao menos as rotas estáticas
    return staticRoutes;
  }
}
