/**
 * ShopFinder — Waitlist de pré-lançamento (T075).
 *
 * POST /api/waitlist
 *   Body: { email, niche?, locale? }
 *
 * Idempotente por email: repetida retorna 200 com `alreadyRegistered: true`
 * (documentado; a alternativa 409 foi descartada para não expor quais
 * emails já estão na lista). IP nunca é armazenado cru — só hash SHA-256.
 *
 * Rate limit: regra dedicada no middleware (5/min por IP, igual ao register).
 */
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@workspace/database/client";
import { getClientIp } from "@/lib/rate-limit";

const waitlistSchema = z.object({
  email: z.string().email().max(320),
  niche: z.enum(["pc-hardware", "electronic-components", "consumer-electronics"]).optional(),
  locale: z.enum(["pt-BR", "en", "es-ES"]).default("pt-BR")
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, niche, locale } = parsed.data;
    const emailNormalized = email.toLowerCase().trim();
    // Pseudonimização (LGPD): hash do IP, nunca o IP cru.
    const ipHash = createHash("sha256")
      .update(`${getClientIp(request.headers)}:${new Date().toISOString().slice(0, 10)}`)
      .digest("hex");

    const existing = await prisma.waitlist.findUnique({ where: { email: emailNormalized } });
    if (existing) {
      return NextResponse.json({ ok: true, alreadyRegistered: true }, { status: 200 });
    }

    await prisma.waitlist.create({
      data: { email: emailNormalized, niche, locale, ipHash }
    });

    return NextResponse.json({ ok: true, alreadyRegistered: false }, { status: 200 });
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
