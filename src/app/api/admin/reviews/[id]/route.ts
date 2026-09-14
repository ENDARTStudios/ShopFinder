/**
 * ShopFinder — Ação de moderação sobre 1 review (T082).
 *
 * PATCH /api/admin/reviews/[id] — { action: "approve" | "remove" }:
 * approve → status "published" (volta ao público); remove → "removed".
 * RBAC: admin.access (401 sem sessão, 403 sem permissão).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@workspace/database/client";
import { requirePermissions } from "@/lib/admin-auth";

const ACTION_TO_STATUS = {
  approve: "published",
  remove: "removed"
} as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePermissions("admin.access");
  if (!guard.ok) return guard.response;

  const { id } = await params;

  let action: keyof typeof ACTION_TO_STATUS | undefined;
  try {
    const body = (await request.json()) as { action?: unknown };
    if (
      body.action === "approve" ||
      body.action === "remove"
    ) {
      action = body.action;
    }
  } catch {
    // body inválido → action continua undefined
  }
  if (!action) {
    return NextResponse.json(
      { error: "action deve ser 'approve' ou 'remove'" },
      { status: 400 }
    );
  }

  const review = await prisma.review.findUnique({ where: { id }, select: { id: true } });
  if (!review) {
    return NextResponse.json({ error: "Review não encontrada" }, { status: 404 });
  }

  const updated = await prisma.review.update({
    where: { id },
    data: { status: ACTION_TO_STATUS[action] },
    select: { id: true, status: true }
  });

  return NextResponse.json({ ok: true, review: updated });
}
