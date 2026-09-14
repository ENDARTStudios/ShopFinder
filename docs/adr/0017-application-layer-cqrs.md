# ADR-0017: Application Layer — CQRS & Command/Query Bus

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The data infrastructure (Schema + Repositories + Queries) is complete. The next
layer is Application Services — the orchestration layer between Route Handlers
and Domain/Database. The user explicitly requested:

1. `@workspace/application` package with CQRS structure.
2. Formalized Command → CommandHandler → Repository → Aggregate flow.
3. Formalized Query → QueryHandler → QueryService → DTO flow.
4. CommandBus wraps handlers in UnitOfWork — handlers never open transactions.
5. Events published via Outbox (Repository.save → collectEvents → UoW persists),
   never directly.
6. Policies for authorization (not inside handlers).
7. Validation via Zod schemas per command.

## Decision

Create `@workspace/application` package with:

### 1. CQRS Base Types (`types/`)

- `Command` / `Query` — marker interfaces with type + payload.
- `CommandHandler<TPayload, TResult>` / `QueryHandler<TPayload, TResult>` — handler interfaces.
- `CommandResult<T>` / `QueryResult<T>` — Result<T, ApplicationError> (ok/fail).
- `RequestContext` — auth, requestId, idempotencyKey, locale, ipAddress.
- `ApplicationError` — code, message, statusCode, details.
- `AppErrors` — factory (validation, unauthorized, forbidden, notFound, conflict, internal).

### 2. CommandBus & QueryBus (`bus.ts`)

- `CommandBus` — registers handlers with Zod schemas + optional authorize fn.
  - `execute(type, payload, ctx)` → Pipeline (validation → auth → logging → metrics) → `UnitOfWork.transaction(handler)` → outbox persists → commit.
  - Handlers receive `RepositoryRegistry` via extended context — never open transactions.
- `QueryBus` — same pattern but no transaction (read-only).
  - Handlers receive `prisma` client for QueryService construction.

### 3. Pipeline (`pipeline/`)

- `Pipeline<TPayload, TResult>` — composable middleware chain.
- `createPipeline()` — builder.
- Built-in middlewares: `validationMiddleware`, `authorizationMiddleware`, `loggingMiddleware`, `metricsMiddleware`, `idempotencyMiddleware`.

### 4. Authorization (`authorization/`)

- `Role` — customer | admin | supplier | support.
- `Permission` — 17 granular permissions (catalog.read, catalog.write, order.cancel, etc.).
- `ROLE_PERMISSIONS` — maps roles to permissions.
- `PermissionChecker` — can(permission), canAny, canAll, isOwner, isAdmin.
- `resolvePermissions(roles)` — builds permission set from roles.

### 5. Policies (`policies/`)

- `CatalogPolicy` — canRead (public), canCreate, canUpdate, canDelete, canManageVariants.
- `CustomerPolicy` — canRead (self or admin), canUpdate, canDelete.
- `OrderPolicy` — canRead (self or admin), canPlace, canCancel, canRefund, canFulfill.
- `SupplierPolicy` — canRead (public), canConnect, canSync, canManageOffers.
- `CartPolicy` — canRead (self or session), canAddItem, canCheckout.
- `PaymentPolicy` — canRead (self or admin), canInitiate, canRefund.

### 6. Commands (`commands/`)

13 command definitions with Zod schemas:

- Catalog: CreateProduct, UpdateProduct, PublishProduct, DeleteProduct.
- Customer: RegisterCustomer, UpdateCustomer.
- Cart: AddToCart, UpdateCartItem, RemoveCartItem.
- Order: PlaceOrder, CancelOrder.
- Supplier: ConnectSupplier, SyncSupplier.

### 7. Queries (`queries/`)

11 query definitions with Zod schemas:

- Catalog: ListProducts, GetProduct, GetRelatedProducts.
- Category: ListCategories.
- Customer: GetCustomerProfile, GetCustomerOrders.
- Cart: GetCart.
- Order: GetOrder, ListOrders, GetOrderStats.
- Supplier: ListSuppliers.

### 8. Handlers (`handlers/`)

7 concrete handlers demonstrating the pattern:

- `CreateProductHandler` — uses `createProduct` factory + productRepository.save.
- `PublishProductHandler` — loads product, checks domain rule (status === draft), saves.
- `RegisterCustomerHandler` — checks email uniqueness, uses `createCustomer` factory, saves.
- `AddToCartHandler` — finds/creates cart, checks inventory, reserves stock.
- `GetProductHandler` — delegates to PrismaProductQueryService, returns DTO.
- `ListProductsHandler` — delegates to PrismaProductQueryService, returns paginated DTOs.
- `GetCartHandler` — delegates to PrismaCartQueryService, returns CartDTO.

## Consequences

**Positive**

- Clean separation: Route Handlers → Bus → Handler → Domain/Database.
- Transaction ownership is unambiguous: CommandBus owns UoW, never handlers.
- Authorization is declarative: each command specifies an authorize fn, enforced by middleware.
- Validation is declarative: each command specifies a Zod schema, enforced by middleware.
- Pipeline eliminates repetition: logging, metrics, idempotency are composed, not duplicated.
- Front-end never depends on domain aggregates — only DTOs from contracts.

**Negative**

- More indirection: Route Handler → Bus → Pipeline → Handler → Repository.
  Justified: each layer has a single responsibility.
- Handler registry must be maintained — each new command/query needs registration.
  Mitigated: a bootstrap function can auto-register all handlers.

## Alternatives Considered

- **Direct service calls (no bus)** — rejected: no centralized validation, auth, logging, metrics.
- **MediatR-style reflection** — rejected: TypeScript doesn't have runtime reflection like C#.
  Explicit registration is more verbose but type-safe.
- **GraphQL resolvers instead of CQRS** — deferred: CQRS + Bus works for REST now;
  GraphQL can be added as another transport layer later.

## References

- ADR-0010 (Unit of Work — CommandBus wraps handlers in UoW)
- ADR-0011 (Query/Command Separation — formalized here)
- ADR-0015 (Repository Implementation Patterns — handlers use these repositories)
- ADR-0016 (Query Layer — handlers use these query services)
- `packages/application/src/` (implementation)
