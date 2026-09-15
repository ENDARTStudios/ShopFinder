/**
 * @workspace/contracts/schemas
 *
 * Zod schemas for input validation at trust boundaries (API requests,
 * form submissions, webhook payloads). These complement the DTOs (output
 * shapes) and event schemas (integration contracts).
 *
 * Usage in Route Handlers:
 *   const parsed = CreateProductInputSchema.parse(await req.json());
 */

import { z } from "zod";

// ── Primitives ──────────────────────────────────────────────

export const EmailSchema = z
  .string()
  .email()
  .max(254)
  .transform((s) => s.toLowerCase());

export const SlugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

export const SkuSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[A-Z0-9][A-Z0-9\-_]+$/, "Invalid SKU format")
  .transform((s) => s.toUpperCase());

export const CurrencySchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/);

export const MoneySchema = z.object({
  amount: z.number().int().nonnegative(),
  currency: CurrencySchema
});

export const CountryCodeSchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/);

export const AddressSchema = z.object({
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(1).max(20),
  country: CountryCodeSchema
});

export const LocaleSchema = z
  .string()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Invalid locale (e.g. en, pt-BR)");

// ── Auth / Customer ─────────────────────────────────────────

export const RegisterCustomerInputSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(200),
  locale: LocaleSchema.optional().default("en")
});

export const LoginInputSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1)
});

export const AddCustomerAddressInputSchema = z.object({
  label: z.string().min(1).max(50),
  address: AddressSchema,
  isDefault: z.boolean().optional().default(false)
});

// ── Catalog ─────────────────────────────────────────────────

export const CreateProductInputSchema = z.object({
  sku: SkuSchema,
  slug: SlugSchema,
  title: z.string().min(1).max(300),
  description: z.string().max(10000),
  basePrice: MoneySchema,
  categoryId: z.string().cuid().optional()
});

export const CreateVariantInputSchema = z.object({
  sku: SkuSchema,
  attributes: z.record(z.string(), z.string()),
  price: MoneySchema,
  compareAtPrice: MoneySchema.optional(),
  inventory: z.number().int().nonnegative()
});

export const CreateCategoryInputSchema = z.object({
  slug: SlugSchema,
  name: z.string().min(1).max(200),
  parentId: z.string().cuid().optional(),
  description: z.string().max(2000).optional()
});

export const ListProductsQuerySchema = z.object({
  query: z.string().max(200).optional(),
  categoryId: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(24),
  sort: z.enum(["relevance", "price_asc", "price_desc", "newest", "popular"]).default("relevance"),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional()
});

// ── Cart ────────────────────────────────────────────────────

export const AddToCartInputSchema = z.object({
  productId: z.string().cuid(),
  variantId: z.string().cuid().optional(),
  quantity: z.number().int().positive().max(999)
});

export const UpdateCartItemInputSchema = z.object({
  itemId: z.string().cuid(),
  quantity: z.number().int().nonnegative().max(999)
});

// ── Checkout ────────────────────────────────────────────────

export const StartCheckoutInputSchema = z.object({
  cartId: z.string().cuid()
});

export const SetShippingAddressInputSchema = z.object({
  checkoutSessionId: z.string().cuid(),
  address: AddressSchema
});

export const SelectShippingMethodInputSchema = z.object({
  checkoutSessionId: z.string().cuid(),
  methodCode: z.string().min(1).max(50)
});

export const CompleteCheckoutInputSchema = z.object({
  checkoutSessionId: z.string().cuid(),
  paymentMethod: z.object({
    type: z.enum(["card", "paypal"]),
    paymentIntentId: z.string().min(1).max(200)
  })
});

// ── Order ───────────────────────────────────────────────────

export const CancelOrderInputSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().max(500).optional()
});

export const ListOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum(["pending", "confirmed", "paid", "shipped", "delivered", "cancelled", "refunded"])
    .optional()
});

// ── Exported types ──────────────────────────────────────────

export type RegisterCustomerInput = z.infer<typeof RegisterCustomerInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;
export type CreateVariantInput = z.infer<typeof CreateVariantInputSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;
export type ListProductsQuery = z.infer<typeof ListProductsQuerySchema>;
export type AddToCartInput = z.infer<typeof AddToCartInputSchema>;
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemInputSchema>;
export type StartCheckoutInput = z.infer<typeof StartCheckoutInputSchema>;
export type SetShippingAddressInput = z.infer<typeof SetShippingAddressInputSchema>;
export type SelectShippingMethodInput = z.infer<typeof SelectShippingMethodInputSchema>;
export type CompleteCheckoutInput = z.infer<typeof CompleteCheckoutInputSchema>;
export type CancelOrderInput = z.infer<typeof CancelOrderInputSchema>;
export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;
