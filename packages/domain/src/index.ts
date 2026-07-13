/**
 * @workspace/domain
 *
 * Domain model — bounded contexts, aggregates, entities, value objects,
 * domain events, repository contracts, domain services, specifications,
 * and the in-process event bus.
 *
 * Bounded Contexts:
 *   - shared          : base primitives (EntityId, AggregateRoot, DomainEvent, Money, ...)
 *   - catalog         : Product, Variant, Category
 *   - customer        : Customer, Address, Wishlist
 *   - cart            : Cart, CartItem
 *   - checkout        : CheckoutSession, ShippingMethod
 *   - order           : Order, OrderItem, Fulfillment
 *   - payment         : Payment, Transaction, Refund
 *   - supplier        : Supplier, SupplierOrder, SupplierProduct
 *
 * Cross-cutting:
 *   - repositories    : interfaces (ProductRepository, OrderRepository, ...)
 *   - services        : interfaces (PricingService, ShippingService, ...)
 *   - specifications  : Specification<T> pattern (CanCheckout, ProductAvailable, ...)
 *
 * Import patterns:
 *   import { type Product, createProduct } from "@workspace/domain/catalog";
 *   import { money, type Money } from "@workspace/domain/shared";
 *   import { type ProductRepository } from "@workspace/domain/repositories";
 *   import { type PricingService } from "@workspace/domain/services";
 *   import { getEventBus } from "@workspace/domain/shared";
 */

export * from "./shared";
export * as catalog from "./catalog";
export * as customer from "./customer";
export * as cart from "./cart";
export * as checkout from "./checkout";
export * as order from "./order";
export * as payment from "./payment";
export * as supplier from "./supplier";
export * as store from "./store";
export * as identity from "./identity";
export * as integration from "./integration";
export * as lookup from "./lookup";
export * from "./repositories";
export * from "./queries";
export * from "./services";
export * from "./specifications";

// Re-export the most common types at the top level for convenience.
export type {
  EntityId,
  BrandedId,
  ProductId,
  VariantId,
  CategoryId,
  CustomerId,
  CartId,
  OrderId,
  PaymentId,
  SupplierId,
  SupplierOrderId,
  Entity,
  AggregateRoot,
  ValueObject,
  DomainEvent,
  DomainEventBus,
  Result,
  DomainError
} from "./shared";
export {
  asEntityId,
  asProductId,
  asVariantId,
  asCategoryId,
  asCustomerId,
  asCartId,
  asOrderId,
  asPaymentId,
  asSupplierId,
  asSupplierOrderId,
  ok,
  err,
  money,
  email,
  address,
  quantity,
  percentage,
  slug,
  getEventBus,
  setEventBus,
  resetEventBus
} from "./shared";
