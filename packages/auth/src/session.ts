/**
 * @workspace/auth/session — Session helpers
 *
 * Server-side session access + AuthContext builder for the application layer.
 */

import { getServerSession } from "next-auth";
import { authOptions, type SessionUser } from "./config";
import type { AuthContext } from "@workspace/application";
import { resolvePermissions, type Role } from "@workspace/application";

export async function getServerAuthSession() {
  return getServerSession(authOptions);
}

export async function getAuthContext(): Promise<AuthContext> {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return {
      storeId: "default",
      roles: [],
      permissions: [],
      isAuthenticated: false
    };
  }

  const user = session.user as SessionUser;
  return {
    userId: user.id,
    customerId: user.customerId,
    storeId: user.storeId ?? "default",
    roles: user.roles ?? ["customer"],
    permissions: user.permissions ?? resolvePermissions(["customer"]),
    isAuthenticated: true
  };
}

export function getSessionUser(session: unknown): SessionUser | null {
  if (!session || typeof session !== "object") return null;
  const s = session as { user?: SessionUser };
  return s.user ?? null;
}
