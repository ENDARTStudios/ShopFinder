/**
 * T103 — resumo de reviews: média + distribuição de notas (1-5) + contagem.
 * Reusa os dados da API de reviews do T081 (mesma fonte: Review published).
 * Sem reviews → CTA discreto (texto + âncora para a seção de reviews).
 */
import { Star } from "lucide-react";
import { prisma } from "@workspace/database";
import { getTranslations } from "next-intl/server";

export async function ReviewsSummary({
  productId,
  reviewsHref
}: {
  productId: string;
  reviewsHref: string;
}) {
  const t = await getTranslations("reviews");

  const [grouped, agg] = await Promise.all([
    prisma.review.groupBy({
      by: ["rating"],
      where: { productId, status: "published" },
      _count: { rating: true }
    }),
    prisma.review.aggregate({
      where: { productId, status: "published" },
      _avg: { rating: true },
      _count: { rating: true }
    })
  ]);

  const total = agg._count.rating;
  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground" id="reviews-summary">
        {t("beFirst")}
      </p>
    );
  }

  const avg = agg._avg.rating ?? 0;
  const dist = new Map<number, number>();
  for (const g of grouped) dist.set(g.rating, g._count.rating);

  return (
    <div id="reviews-summary" className="flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-2">
        <span className="price-value text-4xl font-black">{avg.toFixed(1)}</span>
        <div>
          <span className="flex" aria-hidden>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                }`}
              />
            ))}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("basedOn", { count: total })}
          </span>
        </div>
      </div>

      <div className="min-w-[180px] flex-1 space-y-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = dist.get(star) ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-muted-foreground">{star}</span>
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 text-right text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>

      <a
        href={reviewsHref}
        className="text-sm font-medium text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-400"
      >
        {t("seeAll")}
      </a>
    </div>
  );
}
