/**
 * ShopFinder — Coleta de pageview first-party cookieless (T077).
 *
 * POST /api/analytics/track
 *   Body: { path, referrerHost?, device? }
 *
 * Privacy by design: NENHUM identificador (sem cookie, sem IP cru, sem
 * user-agent armazenado) — apenas path, hostname do referrer externo e
 * classe de dispositivo, agregados em /admin/analytics. Rotas /admin e
 * /api são ignoradas. Rate limit default do middleware (120/min por IP).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@workspace/database/client";

const trackSchema = z.object({
  path: z
    .string()
    .max(300)
    .refine((p) => p.startsWith("/") && !p.startsWith("//"), "path deve ser interno"),
  referrerHost: z.string().max(100).nullish(),
  device: z.enum(["desktop", "mobile", "tablet"]).default("desktop")
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = trackSchema.safeParse(body);

    if (!parsed.success) {
      return new NextResponse(null, { status: 204 });
    }

    // Não rastreia superfície interna.
    if (parsed.data.path.startsWith("/admin") || parsed.data.path.startsWith("/api")) {
      return new NextResponse(null, { status: 204 });
    }

    await prisma.analyticsPageView.create({
      data: {
        path: parsed.data.path,
        referrerHost: parsed.data.referrerHost ?? null,
        device: parsed.data.device
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
