/**
 * ShopFinder — Agregados de analytics p/ admin (T077).
 *
 * GET /api/admin/analytics — agrega AnalyticsPageView dos últimos 7 dias:
 * total, top páginas, referrers e dispositivos. Nenhum dado individual
 * (path por dia) sai daqui — apenas agregados.
 *
 * RBAC: admin.access (docs/eng/RBAC.md).
 */
import { NextResponse } from "next/server";
import { prisma } from "@workspace/database/client";
import { requirePermissions } from "@/lib/admin-auth";

export async function GET() {
  const guard = await requirePermissions("admin.access");
  if (!guard.ok) return guard.response;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, byPath, byReferrer, byDevice] = await Promise.all([
    prisma.analyticsPageView.count({ where: { createdAt: { gte: since } } }),
    prisma.analyticsPageView.groupBy({
      by: ["path"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
      take: 10
    }),
    prisma.analyticsPageView.groupBy({
      by: ["referrerHost"],
      where: { createdAt: { gte: since }, referrerHost: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { referrerHost: "desc" } },
      take: 5
    }),
    prisma.analyticsPageView.groupBy({
      by: ["device"],
      where: { createdAt: { gte: since } },
      _count: { _all: true }
    })
  ]);

  return NextResponse.json({
    period: "7d",
    total,
    topPages: byPath.map((p) => ({ path: p.path, views: p._count._all })),
    referrers: byReferrer
      .filter((r) => r.referrerHost)
      .map((r) => ({ host: r.referrerHost, views: r._count._all })),
    devices: byDevice.map((d) => ({ device: d.device, views: d._count._all }))
  });
}
