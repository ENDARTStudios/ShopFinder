"use client";

/**
 * ShopFinder — Lista de alertas de preço do usuário (T083, seção de /conta).
 *
 * Mostra status (active/triggered), alvo e produto; remover = DELETE com
 * confirmação (status → disabled no servidor).
 */
import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Bell, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AlertItem {
  id: string;
  targetPriceMinor: string;
  currency: string;
  status: string;
  triggeredAt: string | null;
  createdAt: string;
  productTitle: string;
  productSlug: string;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function AlertsList() {
  const t = useTranslations("alerts");
  const [alerts, setAlerts] = React.useState<AlertItem[] | null>(null);
  const [error, setError] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      if (!res.ok) {
        setError(true);
        setAlerts(null);
        return;
      }
      const data = (await res.json()) as { alerts: AlertItem[] };
      setAlerts(data.alerts);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    if (busyId) return;
    if (!window.confirm(t("removeConfirm"))) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      if (res.ok) await load();
    } finally {
      setBusyId(null);
    }
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">{t("error")}</p>;
  }

  if (!alerts) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t("loading")}
      </div>
    );
  }

  if (alerts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <ul className="space-y-3">
      {alerts.map((a) => (
        <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge
                className={
                  a.status === "triggered"
                    ? "bg-emerald-500/90 text-white"
                    : "bg-slate-500/90 text-white"
                }
              >
                {a.status === "triggered" ? t("statusTriggered") : t("statusActive")}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {t("targetLabel", { price: brl.format(Number(a.targetPriceMinor) / 100) })}
              </span>
              {a.triggeredAt && (
                <span className="text-xs text-muted-foreground">
                  {new Date(a.triggeredAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <Link
              href={`/produtos/${a.productSlug}`}
              className="text-sm font-medium underline underline-offset-4"
            >
              {a.productTitle}
            </Link>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === a.id}
            onClick={() => void remove(a.id)}
            aria-label={t("remove")}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  );
}
