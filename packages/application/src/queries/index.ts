/**
 * @workspace/application/queries — Query definitions
 *
 * Queries are read-only operations dispatched via QueryBus.
 * They return DTOs (never aggregates) via QueryServices.
 */

import { z } from "zod";

// ── Catalog Queries ─────────────────────────────────────────

export const ListProductsQuery = {
  type: "catalog.products.list",
  schema: z.object({
    query: z.string().optional(),
    categoryId: z.string().optional(),
    page: z.number().int().positive().default(1),
    pageSize: z.number().int().positive().max(100).default(24),
    sort: z
      .enum(["relevance", "price_asc", "price_desc", "newest", "popular"])
      .default("relevance"),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional()
  })
} as const;

export const GetProductQuery = {
  type: "catalog.product.get",
  schema: z.object({ slug: z.string() })
} as const;

export const GetRelatedProductsQuery = {
  type: "catalog.products.related",
  schema: z.object({ productId: z.string(), limit: z.number().int().positive().max(50).default(8) })
} as const;

// ── Category Queries ────────────────────────────────────────

export const ListCategoriesQuery = {
  type: "catalog.categories.list",
  schema: z.object({})
} as const;

// ── Customer Queries ────────────────────────────────────────

export const GetCustomerProfileQuery = {
  type: "customer.profile.get",
  schema: z.object({ customerId: z.string() })
} as const;

export const GetCustomerOrdersQuery = {
  type: "customer.orders.list",
  schema: z.object({
    customerId: z.string(),
    limit: z.number().int().positive().max(50).default(10)
  })
} as const;

// ── Cart Queries ────────────────────────────────────────────

export const GetCartQuery = {
  type: "cart.get",
  schema: z.object({ customerId: z.string().optional(), sessionId: z.string().optional() })
} as const;

// ── Order Queries ───────────────────────────────────────────

export const GetOrderQuery = {
  type: "order.get",
  schema: z.object({ orderId: z.string() })
} as const;

export const ListOrdersQuery = {
  type: "orders.list",
  schema: z.object({
    customerId: z.string().optional(),
    status: z.string().optional(),
    page: z.number().int().positive().default(1),
    pageSize: z.number().int().positive().max(100).default(20)
  })
} as const;

export const GetOrderStatsQuery = {
  type: "orders.stats",
  schema: z.object({})
} as const;

// ── Supplier Queries ────────────────────────────────────────

export const ListSuppliersQuery = {
  type: "suppliers.list",
  schema: z.object({})
} as const;

// ── Export types ────────────────────────────────────────────

export type ListProductsInput = z.infer<typeof ListProductsQuery.schema>;
export type GetProductInput = z.infer<typeof GetProductQuery.schema>;
export type GetRelatedProductsInput = z.infer<typeof GetRelatedProductsQuery.schema>;
export type GetCustomerProfileInput = z.infer<typeof GetCustomerProfileQuery.schema>;
export type GetCustomerOrdersInput = z.infer<typeof GetCustomerOrdersQuery.schema>;
export type GetCartInput = z.infer<typeof GetCartQuery.schema>;
export type GetOrderInput = z.infer<typeof GetOrderQuery.schema>;
export type ListOrdersInput = z.infer<typeof ListOrdersQuery.schema>;
