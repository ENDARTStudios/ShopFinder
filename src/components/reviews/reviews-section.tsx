"use client";

/**
 * ShopFinder — Seção de reviews do produto (T081).
 *
 * Lista reviews publicados + média + formulário (só logado). Deslogado mostra
 * CTA de login. Moderação básica: flagged não aparece na listagem pública.
 */
import * as React from "react";
import { useTranslations } from "next-intl";
import { Star, Loader2 } from "lucide-react";
import Link from "next/link";
import { ReviewForm } from "./review-form";

interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  customerName: string | null;
}

export function ReviewsSection({
  productId,
  isAuthenticated
}: {
  productId: string;
  isAuthenticated: boolean;
}) {
  const t = useTranslations("reviews");
  const [reviews, setReviews] = React.useState<ReviewItem[]>([]);
  const [avgRating, setAvgRating] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`);
      if (res.ok) {
        const data = (await res.json()) as { reviews: ReviewItem[]; avgRating: number | null };
        setReviews(data.reviews ?? []);
        setAvgRating(data.avgRating ?? null);
      }
    } catch {
      // silencioso — seção de reviews nunca quebra a página
    } finally {
      setLoading(false);
    }
  }, [productId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <section aria-labelledby="reviews-heading" className="mt-10 border-t border-border/40 pt-8">
      <h2 id="reviews-heading" className="mb-4 text-lg font-semibold">
        {t("title")}
      </h2>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("loading")}
        </div>
      ) : (
        <>
          {avgRating !== null && (
            <div className="mb-4 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  aria-hidden
                  className={`h-4 w-4 ${i < Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                />
              ))}
              <span className="ml-1 text-sm font-bold">{avgRating.toFixed(1)}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {t("reviewCount", { count: reviews.length })}
              </span>
            </div>
          )}

          {reviews.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noReviews")}</p>
          )}

          {reviews.length > 0 && (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-lg border border-border/40 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      role="img"
                      aria-label={t("starRating", { rating: r.rating })}
                      className="flex"
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          aria-hidden
                          className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </span>
                    <span className="text-xs font-medium">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                    {r.customerName && (
                      <span className="text-xs text-muted-foreground">{r.customerName}</span>
                    )}
                  </div>
                  {r.title && <p className="text-sm font-semibold">{r.title}</p>}
                  <p className="whitespace-pre-line text-sm text-muted-foreground">{r.body}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            {isAuthenticated ? (
              <ReviewForm productId={productId} onSubmitted={load} />
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link href="/login" className="font-medium underline underline-offset-4">
                  {t("loginToReview")}
                </Link>
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
