/**
 * @workspace/database/queries — Query Service implementations
 *
 * Per Rec 4 of 04B.3 feedback: NEVER return aggregates. Always return DTOs.
 * Per Rec 7 (04B.2): cursor pagination (after/before/limit).
 * Per Rec 6 (04B.3): use read models to avoid repetitive joins.
 *
 * Query services are read-only, outside transactions, and can hit
 * replica / cache / search index.
 */

export { PrismaProductQueryService } from "./product-query-service";
export { PrismaCategoryQueryService } from "./category-query-service";
export { PrismaCustomerQueryService } from "./customer-query-service";
export { PrismaCartQueryService } from "./cart-query-service";
export { PrismaOrderQueryService } from "./order-query-service";
export { PrismaSupplierQueryService } from "./supplier-query-service";
