/**
 * ShopFinder — Cron de alertas de preço (T083).
 *
 * GET /api/cron/price-alerts — protegido por `Authorization: Bearer $CRON_SECRET`
 * (Vercel Cron env; falha FECHADA se CRON_SECRET não estiver configurado).
 *
 * Para até 50 alertas ativos por run: compara o alvo (BRL minor) com o melhor
 * preço corrente de oferta convertido para BRL (taxa server-side com cache —
 * mesma fonte exibida ao usuário). Preço <= alvo → cria Notification in-app
 * para o customer e marca o alerta `triggered`. Idempotente: alertas
 * `triggered` nunca são reprocessados.
 *
 * Nota de escopo (ADR-0031): o preço corrente vem do catálogo alimentado pelo
 * pipeline de conectores — o cron não chama APIs de fornecedor diretamente
 * (rate limit/auth ficam na camada de sync). Email adiado.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@workspace/database";
import { getUsdBrlRate } from "@/lib/fx-server";

const BATCH_LIMIT = 50;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await prisma.priceAlert.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "asc" },
    take: BATCH_LIMIT,
    select: {
      id: true,
      productId: true,
      customerId: true,
      storeId: true,
      targetPriceMinor: true,
      product: { select: { title: true, slug: true } }
    }
  });

  let triggered = 0;
  let checked = 0;

  if (alerts.length > 0) {
    const rate = await getUsdBrlRate();

    for (const alert of alerts) {
      const offers = await prisma.productOffer.findMany({
        where: { productId: alert.productId, deletedAt: null },
        select: { priceMinorUnits: true, priceCurrencyCode: true }
      });
      if (offers.length === 0) continue;
      checked++;

      // Melhor oferta convertida para BRL minor (mesma conversão da UI).
      let bestBrlMinor: bigint | null = null;
      for (const offer of offers) {
        const brlMinor =
          offer.priceCurrencyCode === "BRL"
            ? offer.priceMinorUnits
            : BigInt(Math.round(Number(offer.priceMinorUnits) * rate));
        if (bestBrlMinor === null || brlMinor < bestBrlMinor) bestBrlMinor = brlMinor;
      }
      if (bestBrlMinor === null || bestBrlMinor > alert.targetPriceMinor) continue;

      const [notification] = await prisma.$transaction([
        prisma.notification.create({
          data: {
            customerId: alert.customerId,
            storeId: alert.storeId,
            type: "price_alert",
            severity: "info",
            message: `Preço alvo atingido: ${alert.product.title} — R$ ${(Number(bestBrlMinor) / 100).toFixed(2)}`,
            link: `/produtos/${alert.product.slug}`
          },
          select: { id: true }
        }),
        prisma.priceAlert.update({
          where: { id: alert.id },
          data: { status: "triggered", triggeredAt: new Date() }
        })
      ]);
      void notification;
      triggered++;
    }
  }

  return NextResponse.json({ ok: true, processed: alerts.length, checked, triggered });
}
