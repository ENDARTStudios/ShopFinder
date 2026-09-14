/**
 * ShopFinder — Reviews de produtos (T081).
 *
 * POST /api/reviews                — cria review (auth obrigatória, 1/user/produto)
 * GET  /api/reviews?productId=X   — lista published + média
 *
 * Moderação básica: regex de spam → status flagged (não publicado).
 * Rate limit via middleware (default por IP em src/lib/rate-limit.ts).
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@workspace/auth";
import { prisma } from "@workspace/database";

const BLOCKED_PATTERNS: RegExp[] = [/\b(?:spam|scam|phishing|malware)\b/i, /(.)\1{15,}/];

/** Resolve o Customer pelo email da sessão; cria na store única se não existir. */
async function resolveOrCreateCustomerId(
  email: string,
  name?: string | null
): Promise<string | null> {
  const existing = await prisma.customer.findFirst({
    where: { email },
    select: { id: true }
  });
  if (existing) return existing.id;

  const store = await prisma.store.findFirst({ select: { id: true } });
  if (!store) return null;

  const created = await prisma.customer.create({
    data: { storeId: store.id, email, name: name ?? email, locale: "pt-BR" },
    select: { id: true }
  });
  return created.id;
}

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId obrigatório" }, { status: 400 });
  }

  const reviews = await prisma.review.findMany({
    where: { productId, status: "published" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      createdAt: true,
      customer: { select: { name: true } }
    }
  });

  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      customerName: r.customer?.name ?? null
    })),
    avgRating
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      productId?: unknown;
      rating?: unknown;
      title?: unknown;
      body?: unknown;
    };

    const productId = typeof payload.productId === "string" ? payload.productId : null;
    const rating =
      typeof payload.rating === "number" && Number.isInteger(payload.rating)
        ? payload.rating
        : null;
    const title =
      typeof payload.title === "string" && payload.title.trim().length > 0
        ? payload.title.trim()
        : null;
    const body = typeof payload.body === "string" ? payload.body.trim() : null;

    if (!productId || !rating || rating < 1 || rating > 5 || !body || body.length < 3) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // Customer da sessão: usa o vínculo do JWT quando existe; senão resolve por
    // email (padrão de conta/pedidos e cancelamento). Auto-provisiona como no
    // webhook do Stripe (mesma store única do seed), para permitir review sem
    // depender de compra prévia.
    const customerId =
      session.user.customerId ?? (await resolveOrCreateCustomerId(email, session.user.name));
    if (!customerId) {
      return NextResponse.json({ error: "Customer não encontrado" }, { status: 403 });
    }

    const existing = await prisma.review.findFirst({
      where: { productId, customerId },
      select: { id: true }
    });
    if (existing) {
      return NextResponse.json({ error: "Você já avaliou este produto" }, { status: 409 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, status: "published" },
      select: { id: true }
    });
    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    // Moderação básica: spam/abuso óbvio → flagged (fica fora da listagem pública).
    const combined = `${title ?? ""} ${body}`;
    const flagged = BLOCKED_PATTERNS.some((re) => re.test(combined));

    const review = await prisma.review.create({
      data: {
        productId,
        customerId,
        rating,
        title,
        body,
        status: flagged ? "flagged" : "published"
      }
    });

    return NextResponse.json(
      {
        ok: true,
        flagged,
        review: { id: review.id, rating: review.rating, status: review.status }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Reviews POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
