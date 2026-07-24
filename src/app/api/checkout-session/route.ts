import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@workspace/database/client";

export const runtime = "nodejs";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY ausente");
  return new Stripe(key);
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const body = (await req.json().catch(() => ({}))) as {
      items?: Array<{ sku?: unknown; qty?: unknown }>;
    };
    const raw = Array.isArray(body.items) ? body.items : [];
    if (raw.length === 0 || raw.length > 50) {
      return NextResponse.json({ error: "Carrinho inválido" }, { status: 400 });
    }

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const skus: string[] = [];

    for (const it of raw) {
      const sku = typeof it.sku === "string" ? it.sku : "";
      const qty = typeof it.qty === "number" ? Math.trunc(it.qty) : 0;
      if (!sku || qty < 1 || qty > 99) {
        return NextResponse.json({ error: `Item inválido: ${sku}` }, { status: 400 });
      }
      const product = await prisma.product.findFirst({
        where: { sku, status: "published", deletedAt: null },
        include: { offers: { where: { deletedAt: null }, orderBy: { priceMinorUnits: "asc" } } }
      });
      if (!product) {
        return NextResponse.json({ error: `Produto não encontrado: ${sku}` }, { status: 400 });
      }
      const cheapest = product.offers[0];
      const unit = cheapest ? Number(cheapest.priceMinorUnits) : Number(product.basePriceMinorUnits);
      const currency = (cheapest?.currency ?? product.basePriceCurrencyCode ?? "USD").toLowerCase();
      if (!Number.isFinite(unit) || unit <= 0) {
        return NextResponse.json({ error: `Preço inválido: ${sku}` }, { status: 400 });
      }
      skus.push(sku);
      line_items.push({
        quantity: qty,
        price_data: {
          currency,
          unit_amount: unit,
          product_data: { name: product.title }
        }
      });
    }

    const base =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "https://shop-finder-taupe.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      automatic_payment_methods: { enabled: true },
      success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout/cancel`,
      metadata: { skus: skus.join(",") }
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar sessão";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
