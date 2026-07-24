import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@workspace/database/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret) {
    console.warn("[webhook] STRIPE_WEBHOOK_SECRET ausente");
    return NextResponse.json({ error: "webhook não configurado" }, { status: 400 });
  }
  if (!sig) return NextResponse.json({ error: "assinatura ausente" }, { status: 400 });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = new Stripe(process.env.STRIPE_SECRET_KEY!).webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    try {
      const itemsMeta: Array<{ sku: string; qty: number }> = s.metadata?.items
        ? JSON.parse(s.metadata.items)
        : [];

      const order = await prisma.order.create({
        data: {
          stripeSessionId: s.id,
          stripePaymentIntentId: s.payment_intent ?? null,
          customerEmail: s.customer_details?.email ?? null,
          customerName: s.customer_details?.name ?? null,
          status: "paid",
          amountTotal: s.amount_total ?? 0,
          currency: s.currency ?? "usd",
          metadata: s.metadata ?? undefined,
          items: {
            create: itemsMeta.map((it) => ({
              sku: it.sku,
              title: it.sku, // fallback; pode buscar product.title se quiser
              price: 0, // placeholder; o preço real está no line_item da sessão
              currency: s.currency ?? "usd",
              qty: it.qty
            }))
          }
        }
      });

      console.info("[webhook] Order criado", { orderId: order.id, skus: itemsMeta.map((i) => i.sku) });
    } catch (e) {
      console.error("[webhook] Erro ao criar Order", e);
    }
  }

  return NextResponse.json({ received: true });
}
