import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: "Config ausente" }, { status: 500 });
  const id = new URL(req.url).searchParams.get("session_id");
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "session_id inválido" }, { status: 400 });
  }
  try {
    const stripe = new Stripe(key);
    const s = await stripe.checkout.sessions.retrieve(id);
    return NextResponse.json({
      status: s.status,
      payment_status: s.payment_status,
      amount_total: s.amount_total,
      currency: s.currency,
      customer_email: s.customer_details?.email ?? s.customer_email ?? null
    });
  } catch {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
  }
}
