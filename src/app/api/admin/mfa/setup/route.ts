/**
 * ShopFinder — MFA enrollment: setup (#22)
 *
 * POST /api/admin/mfa/setup
 * Gera novo secret TOTP (pendente — mfaEnabled continua false até o
 * verify em /enable) e retorna otpauth URI + QR data URL.
 */
import { NextResponse } from "next/server";
import { prisma } from "@workspace/database";
import { requirePermissions } from "@/lib/admin-auth";
import { generateTotpSecret, otpauthUri } from "@workspace/auth/totp";
import QRCode from "qrcode";

export async function POST() {
  const guard = await requirePermissions("admin.access");
  if (!guard.ok) return guard.response;

  const email = (guard.auth.session?.user as { email?: string } | undefined)?.email;
  if (!email || !guard.auth.userId) {
    return NextResponse.json({ error: "Sessão sem identidade" }, { status: 400 });
  }

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: guard.auth.userId },
    data: { mfaSecret: secret, mfaEnabled: false }
  });

  const uri = otpauthUri({ secret, email });
  const qrDataUrl = await QRCode.toDataURL(uri, { width: 240, margin: 1 });

  return NextResponse.json({ secret, otpauthUri: uri, qrDataUrl });
}
