/**
 * @workspace/database/mappers — Mapper Layer
 *
 * Per Rec 1 of 04B.2 feedback: mappers translate between Prisma models
 * and domain aggregates. The database layer knows Prisma; the domain
 * layer never does. Mappers are the ONLY place where this translation happens.
 *
 * Flow:
 *   Prisma Model  →  Mapper.toAggregate()  →  Domain Aggregate
 *   Domain Aggregate  →  Mapper.toPrismaInput()  →  Prisma create/update data
 *
 * Mappers are stateless and pure. One mapper per aggregate root.
 */

export { ProductMapper } from "./product-mapper";
export { CategoryMapper } from "./category-mapper";
export { CustomerMapper } from "./customer-mapper";
export { CartMapper } from "./cart-mapper";
export { OrderMapper } from "./order-mapper";
export { PaymentMapper } from "./payment-mapper";
export { SupplierMapper } from "./supplier-mapper";
export { ProductOfferMapper } from "./product-offer-mapper";

// ── Base mapper interface ───────────────────────────────────

export interface Mapper<TAggregate, TPrismaModel, TPrismaInput> {
  toAggregate(prismaModel: TPrismaModel): TAggregate;
  toPrismaInput(aggregate: TAggregate): TPrismaInput;
}
