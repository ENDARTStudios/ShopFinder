"use client";

/**
 * NOVA_DIRECAO A3 — lista de wishlist do usuário (seção de /conta).
 */
import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WishlistEntry {
  id: string;
  productId: string;
  productTitle: string | null;
  productSlug: string | null;
}

export function WishlistList() {
  const t = useTranslations("wishlist");
  const [items, setItems] = React.useState<WishlistEntry[] | null>(null);
  const [error, setError] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/wishlist");
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = (await res.json()) as { items: WishlistEntry[] };
      setItems(data.items);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function remove(productId: string) {
    if (busyId) return;
    setBusyId(productId);
    try {
      const res = await fetch(`/api/wishlist?productId=${productId}`, { method: "DELETE" });
      if (res.ok) await load();
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <p className="text-sm text-muted-foreground">{t("error")}</p>;
  if (!items)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t("loading")}
      </div>
    );
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{t("empty")}</p>;

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
          {item.productSlug ? (
            <Link href={`/produtos/${item.productSlug}`} className="text-sm font-medium underline underline-offset-4">
              {item.productTitle}
            </Link>
          ) : (
            <span className="text-sm">{item.productTitle ?? item.productId}</span>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === item.productId}
            onClick={() => void remove(item.productId)}
            aria-label={t("remove")}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  );
}
