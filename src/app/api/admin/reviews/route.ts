/**
 * ShopFinder — Moderação de reviews (T082).
 *
 * GET /api/admin/reviews — lista reviews flagged + removed para o painel
 * admin (produto, autor, rating, texto, data). RBAC: admin.access.
 */
import { NextResponse } from "next/server";
import { prisma } from "@workspace/database/client";
import { requirePermissions } from "@/lib/admin-auth";

export async function GET() {
  const guard = await requirePermissions("admin.access");
  if (!guard.ok) return guard.response;

  const reviews = await prisma.review.findMany({
    where: { status: { in: ["flagged", "removed"] } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      product: { select: { title: true, slug: true } },
      customer: { select: { name: true, email: true } }
    }
  });

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      productTitle: r.product.title,
      productSlug: r.product.slug,
      customerName: r.customer.name,
      customerEmail: r.customer.email
    }))
  });
}
