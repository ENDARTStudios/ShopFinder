/**
 * @workspace/database — Database layer
 *
 * Public API:
 *   - client: Prisma client singleton
 *   - unit-of-work: PrismaUnitOfWork + PrismaRepositoryFactory
 *   - repositories: 12 concrete repository implementations
 *   - mappers: Prisma ↔ Domain aggregate translators (8 mappers)
 *   - cache: CacheRepository interface + NoopCacheRepository (Redis-ready)
 *   - types: TransactionClient, CursorPagination, EventCollector
 *
 * Usage:
 *   import { prisma, PrismaUnitOfWork, PrismaRepositoryFactory } from "@workspace/database";
 *
 *   const factory = new PrismaRepositoryFactory(prisma);
 *   const uow = new PrismaUnitOfWork(prisma, factory);
 *   await uow.transaction(async (repos) => {
 *     await repos.productRepository.save(product);
 *   });
 */

export { prisma, type PrismaClient } from "./client";
export type { Prisma } from "./client";

// RLS — transações com contexto de tenant (docs/eng/RLS.md)
export { withTenantTransaction, type TenantContext } from "./rls";

export {
  PrismaUnitOfWork,
  PrismaRepositoryFactory,
  type RepositoryFactory,
  createEventCollector,
  type EventCollector
} from "./unit-of-work";

export {
  PrismaProductRepository,
  PrismaCategoryRepository,
  PrismaVariantRepository,
  PrismaInventoryRepository,
  PrismaCustomerRepository,
  PrismaCartRepository,
  PrismaCheckoutSessionRepository,
  PrismaOrderRepository,
  PrismaPaymentRepository,
  PrismaSupplierRepository,
  PrismaSupplierOrderRepository,
  PrismaProductOfferRepository
} from "./repositories";

export {
  ProductMapper,
  CategoryMapper,
  CustomerMapper,
  CartMapper,
  OrderMapper,
  PaymentMapper,
  SupplierMapper,
  ProductOfferMapper,
  type Mapper
} from "./mappers";

export type { CacheRepository, NoopCacheRepository, CacheKeys } from "./cache";

// Query services (read side) — consumidos pelo bootstrap/container
export {
  PrismaProductQueryService,
  PrismaCategoryQueryService,
  PrismaCustomerQueryService,
  PrismaCartQueryService,
  PrismaOrderQueryService,
  PrismaSupplierQueryService
} from "./queries";

// Query/entity caches (Rec 9) — getEntityCache/getQueryCache usados no container
export {
  NoopEntityCache,
  NoopQueryCache,
  InMemoryEntityCache,
  InMemoryQueryCache,
  getEntityCache,
  getQueryCache,
  setEntityCache,
  setQueryCache,
  buildQuerySignature
} from "./cache/query-cache";
export type { EntityCache, QueryCache } from "./cache/query-cache";

export type {
  TransactionClient,
  CursorPaginationInput,
  CursorPage,
  SpecificationInput,
  OutboxEntry
} from "./types";

export { BaseRepository, OptimisticLockError, NotFoundError } from "./base/base-repository";
