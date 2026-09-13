/**
 * @workspace/bootstrap/buses — Register all Command & Query handlers
 *
 * Called once during container initialization. Each handler is registered
 * with its command/query type, Zod schema, and optional authorize function.
 */

import type { CommandBus, QueryBus } from "@workspace/application";
import type { ProductQueryService, CartQueryService } from "@workspace/domain/queries";
import {
  CreateProductCommand,
  UpdateProductCommand,
  PublishProductCommand,
  DeleteProductCommand,
  RegisterCustomerCommand,
  UpdateCustomerCommand,
  RegisterUserCommand,
  AddToCartCommand,
  UpdateCartItemCommand,
  RemoveCartItemCommand,
  PlaceOrderCommand,
  CancelOrderCommand,
  ConnectSupplierCommand,
  SyncSupplierCommand
} from "@workspace/application";
import {
  ListProductsQuery,
  GetProductQuery,
  GetRelatedProductsQuery,
  ListCategoriesQuery,
  GetCustomerProfileQuery,
  GetCustomerOrdersQuery,
  GetCartQuery,
  GetOrderQuery,
  ListOrdersQuery,
  GetOrderStatsQuery,
  ListSuppliersQuery
} from "@workspace/application";
import {
  CreateProductHandler,
  PublishProductHandler,
  RegisterCustomerHandler,
  RegisterUserHandler,
  AddToCartHandler,
  GetProductHandler,
  ListProductsHandler,
  GetCartHandler
} from "@workspace/application";
import {
  CatalogPolicy,
  CustomerPolicy,
  CartPolicy,
  OrderPolicy,
  SupplierPolicy
} from "@workspace/application";
import type { RequestContext } from "@workspace/application";

export function registerHandlers(
  commandBus: CommandBus,
  queryBus: QueryBus,
  productQueryService: ProductQueryService,
  cartQueryService: CartQueryService
): void {
  // ── Command Handlers (registered as implemented per Epic) ──

  commandBus.register(
    CreateProductCommand.type,
    new CreateProductHandler(),
    CreateProductCommand.schema,
    (_payload, ctx: RequestContext) => CatalogPolicy.canCreate(ctx)
  );

  commandBus.register(
    PublishProductCommand.type,
    new PublishProductHandler(),
    PublishProductCommand.schema,
    (_payload, ctx: RequestContext) => CatalogPolicy.canUpdate(ctx)
  );

  commandBus.register(
    RegisterCustomerCommand.type,
    new RegisterCustomerHandler(),
    RegisterCustomerCommand.schema
    // No auth required — anyone can register
  );

  commandBus.register(
    RegisterUserCommand.type,
    new RegisterUserHandler(),
    RegisterUserCommand.schema
    // No auth required — anyone can register
  );

  commandBus.register(
    AddToCartCommand.type,
    new AddToCartHandler(),
    AddToCartCommand.schema,
    (_payload, ctx: RequestContext) => CartPolicy.canAddItem(ctx)
  );

  // Commands with handlers not yet implemented (will be added per Epic):
  // UpdateProductCommand, DeleteProductCommand, UpdateCustomerCommand,
  // UpdateCartItemCommand, RemoveCartItemCommand,
  // PlaceOrderCommand, CancelOrderCommand,
  // ConnectSupplierCommand, SyncSupplierCommand

  // ── Query Handlers ────────────────────────────────────────

  queryBus.register(
    ListProductsQuery.type,
    new ListProductsHandler(productQueryService),
    ListProductsQuery.schema
    // Public — no auth required
  );

  queryBus.register(
    GetProductQuery.type,
    new GetProductHandler(productQueryService),
    GetProductQuery.schema
    // Public
  );

  queryBus.register(
    GetCartQuery.type,
    new GetCartHandler(cartQueryService),
    GetCartQuery.schema,
    (payload, ctx: RequestContext) =>
      CartPolicy.canRead(
        ctx,
        (payload as { customerId?: string }).customerId,
        (payload as { sessionId?: string }).sessionId
      )
  );

  // Queries without handlers yet (will be added per Epic):
  // GetRelatedProductsQuery, ListCategoriesQuery, GetCustomerProfileQuery,
  // GetCustomerOrdersQuery, GetOrderQuery, ListOrdersQuery, GetOrderStatsQuery,
  // ListSuppliersQuery
}
