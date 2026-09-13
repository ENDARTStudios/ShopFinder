/**
 * ShopFinder — Guard de autorização para rotas admin (#24).
 *
 * Padroniza a checagem de permissões conforme docs/eng/RBAC.md:
 * negar por padrão (401 sem sessão, 403 sem permissão) usando o
 * modelo de permissões do @workspace/application.
 */
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@workspace/auth";
import { resolvePermissions, type Permission } from "@workspace/application";

export interface AdminAuth {
  session: Awaited<ReturnType<typeof getServerAuthSession>>;
  roles: string[];
  permissions: Permission[];
  userId?: string;
}

type AdminAuthResult =
  | { ok: true; auth: AdminAuth }
  | { ok: false; response: NextResponse };

/**
 * Exige que a sessão tenha TODAS as permissões informadas.
 * Uso:
 *   const guard = await requirePermissions("catalog.write");
 *   if (!guard.ok) return guard.response;
 */
export async function requirePermissions(
  ...required: Permission[]
): Promise<AdminAuthResult> {
  const session = await getServerAuthSession();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  const user = session.user as { roles?: string[]; id?: string };
  const roles = user.roles ?? [];
  const permissions = resolvePermissions(roles) as Permission[];

  const allowed = required.every((p) => permissions.includes(p));
  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Forbidden — requires ${required.join(", ")}` },
        { status: 403 }
      )
    };
  }

  return { ok: true, auth: { session, roles, permissions, userId: user.id } };
}
