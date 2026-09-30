import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@workspace/database/client";
import { buildOrderItemsFromSession } from "@/lib/stripe-order";

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
    // J-004 (auditoria 30/09): a sessão Stripe é a fonte da verdade do que foi
    // cobrado — os valores do catálogo podem ter mudado entre checkout e webhook.
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
      const email = s.customer_details?.email ?? `guest+${s.id.slice(0, 12)}@shopfinder.local`;
      const name = s.customer_details?.name ?? email;

      const existingCustomer = await prisma.customer.findFirst({
        where: { storeId: store.id, email }
      });
      let customer = existingCustomer;
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            storeId: store.id,
            email,
            name,
            locale: "pt-BR"
          }
        });
      }
      // Sem PII em logs (LGPD, achado SEC-01): o e-mail fica só no upsert acima
      console.info("[webhook] customer", { novo: !existingCustomer });

      // 4) Parse metadata.items (sku × qty, mesma ordem dos line_items)
      const itemsMeta: Array<{ sku: string; qty: number }> = s.metadata?.items
        ? JSON.parse(s.metadata.items)
        : [];

      // 5) Reconstrói os itens do que o Stripe efetivamente cobrou
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const full = await stripe.checkout.sessions.retrieve(s.id, {
        expand: ["line_items"]
      });
      const skuToProductId = new Map<string, string>();
      for (const meta of itemsMeta) {
        // inclui soft-deleted: maximiza o link; sem match ⇒ productId null
        const product = await prisma.product.findFirst({ where: { sku: meta.sku } });
        if (product) skuToProductId.set(meta.sku, product.id);
      }
      const orderItems = buildOrderItemsFromSession(full.line_items, itemsMeta, skuToProductId);

      console.info("[webhook] orderItems montados da sessão", {
        count: orderItems.length
      });

      // 6) Subtotal da própria sessão; endereço; transação
      const subtotal = Math.trunc(
        full.amount_subtotal ??
          orderItems.reduce((acc, i) => acc + Number(i.lineTotalMinorUnits), 0)
      );
      const currency = (s.currency ?? "usd").toUpperCase();
      const emptyAddr: Stripe.Address = {
        city: "",
        country: "",
        line1: "",
        line2: "",
        postal_code: "",
        state: ""
      };
      const rawAddr: Stripe.Address = s.customer_details?.address ?? emptyAddr;
      const addr = {
        line1: rawAddr.line1 ?? "",
        line2: rawAddr.line2 ?? "",
        city: rawAddr.city ?? "",
        state: rawAddr.state ?? "",
        postal_code: rawAddr.postal_code ?? "",
        country: rawAddr.country ?? ""
      };

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
            items: { create: orderItems }
          }
        });
      });

      console.info("[webhook] Order criado", {
        number: s.id,
        items: orderItems.length
      });
    } catch (e) {
      const err = e as Error & { code?: string; meta?: unknown };
      console.error("[webhook] falha", {
        message: err.message,
        code: err.code,
        meta: (err as any).meta
      });
      // J-005 (auditoria 30/09): falha real NÃO pode virar sucesso — 500 faz o
      // Stripe retentar; a checagem de idempotência acima torna o retry seguro.
      return NextResponse.json({ error: "webhook processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
