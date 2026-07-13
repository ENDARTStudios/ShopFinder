/**
 * @workspace/contracts/events
 *
 * Domain event contracts — the schema for every event that crosses a
 * bounded-context boundary. These are the integration contracts;
 * internal domain events (in packages/domain/&#42;/events) may carry richer
 * types but must be serializable to these shapes at the boundary.
 *
 * Each event has:
 *   - a string eventType (used for routing / pub-sub),
 *   - a Zod schema for validation at trust boundaries,
 *   - a TypeScript type inferred from the schema.
 */

import { z } from "zod";

// ── Base event envelope ─────────────────────────────────────

export const DomainEventEnvelopeSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  aggregateId: z.string().min(1),
  aggregateType: z.string().min(1),
  occurredAt: z.string().datetime(),
  version: z.number().int().positive()
});

export type DomainEventEnvelope = z.infer<typeof DomainEventEnvelopeSchema>;

// ── Catalog events ──────────────────────────────────────────

export const ProductCreatedSchema = DomainEventEnvelopeSchema.extend({
  eventType: z.literal("catalog.product.created"),
  aggregateType: z.literal("Product"),
  payload: z.object({
    sku: z.string(),
    slug: z.string(),
    title: z.string()
  })
});
export type ProductCreatedEvent = z.infer<typeof ProductCreatedSchema>;

export const ProductPublishedSchema = DomainEventEnvelopeSchema.extend({
  eventType: z.literal("catalog.product.published"),
  aggregateType: z.literal("Product"),
  payload: z.object({})
});
export type ProductPublishedEvent = z.infer<typeof ProductPublishedSchema>;

export const ProductPriceChangedSchema = DomainEventEnvelopeSchema.extend({
  eventType: z.literal("catalog.product.price_changed"),
  aggregateType: z.literal("Product"),
  payload: z.object({
    oldAmount: z.number().int(),
    newAmount: z.number().int(),
    currency: z.string().length(3)
  })
});
export type ProductPriceChangedEvent = z.infer<typeof ProductPriceChangedSchema>;

// ── Customer events ─────────────────────────────────────────

export const CustomerRegisteredSchema = DomainEventEnvelopeSchema.extend({
  eventType: z.literal("customer.registered"),
  aggregateType: z.literal("Customer"),
  payload: z.object({
    email: z.string().email(),
    name: z.string()
  })
});
export type CustomerRegisteredEvent = z.infer<typeof CustomerRegisteredSchema>;

// ── Cart events ─────────────────────────────────────────────

export const CartAbandonedSchema = DomainEventEnvelopeSchema.extend({
  eventType: z.literal("cart.abandoned"),
  aggregateType: z.literal("Cart"),
  payload: z.object({})
});
export type CartAbandonedEvent = z.infer<typeof CartAbandonedSchema>;

// ── Order events ────────────────────────────────────────────

export const OrderPlacedSchema = DomainEventEnvelopeSchema.extend({
  eventType: z.literal("order.placed"),
  aggregateType: z.literal("Order"),
  payload: z.object({
    number: z.string(),
    customerId: z.string(),
    grandTotal: z.object({ amount: z.number().int(), currency: z.string().length(3) })
  })
});
export type OrderPlacedEvent = z.infer<typeof OrderPlacedSchema>;

export const OrderPaidSchema = DomainEventEnvelopeSchema.extend({
  eventType: z.literal("order.paid"),
  aggregateType: z.literal("Order"),
  payload: z.object({
    paymentId: z.string()
  })
});
export type OrderPaidEvent = z.infer<typeof OrderPaidSchema>;

export const OrderShippedSchema = DomainEventEnvelopeSchema.extend({
  eventType: z.literal("order.shipped"),
  aggregateType: z.literal("Order"),
  payload: z.object({
    fulfillmentId: z.string(),
    trackingNumber: z.string().optional()
  })
});
export type OrderShippedEvent = z.infer<typeof OrderShippedSchema>;

export const OrderCancelledSchema = DomainEventEnvelopeSchema.extend({
  eventType: z.literal("order.cancelled"),
  aggregateType: z.literal("Order"),
  payload: z.object({
    reason: z.string().optional()
  })
});
export type OrderCancelledEvent = z.infer<typeof OrderCancelledSchema>;

// ── Payment events ──────────────────────────────────────────

export const PaymentCapturedSchema = DomainEventEnvelopeSchema.extend({
  eventType: z.literal("payment.captured"),
  aggregateType: z.literal("Payment"),
  payload: z.object({
    providerTxId: z.string(),
    amount: z.object({ amount: z.number().int(), currency: z.string().length(3) })
  })
});
export type PaymentCapturedEvent = z.infer<typeof PaymentCapturedSchema>;

export const PaymentFailedSchema = DomainEventEnvelopeSchema.extend({
  eventType: z.literal("payment.failed"),
  aggregateType: z.literal("Payment"),
  payload: z.object({
    failureCode: z.string(),
    failureMessage: z.string()
  })
});
export type PaymentFailedEvent = z.infer<typeof PaymentFailedSchema>;

// ── Supplier events ─────────────────────────────────────────

export const SupplierOrderShippedSchema = DomainEventEnvelopeSchema.extend({
  eventType: z.literal("supplier.order.shipped"),
  aggregateType: z.literal("SupplierOrder"),
  payload: z.object({
    trackingNumber: z.string().optional(),
    trackingUrl: z.string().url().optional()
  })
});
export type SupplierOrderShippedEvent = z.infer<typeof SupplierOrderShippedSchema>;

// ── Event registry ──────────────────────────────────────────

export const EVENT_SCHEMAS = {
  "catalog.product.created": ProductCreatedSchema,
  "catalog.product.published": ProductPublishedSchema,
  "catalog.product.price_changed": ProductPriceChangedSchema,
  "customer.registered": CustomerRegisteredSchema,
  "cart.abandoned": CartAbandonedSchema,
  "order.placed": OrderPlacedSchema,
  "order.paid": OrderPaidSchema,
  "order.shipped": OrderShippedSchema,
  "order.cancelled": OrderCancelledSchema,
  "payment.captured": PaymentCapturedSchema,
  "payment.failed": PaymentFailedSchema,
  "supplier.order.shipped": SupplierOrderShippedSchema
} as const;

export type EventType = keyof typeof EVENT_SCHEMAS;

/** Validate a raw event payload against its schema. Returns the typed event or throws. */
export function validateEvent<T extends EventType>(
  eventType: T,
  raw: unknown
): z.infer<(typeof EVENT_SCHEMAS)[T]> {
  const schema = EVENT_SCHEMAS[eventType];
  return schema.parse(raw) as z.infer<(typeof EVENT_SCHEMAS)[T]>;
}
