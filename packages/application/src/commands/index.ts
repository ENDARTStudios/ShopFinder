/**
 * @workspace/application/commands — Command definitions
 *
 * Each command is a typed object with a Zod schema for validation.
 * Commands are dispatched via CommandBus, which wraps them in a
 * pipeline (validation → auth → logging → metrics) + UnitOfWork transaction.
 *
 * Per Rec of 05 feedback: handlers never open transactions.
 * The CommandBus owns the UnitOfWork.
 */

import { z } from "zod";

// ── Catalog Commands ────────────────────────────────────────

export const CreateProductCommand = {
  type: "catalog.product.create",
  schema: z.object({
    storeId: z.string(),
    sku: z.string().min(3).max(32),
    slug: z.string().min(2).max(120),
    title: z.string().min(1).max(300),
    description: z.string().max(10000).default(""),
    basePrice: z.object({ amount: z.number().int().nonnegative(), currency: z.string().length(3) }),
    categoryId: z.string().optional()
  })
} as const;

export const UpdateProductCommand = {
  type: "catalog.product.update",
  schema: z.object({
    productId: z.string(),
    title: z.string().min(1).max(300).optional(),
    description: z.string().max(10000).optional(),
    basePrice: z
      .object({ amount: z.number().int().nonnegative(), currency: z.string().length(3) })
      .optional(),
    categoryId: z.string().nullable().optional(),
    status: z.enum(["draft", "published", "archived"]).optional()
  })
} as const;

export const PublishProductCommand = {
  type: "catalog.product.publish",
  schema: z.object({ productId: z.string() })
} as const;

export const DeleteProductCommand = {
  type: "catalog.product.delete",
  schema: z.object({ productId: z.string() })
} as const;

// ── Customer Commands ───────────────────────────────────────

export const RegisterCustomerCommand = {
  type: "customer.register",
  schema: z.object({
    storeId: z.string(),
    email: z.string().email(),
    name: z.string().min(1).max(200),
    locale: z.string().default("en"),
    passwordHash: z.string()
  })
} as const;

export const UpdateCustomerCommand = {
  type: "customer.update",
  schema: z.object({
    customerId: z.string(),
    name: z.string().min(1).max(200).optional(),
    locale: z.string().optional()
  })
} as const;

// ── Identity Commands (per Epic 1.1 refactor) ───────────────

export const RegisterUserCommand = {
  type: "identity.user.register",
  schema: z.object({
    storeId: z.string(),
    email: z.string().email(),
    name: z.string().min(1).max(200),
    password: z.string().min(8).max(128),
    locale: z.string().default("en"),
    roles: z.array(z.string()).default(["customer"])
  })
} as const;

export const ChangePasswordCommand = {
  type: "identity.password.change",
  schema: z.object({
    userId: z.string(),
    currentPassword: z.string(),
    newPassword: z.string().min(8).max(128)
  })
} as const;

export const RequestPasswordResetCommand = {
  type: "identity.password.reset.request",
  schema: z.object({
    email: z.string().email()
  })
} as const;

export const ConfirmPasswordResetCommand = {
  type: "identity.password.reset.confirm",
  schema: z.object({
    token: z.string(),
    newPassword: z.string().min(8).max(128)
  })
} as const;

export const InviteUserCommand = {
  type: "identity.user.invite",
  schema: z.object({
    email: z.string().email(),
    name: z.string().min(1).max(200),
    roles: z.array(z.string()).default(["customer"]),
    storeId: z.string()
  })
} as const;

export const DisableUserCommand = {
  type: "identity.user.disable",
  schema: z.object({
    userId: z.string(),
    reason: z.string().max(500).optional()
  })
} as const;

// ── Cart Commands ───────────────────────────────────────────

export const AddToCartCommand = {
  type: "cart.item.add",
  schema: z.object({
    storeId: z.string(),
    sessionId: z.string(),
    customerId: z.string().optional(),
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive().max(99),
    currency: z.string().length(3)
  })
} as const;

export const UpdateCartItemCommand = {
  type: "cart.item.update",
  schema: z.object({
    cartId: z.string(),
    itemId: z.string(),
    quantity: z.number().int().nonnegative().max(99)
  })
} as const;

export const RemoveCartItemCommand = {
  type: "cart.item.remove",
  schema: z.object({ cartId: z.string(), itemId: z.string() })
} as const;

// ── Order Commands ──────────────────────────────────────────

export const PlaceOrderCommand = {
  type: "order.place",
  schema: z.object({
    storeId: z.string(),
    cartId: z.string(),
    customerId: z.string(),
    shippingAddress: z.object({
      line1: z.string(),
      line2: z.string().optional(),
      city: z.string(),
      state: z.string().optional(),
      postalCode: z.string(),
      country: z.string().length(2)
    }),
    billingAddress: z.object({
      line1: z.string(),
      line2: z.string().optional(),
      city: z.string(),
      state: z.string().optional(),
      postalCode: z.string(),
      country: z.string().length(2)
    }),
    shippingMethodCode: z.string()
  })
} as const;

export const CancelOrderCommand = {
  type: "order.cancel",
  schema: z.object({ orderId: z.string(), reason: z.string().max(500).optional() })
} as const;

// ── Supplier Commands ───────────────────────────────────────

export const ConnectSupplierCommand = {
  type: "supplier.connect",
  schema: z.object({
    code: z.enum([
      "aliexpress",
      "cj",
      "dsers",
      "zendrop",
      "spocket",
      "syncee",
      "modalyst",
      "bigbuy",
      "printful",
      "printify",
      "gelato"
    ]),
    name: z.string().min(1).max(200),
    defaultCurrency: z.string().length(3),
    shipsFromCountry: z.string().length(2)
  })
} as const;

export const SyncSupplierCommand = {
  type: "supplier.sync",
  schema: z.object({ supplierId: z.string() })
} as const;

// ── Export types ────────────────────────────────────────────

export type CreateProductInput = z.infer<typeof CreateProductCommand.schema>;
export type UpdateProductInput = z.infer<typeof UpdateProductCommand.schema>;
export type PublishProductInput = z.infer<typeof PublishProductCommand.schema>;
export type DeleteProductInput = z.infer<typeof DeleteProductCommand.schema>;
export type RegisterCustomerInput = z.infer<typeof RegisterCustomerCommand.schema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerCommand.schema>;
export type RegisterUserInput = z.infer<typeof RegisterUserCommand.schema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordCommand.schema>;
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetCommand.schema>;
export type ConfirmPasswordResetInput = z.infer<typeof ConfirmPasswordResetCommand.schema>;
export type InviteUserInput = z.infer<typeof InviteUserCommand.schema>;
export type DisableUserInput = z.infer<typeof DisableUserCommand.schema>;
export type AddToCartInput = z.infer<typeof AddToCartCommand.schema>;
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemCommand.schema>;
export type RemoveCartItemInput = z.infer<typeof RemoveCartItemCommand.schema>;
export type PlaceOrderInput = z.infer<typeof PlaceOrderCommand.schema>;
export type CancelOrderInput = z.infer<typeof CancelOrderCommand.schema>;
export type ConnectSupplierInput = z.infer<typeof ConnectSupplierCommand.schema>;
export type SyncSupplierInput = z.infer<typeof SyncSupplierCommand.schema>;
