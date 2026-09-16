/**
 * T103 — card de histórico de preço com sparkline SVG (sem lib nova) e
 * indicador "preço justo agora?" — veredito APENAS com ≥7 dias distintos
 * (DECISAO ética T100/T103: sem dado suficiente, estado neutro).
 */
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPriceHistory } from "@/lib/price-history";
import { getUsdBrlRate } from "@/lib/fx-server";

const fmtBrl = (minor: number, rate: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    (Number(minor) * rate) / 100
  );

export async function PriceHistoryCard({ productId }: { productId: string }) {
  const t = await getTranslations("history");
  const h = await getPriceHistory(productId, 90);
  if (h.distinctDays === 0) return null; // sem dado → seção omitida

  const rate = await getUsdBrlRate();
  const W = 300;
  const H = 80;
  const values = h.dailyMins.map((d) => d.minMinor);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = h.dailyMins.length > 1 ? W / (h.dailyMins.length - 1) : W;
  const pts = h.dailyMins
    .map((d, i) => `${(i * step).toFixed(1)},${(H - 8 - ((Number(d.minMinor) - min) / span) * (H - 16)).toFixed(1)}`)
    .join(" ");

  const firstDay = h.dailyMins[0].day;
  const lastDay = h.dailyMins[h.dailyMins.length - 1].day;
  const fmtDay = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
      .format(new Date(iso))
      .replace(/\.$/, "");

  const verdictBadge =
    h.verdict === "below"
      ? { cls: "bg-stock-ok/10 text-stock-ok", label: t("below") }
      : h.verdict === "above"
        ? { cls: "bg-stock-out/10 text-stock-out", label: t("above") }
        : { cls: "bg-muted text-muted-foreground", label: t("fair") };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span>{t("title", { days: h.windowDays })}</span>
          {h.verdict ? (
            <span className={cn("rounded px-2 py-0.5 text-[11px] font-semibold", verdictBadge.cls)}>
              {verdictBadge.label}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {h.distinctDays >= 2 ? (
          <svg viewBox={`0 0 ${W} ${H}`} className="h-20 w-full" role="img" aria-label={t("sparklineAlt")}>
            <polyline
              points={pts}
              fill="none"
              stroke="currentColor"
              className="text-emerald-500"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : null}
        {/* Estado neutro honesto: < 7 dias → NUNCA veredito */}
        {h.distinctDays < 7 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("trackingSince", { date: fmtDay(firstDay) })}{" "}
            {t("verdictNeedsDays", { days: 7 })}
          </p>
        ) : (
          <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">{t("current")}</dt>
              <dd className="price-value font-semibold">{fmtBrl(h.currentMinor ?? 0, rate)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("median90")}</dt>
              <dd className="price-value">{fmtBrl(h.medianMinor ?? 0, rate)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("period")}</dt>
              <dd>
                {fmtDay(firstDay)} – {fmtDay(lastDay)}
              </dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

