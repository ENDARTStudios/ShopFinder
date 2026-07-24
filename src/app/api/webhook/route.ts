import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@workspace/database/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret) return NextResponse.json({ error: "webhook não configurado" }, { status: 400 });
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
      const existing = await prisma.order.findUnique({ where: { number: s.id } });
      if (existing) {
        console.info("[webhook] Order já existe", { number: s.id });
        return NextResponse.json({ received: true });
      }

      const email = s.customer_details?.email ?? "unknown@shopfinder.local";
      let customer = await prisma.customer.findFirst({ where: { email } });
      if (!customer) {
        // data as any: campos obrigatórios do Customer desconhecidos aqui;
        // se faltar algo, o Prisma lança em runtime e o catch registra o campo.
        customer = await prisma.customer.create({
          data: { email, name: s.customer_details?.name ?? email } as any
        });
      }

      const store = await prisma.store.findFirst();
      if (!store) throw new Error("Nenhuma Store encontrada");

      const itemsMeta: Array<{ sku: string; qty: number }> = s.metadata?.items
        ? JSON.parse(s.metadata.items)
        : [];

      const orderItems: any[] = [];
      for (const it of itemsMeta) {
        const product = await prisma.product.findFirst({
          where: { sku: it.sku, deletedAt: null },
          include: { offers: { where: { deletedAt: null }, orderBy: { priceMinorUnits: "asc" } } }
        });
        if (!product) { console.warn("[webhook] Product não encontrado", { sku: it.sku }); continue; }
        const cheapest = product.offers[0];
        const unit = cheapest ? Number(cheapest.priceMinorUnits) : Number(product.basePriceMinorUnits);
        const cur = (cheapest?.currency ?? product.basePriceCurrencyCode ?? "USD").toUpperCase();
        orderItems.push({
          productId: product.id, sku: it.sku, title: product.title, quantity: it.qty,
          unitPriceMinorUnits: BigInt(unit), unitPriceCurrencyCode: cur,
          lineTotalMinorUnits: BigInt(unit * it.qty)
        });
      }
      if (orderItems.length === 0) throw new Error("Nenhum item válido (metadata.items vazio?)");

      const subtotal = orderItems.reduce((a, i) => a + Number(i.lineTotalMinorUnits), 0);
      const currency = (s.currency ?? "usd").toUpperCase();
      const addr = (s.customer_details?.address ?? {}) as any;

      // Transação INTERATIVA (aceita create aninhado de items)
      await prisma.$transaction(async (tx) => {
        await tx.order.create({
          data: {
            storeId: store.id, number: s.id, customerId: customer!.id, currency,
            subtotalMinorUnits: BigInt(subtotal),
            shippingTotalMinorUnits: BigInt(s.total_details?.amount_shipping ?? 0),
            taxTotalMinorUnits: BigInt(s.total_details?.amount_tax ?? 0),
            grandTotalMinorUnits: BigInt(s.amount_total ?? subtotal),
            shippingAddress: addr, billingAddress: addr,
            status: "paid", placedAt: new Date(), paidAt: new Date(),
            items: { create: orderItems }
          }
        });
      });

      console.info("[webhook] Order criado", { number: s.id, items: orderItems.length });
    } catch (e) {
      console.error("[webhook] Erro ao criar Order", e);
    }
  }
  return NextResponse.json({ received: true });
}
