/**
 * ShopFinder — Notificações in-app do customer (T083).
 *
 * GET /api/notifications — as notificações do próprio usuário (price_alert
 * hoje; operacionais do admin continuam em /api/admin/notifications).
 * Estado de "lida" permanece client-side (localStorage no bell).
 */
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@workspace/auth";
import { prisma } from "@workspace/database";

export async function GET() {
  const session = await getServerAuthSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const customer = await prisma.customer.findFirst({
    where: { email },
    select: { id: true }
  });
  if (!customer) {
    return NextResponse.json({ notifications: [], total: 0 });
  }

  const notifications = await prisma.notification.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, type: true, severity: true, message: true, link: true, createdAt: true }
  });

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      severity: n.severity,
      message: n.message,
      link: n.link ?? undefined,
      timestamp: n.createdAt.toISOString()
    })),
    total: notifications.length
  });
}
