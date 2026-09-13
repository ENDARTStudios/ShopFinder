/**
 * @workspace/domain/shared/unit-of-work
 *
 * Unit of Work abstraction. The domain layer defines transactions without
 * knowing Prisma (or any specific ORM). Implementations live in
 * @workspace/database (PrismaUnitOfWork) and are injected into application
 * services.
 *
 * Usage:
 *   import { type UnitOfWork } from "@workspace/domain/shared";
 *
 *   class PlaceOrderService {
 *     constructor(private readonly uow: UnitOfWork) {}
 *     async execute(cmd: PlaceOrderCommand) {
 *       return this.uow.transaction(async (tx) => {
 *         const order = await tx.orderRepository.save(...);
 *         await tx.paymentRepository.save(...);
 *         return order;
 *       });
 *     }
 *   }
 *
 * The `tx` object passed to the callback is a RepositoryRegistry — a set of
 * repositories sharing the same transaction context.
 */

import type {
  ProductRepository,
  CategoryRepository,
  VariantRepository,
  InventoryRepository,
  CustomerRepository,
  UserRepository,
  CartRepository,
  CheckoutSessionRepository,
  OrderRepository,
  PaymentRepository,
  SupplierRepository,
  SupplierOrderRepository,
  ProductOfferRepository
} from "../repositories";

// ── Repository Registry (transaction-scoped) ────────────────

export interface RepositoryRegistry {
  readonly productRepository: ProductRepository;
  readonly categoryRepository: CategoryRepository;
  readonly variantRepository: VariantRepository;
  readonly inventoryRepository: InventoryRepository;
  readonly customerRepository: CustomerRepository;
  readonly userRepository: UserRepository;
  readonly cartRepository: CartRepository;
  readonly checkoutSessionRepository: CheckoutSessionRepository;
  readonly orderRepository: OrderRepository;
  readonly paymentRepository: PaymentRepository;
  readonly supplierRepository: SupplierRepository;
  readonly supplierOrderRepository: SupplierOrderRepository;
  readonly productOfferRepository: ProductOfferRepository;
}

// ── Unit of Work ────────────────────────────────────────────

export interface UnitOfWork {
  /**
   * Execute a function within a transaction. All repository operations
   * inside the callback share the same transaction context.
   *
   * - If the function returns successfully, the transaction commits.
   * - If the function throws, the transaction rolls back.
   *
   * Implementations MUST guarantee isolation level READ COMMITTED by default.
   */
  transaction<T>(fn: (repositories: RepositoryRegistry, tx: unknown) => Promise<T>): Promise<T>;

  /**
   * Access repositories outside a transaction (autocommit mode).
   * Useful for read-only operations or single-write commands.
   */
  readonly repositories: RepositoryRegistry;
}

// ── Transaction isolation (for future use) ──────────────────

export type IsolationLevel =
  "read_uncommitted" | "read_committed" | "repeatable_read" | "serializable";

export interface AdvancedUnitOfWork extends UnitOfWork {
  transactionWithIsolation<T>(
    isolation: IsolationLevel,
    fn: (repositories: RepositoryRegistry) => Promise<T>
  ): Promise<T>;
}
