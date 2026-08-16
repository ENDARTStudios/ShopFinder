/**
 * ShopFinder — Compatible Products (Client Component)
 *
 * Fetches from /api/products/[slug]/knowledge and displays
 * products that are compatible with or from the same manufacturer.
 *
 * This is the Knowledge Graph exposed to the user — they can see
 * which products work together (e.g., CPU + motherboard with matching socket).
 */
"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Network, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProductCardSkeletonGrid } from "@/components/site/product-card-skeleton";
import { FadeIn, FadeInStagger, FadeInItem } from "@/components/motion/fade-in";

interface CompatibleProduct {
  slug: string;
  title: string;
  category: string | null;
  price: number;
  relationType: string;
}

interface KnowledgeResponse {
  manufacturer: { code: string; name: string; authorityScore: number; country: string; tier: string } | null;
  compatibleProducts: CompatibleProduct[];
  totalRelations: number;
}

export function CompatibleProducts({ slug }: { slug: string }) {
  const [data, setData] = React.useState<KnowledgeResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/products/${slug}/knowledge`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return <ProductCardSkeletonGrid count={3} />;
  }

  if (!data || data.compatibleProducts.length === 0) {
    return null; // Don't show the section if no compatible products
  }

  return (
    <FadeIn>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-emerald-500" />
            Produtos Compatíveis
            <Badge variant="outline" className="ml-1 text-xs">
              {data.totalRelations} relação(ões)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.manufacturer && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm">
              <Badge className="bg-emerald-500/90 text-white">
                Tier {data.manufacturer.tier}
              </Badge>
              <span className="text-muted-foreground">Fabricante:</span>
              <span className="font-medium">{data.manufacturer.name}</span>
              <span className="text-xs text-muted-foreground">
                Authority: {data.manufacturer.authorityScore}
              </span>
            </div>
          )}

          <FadeInStagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.compatibleProducts.map((cp) => (
              <FadeInItem key={cp.slug}>
                <Link
                  href={`/produtos/${cp.slug}`}
                  className="group flex items-center justify-between rounded-lg border border-border/40 p-3 transition-all hover:border-emerald-500/40 hover:shadow-sm"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium line-clamp-2">{cp.title}</div>
                    <div className="mt-1 flex items-center gap-2">
                      {cp.category && (
                        <Badge variant="outline" className="text-[10px]">
                          {cp.category}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {cp.relationType === "compatible_with" ? "Compatível" : "Mesmo fabricante"}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-emerald-500">
                      ${cp.price.toFixed(2)}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Link>
              </FadeInItem>
            ))}
          </FadeInStagger>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
