/**
 * T101 — Snapshot diário de preços (histórico do "preço justo agora?").
 *
 * GET /api/cron/price-snapshots — Bearer $CRON_SECRET (mesmo secret do cron
 * de alertas). Percorre ProductOffer vigente (append-only) e grava 1 snapshot
 * por oferta/dia (idempotência via índice único parcial em date(capturedAt));
 * duplicado do dia é ignorado com skip (P2002), não quebra o batch.
 * Batch limitado a 500 ofertas por run.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@workspace/database";

const BATCH_LIMIT = 500;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const offers = await prisma.productOffer.findMany({
    where: { deletedAt: null, product: { status: "published", deletedAt: null } },
    orderBy: { updatedAt: "desc" },
    take: BATCH_LIMIT,
    select: {
      id: true,
      productId: true,
      supplierId: true,
      priceMinorUnits: true,
      priceCurrencyCode: true,
      supplier: { select: { name: true } }
    }
  });

  let created = 0;
  let skipped = 0;

  for (const offer of offers) {
    try {
      const now = new Date();
      const capturedDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      await prisma.priceSnapshot.create({
        data: {
          productId: offer.productId,
          offerId: offer.id,
          supplier: offer.supplier.name,
          priceMinor: offer.priceMinorUnits,
          currency: offer.priceCurrencyCode,
          capturedDay
        }
      });
      created++;
    } catch (error) {
      // P2002 = snapshot de hoje já existe (idempotência por dia)
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        skipped++;
        continue;
      }
      throw error;
    }
  }

  return NextResponse.json({ ok: true, offers: offers.length, created, skipped });
}
