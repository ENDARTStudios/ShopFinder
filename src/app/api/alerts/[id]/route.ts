/**
 * ShopFinder — Desativa alerta de preço próprio (T083).
 *
 * DELETE /api/alerts/[id] — dono apenas. 404 para inexistente E para
 * não-dono (não vaza existência).
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@workspace/auth";
import { prisma } from "@workspace/database";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerAuthSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const customer = await prisma.customer.findFirst({ where: { email }, select: { id: true } });
  if (!customer) return NextResponse.json({ error: "Alerta não encontrado" }, { status: 404 });

  const alert = await prisma.priceAlert.findFirst({
    where: { id, customerId: customer.id },
    select: { id: true }
  });
  if (!alert) return NextResponse.json({ error: "Alerta não encontrado" }, { status: 404 });

  await prisma.priceAlert.update({
    where: { id },
    data: { status: "disabled" }
  });

  return NextResponse.json({ ok: true });
}
