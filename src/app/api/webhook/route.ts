import { NextResponse } from "next/server";
import Stripe from "stripe";

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
    console.info("[webhook] pago", { id: s.id, skus: s.metadata?.skus, status: s.payment_status });
  }
  return NextResponse.json({ received: true });
}
