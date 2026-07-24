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

  console.info("[webhook] recebido", { type: event.type });

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    try {
      // 1) Idempotência
      const existing = await prisma.order.findUnique({ where: { number: s.id } });
      if (existing) {
        console.info("[webhook] Order já existe (idempotente)", { number: s.id });
        return NextResponse.json({ received: true });
      }

      // 2) Store (precisa existir — o seed criou uma)
      const store = await prisma.store.findFirst();
      if (!store) throw new Error("Nenhuma Store encontrada");
      console.info("[webhook] store", { storeId: store.id });

      // 3) Customer: derive email, upsert com campos obrigatórios reais
      const email =
        s.customer_details?.email ?? `guest+${s.id.slice(0, 12)}@shopfinder.local`;
      const name = s.customer_details?.name ?? email;

      const existingCustomer = await prisma.customer.findFirst({ where: { email } });
      let customer = existingCustomer;
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            storeId: store.id,
            email,
            name,
            locale: "pt-BR",
          },
        });
      }
      console.info("[webhook] customer", { email, criado: !existingCustomer });

      // 4) Parse metadata.items
      const itemsMeta: Array<{ sku: string; qty: number }> = s.metadata?.items
        ? JSON.parse(s.metadata.items)
        : [];

      // 5) Resolve products e monta OrderItem[]
      const orderItems: Array<{
        productId: string;
        sku: string;
        title: string;
        quantity: number;
        unitPriceMinorUnits: bigint;
        unitPriceCurrencyCode: string;
        lineTotalMinorUnits: bigint;
      }> = [];

      for (const it of itemsMeta) {
        const product = await prisma.product.findFirst({
          where: { sku: it.sku, deletedAt: null },
          include: {
            offers: {
              where: { deletedAt: null },
              orderBy: { priceMinorUnits: "asc" },
            },
          },
        });
        if (!product) {
          console.warn("[webhook] Produto não encontrado, pulando", { sku: it.sku });
          continue;
        }
        const cheapest = product.offers[0];
        const unit = cheapest
          ? Number(cheapest.priceMinorUnits)
          : Number(product.basePriceMinorUnits);
        const currency = (
          cheapest?.priceCurrencyCode ??
          product.basePriceCurrencyCode ??
          "USD"
        ).toUpperCase();

        orderItems.push({
          productId: product.id,
          sku: it.sku,
          title: product.title,
          quantity: it.qty,
          unitPriceMinorUnits: BigInt(unit),
          unitPriceCurrencyCode: currency,
          lineTotalMinorUnits: BigInt(unit * it.qty),
        });
      }

      console.info("[webhook] orderItems montados", { count: orderItems.length, totalMeta: itemsMeta.length });

      if (orderItems.length === 0) {
        console.warn("[webhook] Nenhum item válido no metadata", { number: s.id });
        return NextResponse.json({ received: true });
      }

      // 6) Subtotal, address, transação
      const subtotal = orderItems.reduce(
        (acc, i) => acc + Number(i.lineTotalMinorUnits),
        0,
      );
      const currency = (s.currency ?? "usd").toUpperCase();
      const addr = (s.customer_details?.address ?? {}) as Record<string, unknown>;

      await prisma.$transaction(async (tx) => {
        await tx.order.create({
          data: {
            storeId: store.id,
            number: s.id,
            customerId: customer!.id,
            currency,
            subtotalMinorUnits: BigInt(subtotal),
            shippingTotalMinorUnits: BigInt(s.total_details?.amount_shipping ?? 0),
            taxTotalMinorUnits: BigInt(s.total_details?.amount_tax ?? 0),
            grandTotalMinorUnits: BigInt(s.amount_total ?? subtotal),
            shippingAddress: addr,
            billingAddress: addr,
            status: "paid",
            placedAt: new Date(),
            paidAt: new Date(),
            items: { create: orderItems },
          },
        });
      });

      console.info("[webhook] Order criado", {
        number: s.id,
        items: orderItems.length,
      });
    } catch (e) {
      const err = e as Error & { code?: string; meta?: unknown };
      console.error("[webhook] falha", {
        message: err.message,
        code: err.code,
        meta: (err as any).meta,
      });
    }
  }

  return NextResponse.json({ received: true });
}