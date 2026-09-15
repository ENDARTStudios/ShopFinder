"use client";

/**
 * NOVA_DIRECAO A1/A2 — grava o view do produto no histórico local
 * (client-side, cookieless) e o botão de wishlist (A3, server por conta).
 */
import * as React from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import Link from "next/link";
import { recordView } from "@/lib/history";
import { Button } from "@/components/ui/button";

export function ProductViewRecorder({
  slug,
  title,
  category
}: {
  slug: string;
  title: string;
  category: string | null;
}) {
  React.useEffect(() => {
    recordView({ slug, title, niche: category });
  }, [slug, title, category]);
  return null;
}

export function WishlistButton({
  productId,
  isAuthenticated
}: {
  productId: string;
  isAuthenticated: boolean;
}) {
  const t = useTranslations("wishlist");
  const [inWishlist, setInWishlist] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/wishlist")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { items?: Array<{ productId: string }> } | null) => {
        if (data?.items?.some((i) => i.productId === productId)) setInWishlist(true);
      })
      .catch(() => {
        // best-effort
      });
  }, [productId, isAuthenticated]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (inWishlist) {
        await fetch(`/api/wishlist?productId=${productId}`, { method: "DELETE" });
        setInWishlist(false);
      } else {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId })
        });
        if (res.ok) setInWishlist(true);
      }
    } catch {
      // silencioso
    } finally {
      setBusy(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <Heart className="h-4 w-4" aria-hidden />
        {t("loginCta")}
      </Link>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={inWishlist ? "default" : "outline"}
      disabled={busy}
      onClick={() => void toggle()}
      aria-pressed={inWishlist}
    >
      <Heart className={`mr-1.5 h-4 w-4 ${inWishlist ? "fill-current" : ""}`} aria-hidden />
      {inWishlist ? t("inWishlist") : t("add")}
    </Button>
  );
}
