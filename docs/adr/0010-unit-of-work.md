# ADR-0010: Unit of Work

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

Use cases like "place order" span multiple aggregates: read the cart, create
the order, decrement inventory, create a payment, emit domain events. These
operations must be **atomic** — either all succeed or all roll back. Without
a transaction abstraction, the application service would either:

1. Call Prisma's `$transaction` directly — coupling the domain to Prisma.
2. Skip transactions — risking inconsistent state on partial failure.

The user explicitly requested a `UnitOfWork` abstraction so the domain doesn't
know Prisma.

## Decision

Define a `UnitOfWork` interface in `@workspace/domain/shared`:

```ts
interface UnitOfWork {
  transaction<T>(fn: (repositories: RepositoryRegistry) => Promise<T>): Promise<T>;
  readonly repositories: RepositoryRegistry;
}

interface RepositoryRegistry {
  readonly productRepository: ProductRepository;
  readonly categoryRepository: CategoryRepository;
  readonly variantRepository: VariantRepository;
  readonly inventoryRepository: InventoryRepository;
  readonly customerRepository: CustomerRepository;
  readonly cartRepository: CartRepository;
  readonly checkoutSessionRepository: CheckoutSessionRepository;
  readonly orderRepository: OrderRepository;
  readonly paymentRepository: PaymentRepository;
  readonly supplierRepository: SupplierRepository;
  readonly supplierOrderRepository: SupplierOrderRepository;
  readonly productOfferRepository: ProductOfferRepository;
}
```

### How it works

- `transaction(fn)` opens a database transaction and provides a
  `RepositoryRegistry` whose repositories share the same transaction context.
- If `fn` returns successfully, the transaction commits.
- If `fn` throws, the transaction rolls back.
- `uow.repositories` provides repositories in autocommit mode (for read-only
  or single-write commands).

### Implementation (04B)

`PrismaUnitOfWork` in `@workspace/database`:

- Wraps `prisma.$transaction(async (tx) => ...)`.
- Constructs repositories with the transaction-scoped Prisma client.
- Default isolation: READ COMMITTED.
- `AdvancedUnitOfWork` adds `transactionWithIsolation(level, fn)` for cases
  that need stronger isolation (e.g. inventory decrement).

### Usage example

```ts
class PlaceOrderService {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(cmd: PlaceOrderCommand): Promise<Order> {
    return this.uow.transaction(async (repos) => {
      const cart = await repos.cartRepository.findById(cmd.cartId);
      if (!cart) throw new Error("Cart not found");

      const order = createOrderFromCart(cart, cmd);
      const saved = await repos.orderRepository.save(order);

      for (const item of cart.items) {
        await repos.inventoryRepository.commit(item.variantId, item.quantity);
      }

      await repos.cartRepository.delete(cart.id);
      return saved;
    });
  }
}
```

## Consequences

**Positive**

- Domain services depend on `UnitOfWork`, not Prisma. Swapping ORMs or adding
  a second data store is contained to `@workspace/database`.
- Transactions are explicit — no hidden autocommit surprises.
- Testable: mock `UnitOfWork` to verify transaction boundaries in unit tests.
- The `RepositoryRegistry` pattern makes it clear which repositories participate
  in a transaction.

**Negative**

- Slightly more verbose than calling Prisma directly.
- The `RepositoryRegistry` must be kept in sync with new repositories.
- Long-running transactions can hold locks. Mitigation: keep `fn` fast;
  offload heavy work (email, webhooks) to post-commit event handlers.

## Alternatives Considered

- **Prisma `$transaction` directly in services** — rejected: couples domain
  to Prisma, blocks future ORM swaps.
- **Saga pattern** — deferred: useful for distributed transactions across
  microservices, but YAGNI for the monolith phase. The Unit of Work interface
  is compatible with upgrading to sagas later.
- **Eventual consistency (no transactions)** — rejected: order placement
  requires atomicity. Inventory + order + payment must commit together.

## References

- ADR-0009 (Persistence Model — defines what's persisted)
- ADR-0011 (Query/Command Separation — read side doesn't need UoW)
- `packages/domain/src/shared/unit-of-work.ts` (interface)
