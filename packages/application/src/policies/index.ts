/**
 * @workspace/application/policies — Authorization Policies
 *
 * Per Rec of 05 feedback: authorization logic lives in Policies, not handlers.
 * Each policy encapsulates the rules for a specific domain context.
 *
 * Policies are called by the authorizationMiddleware before the handler runs.
 * They return true/false — the middleware converts false to 401/403.
 */

import type { RequestContext } from "../types";
import { PermissionChecker, requireOwnershipOrPermission } from "../authorization";

// ── Catalog Policy ──────────────────────────────────────────

export const CatalogPolicy = {
  canRead: (_ctx: RequestContext) => true, // public catalog
  canCreate: (ctx: RequestContext) => ctx.auth.permissions.includes("catalog.write"),
  canUpdate: (ctx: RequestContext) => ctx.auth.permissions.includes("catalog.write"),
  canDelete: (ctx: RequestContext) => ctx.auth.permissions.includes("catalog.delete"),
  canManageVariants: (ctx: RequestContext) => ctx.auth.permissions.includes("catalog.write"),
  canManageInventory: (ctx: RequestContext) => ctx.auth.permissions.includes("catalog.write")
};

// ── Customer Policy ─────────────────────────────────────────

export const CustomerPolicy = {
  canRead: (ctx: RequestContext, customerId?: string) =>
    customerId
      ? requireOwnershipOrPermission(ctx, customerId, "customer.read")
      : ctx.auth.permissions.includes("customer.read"),
  canUpdate: (ctx: RequestContext, customerId: string) =>
    requireOwnershipOrPermission(ctx, customerId, "customer.write"),
  canDelete: (ctx: RequestContext, customerId: string) =>
    ctx.auth.permissions.includes("customer.write") &&
    (ctx.auth.customerId === customerId || ctx.auth.roles.includes("admin"))
};

// ── Order Policy ────────────────────────────────────────────

export const OrderPolicy = {
  canRead: (ctx: RequestContext, customerId?: string) =>
    customerId
      ? requireOwnershipOrPermission(ctx, customerId, "order.read")
      : ctx.auth.permissions.includes("order.read"),
  canPlace: (ctx: RequestContext) => ctx.auth.isAuthenticated,
  canCancel: (ctx: RequestContext, customerId: string) =>
    requireOwnershipOrPermission(ctx, customerId, "order.cancel"),
  canRefund: (ctx: RequestContext) => ctx.auth.permissions.includes("payment.refund"),
  canFulfill: (ctx: RequestContext) => ctx.auth.permissions.includes("order.write")
};

// ── Supplier Policy ─────────────────────────────────────────

export const SupplierPolicy = {
  canRead: (_ctx: RequestContext) => true, // suppliers are public info
  canConnect: (ctx: RequestContext) => ctx.auth.permissions.includes("supplier.connect"),
  canSync: (ctx: RequestContext) => ctx.auth.permissions.includes("supplier.write"),
  canManageOffers: (ctx: RequestContext) => ctx.auth.permissions.includes("supplier.write")
};

// ── Cart Policy ─────────────────────────────────────────────

export const CartPolicy = {
  canRead: (ctx: RequestContext, customerId?: string, sessionId?: string) => {
    if (!customerId && !sessionId) return false;
    if (customerId) return requireOwnershipOrPermission(ctx, customerId, "customer.read.self");
    return true; // session-based cart (anonymous)
  },
  canAddItem: (ctx: RequestContext) => true, // anyone can add to cart
  canCheckout: (ctx: RequestContext) => true // anyone can start checkout
};

// ── Payment Policy ──────────────────────────────────────────

export const PaymentPolicy = {
  canRead: (ctx: RequestContext, customerId?: string) =>
    customerId
      ? requireOwnershipOrPermission(ctx, customerId, "payment.read")
      : ctx.auth.permissions.includes("payment.read"),
  canInitiate: (ctx: RequestContext) => ctx.auth.isAuthenticated,
  canRefund: (ctx: RequestContext) => ctx.auth.permissions.includes("payment.refund")
};
