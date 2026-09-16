/**
 * T103 — histórico de preço do produto (PriceSnapshot, janela de 90 dias).
 *
 * Ética do indicador (mesma do T100): veredito "preço justo" SOMENTE com
 * ≥7 capturedDay distintos. Abaixo disso: estado neutro, sem veredito.
 */
import { prisma } from "@workspace/database";

export interface DailyMin {
  day: string; // YYYY-MM-DD (UTC)
  minMinor: number;
}

export interface PriceHistory {
  currency: string;
  dailyMins: DailyMin[]; // ascendente por dia
  distinctDays: number;
  firstCapture: Date | null;
  currentMinor: number | null;
  medianMinor: number | null;
  /** null = histórico insuficiente (< 7 dias) — NUNCA exibir veredito. */
  verdict: "below" | "fair" | "above" | null;
  windowDays: number;
}

export async function getPriceHistory(productId: string, windowDays = 90): Promise<PriceHistory> {
  const cutoff = new Date(Date.now() - windowDays * 86_400_000);
  const rows = await prisma.priceSnapshot.findMany({
    where: { productId, capturedAt: { gte: cutoff } },
    orderBy: { capturedAt: "asc" },
    select: { priceMinor: true, currency: true, capturedDay: true, capturedAt: true }
  });

  if (rows.length === 0) {
    return {
      currency: "USD",
      dailyMins: [],
      distinctDays: 0,
      firstCapture: null,
      currentMinor: null,
      medianMinor: null,
      verdict: null,
      windowDays
    };
  }

  // Moeda dominante (ofertas do catálogo são consistentes entre si por produto).
  const currency = rows[0].currency;
  const byDay = new Map<string, number>();
  let firstCapture: Date | null = null;
  for (const r of rows) {
    if (r.currency !== currency) continue;
    const day = r.capturedDay.toISOString().slice(0, 10);
    const cur = byDay.get(day);
    if (cur === undefined || r.priceMinor < cur) byDay.set(day, Number(r.priceMinor));
    if (!firstCapture || r.capturedAt < firstCapture) firstCapture = r.capturedAt;
  }

  const dailyMins = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, minMinor]) => ({ day, minMinor }));

  const values = dailyMins.map((d) => d.minMinor).sort((a, b) => a - b);
  const median =
    values.length === 0
      ? null
      : values.length % 2 === 1
        ? values[(values.length - 1) / 2]
        : Math.round((values[values.length / 2 - 1] + values[values.length / 2]) / 2);

  const current = dailyMins.length > 0 ? dailyMins[dailyMins.length - 1].minMinor : null;
  const distinctDays = dailyMins.length;

  let verdict: PriceHistory["verdict"] = null;
  if (distinctDays >= 7 && current !== null && median !== null && median > 0) {
    const ratio = current / median;
    verdict = ratio < 0.95 ? "below" : ratio > 1.05 ? "above" : "fair";
  }

  return {
    currency,
    dailyMins,
    distinctDays,
    firstCapture,
    currentMinor: current,
    medianMinor: median,
    verdict,
    windowDays
  };
}
