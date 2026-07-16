/**
 * @workspace/auth/config — NextAuth configuration
 *
 * NextAuth v4 with Credentials provider (email + password).
 * Session strategy: JWT (stateless, works in serverless/edge).
 *
 * The authorize function:
 *   1. Looks up User by email via Prisma
 *   2. Verifies password with bcrypt
 *   3. Returns session with userId, roles, permissions, storeId
 *
 * Session callback enriches the JWT with roles + permissions + storeId.
 * This data is available in useSession() and server-side via getServerSession().
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@workspace/database";
import { verifyPassword } from "./password";
import { resolvePermissions, type Role } from "@workspace/application";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: { email: credentials.email.toLowerCase(), deletedAt: null },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            roles: true,
            status: true,
            storeId: true,
            supplierId: true,
            customer: { select: { id: true } }
          }
        });

        if (!user) return null;
        if (user.status !== "active") return null;

        const valid = await verifyPassword(credentials.password, user.passwordHash);
        if (!valid) return null;

        let roles: Role[] = ["customer"];
        try {
          roles = JSON.parse(user.roles) as Role[];
        } catch {
          roles = ["customer"];
        }

        const permissions = resolvePermissions(roles);

        return {
          id: user.id,
          email: user.email,
          roles,
          permissions,
          storeId: user.storeId ?? "default",
          customerId: user.customer?.id,
          supplierId: user.supplierId ?? undefined
        } as NextAuthUser;
      }
    })
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60 // 24 hours (refresh JWT)
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },

  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in: user is present
      if (user) {
        const u = user as NextAuthUser;
        token.userId = u.id;
        token.roles = u.roles;
        token.permissions = u.permissions;
        token.storeId = u.storeId;
        token.customerId = u.customerId;
        token.supplierId = u.supplierId;
      }
      return token;
    },

    async session({ session, token }) {
      // Forward JWT claims to session
      if (session.user) {
        (session.user as SessionUser).id = token.userId as string;
        (session.user as SessionUser).roles = token.roles as Role[];
        (session.user as SessionUser).permissions = token.permissions as string[];
        (session.user as SessionUser).storeId = token.storeId as string;
        (session.user as SessionUser).customerId = token.customerId as string | undefined;
        (session.user as SessionUser).supplierId = token.supplierId as string | undefined;
      }
      return session;
    }
  },

  pages: {
    signIn: "/login",
    error: "/login"
  }
};

// ── Extended types ──────────────────────────────────────────

export interface NextAuthUser {
  id: string;
  email: string;
  roles: Role[];
  permissions: string[];
  storeId: string;
  customerId?: string;
  supplierId?: string;
}

export interface SessionUser extends NextAuthUser {
  id: string;
  email: string;
  image?: string;
  name?: string;
}

declare module "next-auth" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface User extends NextAuthUser {}
  interface Session {
    user: SessionUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    roles?: Role[];
    permissions?: string[];
    storeId?: string;
    customerId?: string;
    supplierId?: string;
  }
}
