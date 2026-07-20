/**
 * @workspace/application/authorization — RBAC (Role-Based Access Control)
 *
 * Per Rec of 05 feedback: authorization is applied via Policies, not inside handlers.
 * The Policy checks permissions based on the user's roles + the resource being accessed.
 */

import type { AuthContext, RequestContext } from "../types";

// ── Roles & Permissions ─────────────────────────────────────

export type Role = "customer" | "admin" | "supplier" | "support";

export type Permission =
  | "catalog.read"
  | "catalog.write"
  | "catalog.delete"
  | "customer.read"
  | "customer.write"
  | "customer.read.self" // customer can read own profile
  | "order.read"
  | "order.write"
  | "order.read.self"
  | "order.cancel"
  | "payment.read"
  | "payment.write"
  | "payment.refund"
  | "supplier.read"
  | "supplier.write"
  | "supplier.connect"
  | "admin.access"
  | "admin.users"
  | "admin.settings";

const ROLE_PERMISSIONS: Record<Role, ReadonlyArray<Permission>> = {
  customer: ["catalog.read", "customer.read.self", "order.read.self"],
  support: ["catalog.read", "customer.read", "order.read", "order.cancel", "payment.read"],
  supplier: ["catalog.read", "supplier.read", "order.read"],
  admin: [
    "catalog.read",
    "catalog.write",
    "catalog.delete",
    "customer.read",
    "customer.write",
    "order.read",
    "order.write",
    "order.cancel",
    "payment.read",
    "payment.write",
    "payment.refund",
    "supplier.read",
    "supplier.write",
    "supplier.connect",
    "admin.access",
    "admin.users",
    "admin.settings"
  ]
};

// ── Permission Checker ──────────────────────────────────────

export class PermissionChecker {
  static forContext(ctx: RequestContext): PermissionChecker {
    return new PermissionChecker(ctx.auth);
  }

  constructor(private readonly auth: AuthContext) {}

  can(permission: Permission): boolean {
    return this.auth.permissions.includes(permission);
  }

  canAny(permissions: ReadonlyArray<Permission>): boolean {
    return permissions.some((p) => this.can(p));
  }

  canAll(permissions: ReadonlyArray<Permission>): boolean {
    return permissions.every((p) => this.can(p));
  }

  isOwner(resourceOwnerId: string): boolean {
    return this.auth.customerId === resourceOwnerId || this.auth.userId === resourceOwnerId;
  }

  isAdmin(): boolean {
    return this.auth.roles.includes("admin");
  }

  isAuthenticated(): boolean {
    return this.auth.isAuthenticated;
  }
}

// ── Permission resolver ─────────────────────────────────────

export function resolvePermissions(roles: ReadonlyArray<string>): ReadonlyArray<Permission> {
  const permissions = new Set<Permission>();
  for (const role of roles) {
    if (role in ROLE_PERMISSIONS) {
      for (const p of ROLE_PERMISSIONS[role as Role]) {
        permissions.add(p);
      }
    }
  }
  return [...permissions];
}

// ── Auth helpers ────────────────────────────────────────────

export function requirePermission(ctx: RequestContext, permission: Permission): boolean {
  return ctx.auth.permissions.includes(permission);
}

export function requireAnyPermission(
  ctx: RequestContext,
  permissions: ReadonlyArray<Permission>
): boolean {
  return permissions.some((p) => ctx.auth.permissions.includes(p));
}

export function requireOwnershipOrPermission(
  ctx: RequestContext,
  resourceOwnerId: string,
  permission: Permission
): boolean {
  return ctx.auth.customerId === resourceOwnerId || ctx.auth.permissions.includes(permission);
}
