"use client";

/**
 * ShopFinder — /admin/reviews (T082).
 *
 * Painel de moderação: lista reviews flagged + removed e permite
 * Aprovar (→ published, volta ao público) ou Remover (→ removed),
 * ambos com confirmação. RBAC: a API exige admin.access; não-admin
 * vê "acesso restrito" (403).
 */
import * as React from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ModerationReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  productTitle: string;
  productSlug: string;
  customerName: string;
  customerEmail: string;
}

export default function ReviewsAdminPage() {
  const t = useTranslations("adminReviews");
  const { status } = useSession();
  const [reviews, setReviews] = React.useState<ModerationReview[] | null>(null);
  const [error, setError] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reviews");
      if (!res.ok) {
        setError(true);
        setReviews(null);
        return;
      }
      const data = (await res.json()) as { reviews: ModerationReview[] };
      setReviews(data.reviews);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    void load();
  }, [status, load]);

  async function moderate(id: string, action: "approve" | "remove") {
    if (busyId) return;
    const confirmed = window.confirm(
      action === "approve" ? t("confirmApprove") : t("confirmRemove")
    );
    if (!confirmed) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) await load();
    } finally {
      setBusyId(null);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t("loading")}
      </div>
    );
  }

  if (status === "unauthenticated" || error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t("accessDenied")}
      </div>
    );
  }

  const flagged = reviews?.filter((r) => r.status === "flagged") ?? [];
  const removed = reviews?.filter((r) => r.status === "removed") ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/admin"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToDashboard")}
      </Link>

      <h1 className="mb-1 text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{t("subtitle")}</p>

      {!reviews ? (
        <p className="text-sm text-muted-foreground">{t("loadingData")}</p>
      ) : (
        <div className="space-y-10">
          <section aria-labelledby="flagged-heading">
            <h2
              id="flagged-heading"
              className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground"
            >
              {t("flaggedSection", { count: flagged.length })}
            </h2>
            {flagged.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("emptyFlagged")}</p>
            ) : (
              <ul className="space-y-4">
                {flagged.map((r) => (
                  <ReviewCard key={r.id} review={r} busy={busyId === r.id} onModerate={moderate} t={t} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="removed-heading">
            <h2
              id="removed-heading"
              className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground"
            >
              {t("removedSection", { count: removed.length })}
            </h2>
            {removed.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("emptyRemoved")}</p>
            ) : (
              <ul className="space-y-4">
                {removed.map((r) => (
                  <ReviewCard key={r.id} review={r} busy={busyId === r.id} onModerate={moderate} t={t} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  busy,
  onModerate,
  t
}: {
  review: ModerationReview;
  busy: boolean;
  onModerate: (id: string, action: "approve" | "remove") => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <li className="rounded-lg border border-border/40 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge
          className={
            review.status === "flagged"
              ? "bg-amber-500/90 text-white"
              : "bg-red-500/90 text-white"
          }
        >
          {review.status === "flagged" ? t("statusFlagged") : t("statusRemoved")}
        </Badge>
        <span>{review.rating}/5</span>
        <span>{new Date(review.createdAt).toLocaleDateString()}</span>
        <Link
          href={`/produtos/${review.productSlug}`}
          className="font-medium underline underline-offset-4"
        >
          {review.productTitle}
        </Link>
      </div>
      {review.title && <p className="text-sm font-semibold">{review.title}</p>}
      <p className="mb-1 whitespace-pre-line text-sm text-muted-foreground">{review.body}</p>
      <p className="mb-3 text-xs text-muted-foreground">
        {review.customerName} · {review.customerEmail}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onModerate(review.id, "approve")}
        >
          <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-500" aria-hidden />
          {t("approve")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onModerate(review.id, "remove")}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5 text-red-500" aria-hidden />
          {t("remove")}
        </Button>
      </div>
    </li>
  );
}
