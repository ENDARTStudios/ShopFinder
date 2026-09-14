/**
 * ShopFinder — MFA enrollment: enable (#22)
 *
 * GET    /api/admin/mfa/enable  → status do MFA do usuário logado
 * POST   /api/admin/mfa/enable  { code } → verifica e ativa
 * DELETE /api/admin/mfa/enable  → desativa e limpa o secret
 */
import { NextResponse } from "next/server";
import { prisma } from "@workspace/database";
import { requirePermissions } from "@/lib/admin-auth";
import { verifyTotp } from "@workspace/auth/totp";

export async function GET() {
  const guard = await requirePermissions("admin.access");
  if (!guard.ok) return guard.response;

  const user = await prisma.user.findUnique({
    where: { id: guard.auth.userId! },
    select: { mfaEnabled: true }
  });

  return NextResponse.json({ enabled: user?.mfaEnabled ?? false });
}

export async function POST(request: Request) {
  const guard = await requirePermissions("admin.access");
  if (!guard.ok) return guard.response;

  const body = (await request.json().catch(() => ({}))) as { code?: string };
  if (!body.code || !/^\d{6}$/.test(body.code)) {
    return NextResponse.json({ error: "Código de 6 dígitos obrigatório" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: guard.auth.userId! },
    select: { mfaSecret: true, mfaEnabled: true }
  });

  if (!user?.mfaSecret) {
    return NextResponse.json({ error: "Sem secret pendente — rode o setup" }, { status: 400 });
  }

  if (!verifyTotp(user.mfaSecret, body.code)) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: guard.auth.userId! },
    data: { mfaEnabled: true }
  });

  return NextResponse.json({ enabled: true });
}

export async function DELETE() {
  const guard = await requirePermissions("admin.access");
  if (!guard.ok) return guard.response;

  await prisma.user.update({
    where: { id: guard.auth.userId! },
    data: { mfaEnabled: false, mfaSecret: null }
  });

  return NextResponse.json({ enabled: false });
}
