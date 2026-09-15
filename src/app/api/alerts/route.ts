/**
 * ShopFinder — Alertas de preço (T083).
 *
 * POST /api/alerts — cria alerta { productId, targetPrice } (BRL). 409 se já
 *                   existir alerta ativo para o par produto/customer.
 * GET  /api/alerts — lista os alertas do próprio usuário (com produto).
 *
 * Auth obrigatória. Limite de 20 alertas ativos por usuário (DoS).
 * Email adiado — notificação é in-app (DECISAO-ALERTAS-001/ADR-0031).
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@workspace/auth";
import { prisma } from "@workspace/database";

const MAX_ACTIVE_ALERTS = 20;

/** Customer da sessão: vínculo do JWT ou resolve/cria por email (padrão webhook). */
async function resolveOrCreateCustomerId(email: string, name?: string | null) {
  const existing = await prisma.customer.findFirst({ where: { email }, select: { id: true } });
  if (existing) return existing.id;
  const store = await prisma.store.findFirst({ select: { id: true } });
  if (!store) return null;
  const created = await prisma.customer.create({
    data: { storeId: store.id, email, name: name ?? email, locale: "pt-BR" },
    select: { id: true }
  });
  return created.id;
}

export async function GET() {
  const session = await getServerAuthSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const customer = await prisma.customer.findFirst({
    where: { email },
    select: { id: true }
  });
  if (!customer) return NextResponse.json({ alerts: [] });

  const alerts = await prisma.priceAlert.findMany({
    where: { customerId: customer.id, status: { not: "disabled" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      targetPriceMinor: true,
      currency: true,
      status: true,
      triggeredAt: true,
      createdAt: true,
      product: { select: { title: true, slug: true } }
    }
  });

  return NextResponse.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      targetPriceMinor: a.targetPriceMinor.toString(),
      currency: a.currency,
      status: a.status,
      triggeredAt: a.triggeredAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      productTitle: a.product.title,
      productSlug: a.product.slug
    }))
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const payload = (await request.json()) as { productId?: unknown; targetPrice?: unknown };
    const productId = typeof payload.productId === "string" ? payload.productId : null;
    const targetPrice =
      typeof payload.targetPrice === "number" && Number.isFinite(payload.targetPrice)
        ? payload.targetPrice
        : null;

    if (!productId || !targetPrice || targetPrice <= 0 || targetPrice > 10_000_000) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const customerId = await resolveOrCreateCustomerId(email, session.user.name);
    if (!customerId) {
      return NextResponse.json({ error: "Customer não encontrado" }, { status: 403 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, status: "published" },
      select: { id: true, storeId: true }
    });
    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    const existing = await prisma.priceAlert.findFirst({
      where: { productId, customerId, status: "active" },
      select: { id: true }
    });
    if (existing) {
      return NextResponse.json({ error: "Alerta já existe" }, { status: 409 });
    }

    const activeCount = await prisma.priceAlert.count({
      where: { customerId, status: "active" }
    });
    if (activeCount >= MAX_ACTIVE_ALERTS) {
      return NextResponse.json(
        { error: "Limite de alertas ativos atingido" },
        { status: 400 }
      );
    }

    const targetPriceMinor = BigInt(Math.round(targetPrice * 100));
    const alert = await prisma.priceAlert.create({
      data: {
        productId,
        customerId,
        storeId: product.storeId,
        targetPriceMinor,
        currency: "BRL",
        status: "active"
      }
    });

    return NextResponse.json(
      { ok: true, alert: { id: alert.id, targetPriceMinor: targetPriceMinor.toString() } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Alerts POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
