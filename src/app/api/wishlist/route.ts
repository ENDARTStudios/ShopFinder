/**
 * ShopFinder — Wishlist por usuário (NOVA_DIRECAO A3).
 *
 * GET    /api/wishlist          — lista os itens do próprio usuário
 * POST   /api/wishlist          — adiciona { productId } (idempotente)
 * DELETE /api/wishlist?productId= — remove por produto
 *
 * Auth obrigatória. Modelo WishlistItem (init migration) — unique por
 * (customerId, productId, variantId).
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@workspace/auth";
import { prisma } from "@workspace/database";

async function resolveCustomerId(email: string): Promise<string | null> {
  const customer = await prisma.customer.findFirst({
    where: { email },
    select: { id: true }
  });
  return customer?.id ?? null;
}

export async function GET() {
  const session = await getServerAuthSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const customerId = await resolveCustomerId(email);
  if (!customerId) return NextResponse.json({ items: [] });

  // WishlistItem não tem relação com Product (apenas productId textual);
  // títulos resolvidos em segunda query.
  const items = await prisma.wishlistItem.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" }
  });

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true, slug: true }
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  return NextResponse.json({
    items: items
      .map((i) => {
        const p = byId.get(i.productId);
        return {
          id: i.id,
          createdAt: i.createdAt.toISOString(),
          productId: i.productId,
          productTitle: p?.title ?? null,
          productSlug: p?.slug ?? null
        };
      })
      .filter((i) => i.productSlug !== null)
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const payload = (await request.json()) as { productId?: unknown };
    const productId = typeof payload.productId === "string" ? payload.productId : null;
    if (!productId) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const customerId = await resolveCustomerId(email);
    if (!customerId) {
      return NextResponse.json({ error: "Customer não encontrado" }, { status: 403 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, status: "published" },
      select: { id: true }
    });
    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    const existing = await prisma.wishlistItem.findFirst({
      where: { productId, customerId, variantId: null },
      select: { id: true }
    });
    if (existing) {
      return NextResponse.json({ ok: true, inWishlist: true, id: existing.id });
    }

    await prisma.wishlistItem.create({
      data: { productId, customerId },
      select: { id: true }
    });

    return NextResponse.json({ ok: true, inWishlist: true }, { status: 201 });
  } catch (error) {
    console.error("Wishlist POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerAuthSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId obrigatório" }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({
    where: { email },
    select: { id: true }
  });
  if (!customer) return NextResponse.json({ ok: true, removed: false });

  await prisma.wishlistItem.deleteMany({ where: { productId, customerId: customer.id } });
  return NextResponse.json({ ok: true, removed: true });
}
