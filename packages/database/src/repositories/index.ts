/**
 * @workspace/database/repositories — public API
 *
 * Re-exports all 12 concrete repositories that implement the domain
 * repository interfaces. These are constructed by PrismaRepositoryFactory
 * and bound to a transaction context via PrismaUnitOfWork.
 */

export { PrismaProductRepository } from "./product-repository";
export { PrismaCategoryRepository } from "./category-repository";
export { PrismaVariantRepository } from "./variant-repository";
export { PrismaInventoryRepository } from "./inventory-repository";
export { PrismaCustomerRepository } from "./customer-repository";
export { PrismaCartRepository } from "./cart-repository";
export { PrismaCheckoutSessionRepository } from "./checkout-session-repository";
export { PrismaOrderRepository } from "./order-repository";
export { PrismaPaymentRepository } from "./payment-repository";
export { PrismaSupplierRepository } from "./supplier-repository";
export { PrismaSupplierOrderRepository } from "./supplier-order-repository";
export { PrismaProductOfferRepository } from "./product-offer-repository";
