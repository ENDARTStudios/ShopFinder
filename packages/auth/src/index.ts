/**
 * @workspace/auth
 *
 * Auth.js configuration, sessions, RBAC primitives, password & OAuth adapters.
 */

export const PACKAGE_NAME = "@workspace/auth" as const;
export const PACKAGE_VERSION = "0.1.0" as const;

// Password utilities
export { hashPassword, verifyPassword, needsRehash } from "./password";

// NextAuth configuration
export { authOptions, type NextAuthUser, type SessionUser } from "./config";

// Session helpers
export { getServerAuthSession, getAuthContext, getSessionUser } from "./session";
