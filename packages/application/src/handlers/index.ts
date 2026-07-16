/**
 * @workspace/application/handlers — Command & Query Handlers
 *
 * Handlers orchestrate: repositories (writes), query services (reads),
 * domain services, and domain factories. They NEVER:
 *   - open transactions (CommandBus owns UoW)
 *   - publish events directly (UoW persists outbox)
 *   - contain domain rules (domain aggregates enforce invariants)
 *   - authorize (Policies do that via middleware)
 *   - import Prisma (only @workspace/database knows Prisma)
 */

import type {
  CommandHandler,
  QueryHandler,
  RequestContext,
  CommandResult,
  QueryResult
} from "../types";
import { ok, fail, AppErrors } from "../types";
import type { RepositoryRegistry } from "@workspace/domain/shared";
import { createProduct } from "@workspace/domain/catalog";
import { createCustomer } from "@workspace/domain/customer";
import { createCart } from "@workspace/domain/cart";
import { asCustomerId, asProductId, asVariantId } from "@workspace/domain/shared";
import type { ProductQueryService, CartQueryService } from "@workspace/domain/queries";
import type {
  ProductDetailDTO,
  ProductListItemDTO,
  PaginationDTO,
  CartDTO
} from "@workspace/contracts/dto";
import type {
  CreateProductInput,
  RegisterCustomerInput,
  AddToCartInput,
  RegisterUserInput
} from "../commands";
import type { GetProductInput, ListProductsInput, GetCartInput } from "../queries";

// ── Create Product Handler ──────────────────────────────────

export class CreateProductHandler implements CommandHandler<
  CreateProductInput,
  { productId: string }
> {
  readonly type = "catalog.product.create";

  async handle(
    payload: CreateProductInput,
    ctx: RequestContext & { repositories: RepositoryRegistry; tx: unknown }
  ): Promise<CommandResult<{ productId: string }>> {
    const { productRepository } = ctx.repositories;

    const result = createProduct({
      storeId: payload.storeId,
      sku: payload.sku,
      slug: payload.slug,
      title: payload.title,
      description: payload.description,
      basePrice: payload.basePrice
    });

    if (!result.ok) return fail(AppErrors.validation(result.error.message));

    const saved = await productRepository.save(result.value);
    return ok({ productId: saved.id });
  }
}

// ── Publish Product Handler ─────────────────────────────────

export class PublishProductHandler implements CommandHandler<{ productId: string }, void> {
  readonly type = "catalog.product.publish";

  async handle(
    payload: { productId: string },
    ctx: RequestContext & { repositories: RepositoryRegistry; tx: unknown }
  ): Promise<CommandResult<void>> {
    const { productRepository } = ctx.repositories;
    const product = await productRepository.findById(asProductId(payload.productId));
    if (!product) return fail(AppErrors.notFound("Product", payload.productId));

    if (product.status !== "draft") {
      return fail(AppErrors.conflict(`Cannot publish product in status: ${product.status}`));
    }

    const updated = { ...product, status: "published" as const };
    await productRepository.save(updated);
    return ok(undefined);
  }
}

// ── Register Customer Handler ───────────────────────────────

export class RegisterCustomerHandler implements CommandHandler<
  RegisterCustomerInput,
  { customerId: string }
> {
  readonly type = "customer.register";

  async handle(
    payload: RegisterCustomerInput,
    ctx: RequestContext & { repositories: RepositoryRegistry; tx: unknown }
  ): Promise<CommandResult<{ customerId: string }>> {
    const { customerRepository } = ctx.repositories;

    const existing = await customerRepository.findByEmail(payload.email);
    if (existing) return fail(AppErrors.conflict("Email already registered"));

    const result = createCustomer({
      storeId: payload.storeId,
      email: payload.email,
      name: payload.name,
      locale: payload.locale
    });

    if (!result.ok) return fail(AppErrors.validation(result.error.message));

    const saved = await customerRepository.save(result.value);
    return ok({ customerId: saved.id });
  }
}

// ── Register User Handler (Identity — per Epic 1.1 refactor) ─

export class RegisterUserHandler implements CommandHandler<
  RegisterUserInput,
  { userId: string; customerId: string }
> {
  readonly type = "identity.user.register";

  async handle(
    payload: RegisterUserInput,
    ctx: RequestContext & { repositories: RepositoryRegistry; tx: unknown }
  ): Promise<CommandResult<{ userId: string; customerId: string }>> {
    const { customerRepository, userRepository } = ctx.repositories;

    const existingUser = await userRepository.findByEmail(payload.email);
    if (existingUser) return fail(AppErrors.conflict("Email already registered"));

    const customerResult = createCustomer({
      storeId: payload.storeId,
      email: payload.email,
      name: payload.name,
      locale: payload.locale
    });
    if (!customerResult.ok) return fail(AppErrors.validation(customerResult.error.message));

    const savedCustomer = await customerRepository.save(customerResult.value);

    const { hashPassword } = await import("@workspace/auth");
    const passwordHash = await hashPassword(payload.password);

    const savedUser = await userRepository.save({
      id: `user_${Date.now()}`,
      email: payload.email.toLowerCase(),
      passwordHash,
      roles: payload.roles,
      storeId: payload.storeId,
      customerId: savedCustomer.id,
      status: "active",
      emailVerifiedAt: new Date(),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return ok({ userId: savedUser.id, customerId: savedCustomer.id });
  }
}

// ── Add to Cart Handler ─────────────────────────────────────

export class AddToCartHandler implements CommandHandler<AddToCartInput, { cartId: string }> {
  readonly type = "cart.item.add";

  async handle(
    payload: AddToCartInput,
    ctx: RequestContext & { repositories: RepositoryRegistry; tx: unknown }
  ): Promise<CommandResult<{ cartId: string }>> {
    const { cartRepository, productRepository, inventoryRepository } = ctx.repositories;

    let cart = payload.customerId
      ? await cartRepository.findByCustomerId(asCustomerId(payload.customerId))
      : await cartRepository.findBySessionId(payload.sessionId);

    if (!cart) {
      const cartResult = createCart({
        storeId: payload.storeId,
        sessionId: payload.sessionId,
        customerId: payload.customerId,
        currency: payload.currency
      });
      if (!cartResult.ok) return fail(AppErrors.validation(cartResult.error.message));
      cart = await cartRepository.save(cartResult.value);
    }

    const product = await productRepository.findById(asProductId(payload.productId));
    if (!product) return fail(AppErrors.notFound("Product", payload.productId));

    if (payload.variantId) {
      const inv = await inventoryRepository.findByVariantId(asVariantId(payload.variantId));
      if (inv && inv.available < payload.quantity) {
        return fail(
          AppErrors.conflict(
            `Insufficient stock: available ${inv.available}, requested ${payload.quantity}`
          )
        );
      }
      await inventoryRepository.reserve(asVariantId(payload.variantId), payload.quantity);
    }

    return ok({ cartId: cart.id });
  }
}

// ── Query Handlers (receive QueryService interfaces) ─

export class GetProductHandler implements QueryHandler<GetProductInput, ProductDetailDTO> {
  readonly type = "catalog.product.get";

  constructor(private readonly productQueryService: ProductQueryService) {}

  async handle(
    payload: GetProductInput,
    _ctx: RequestContext
  ): Promise<QueryResult<ProductDetailDTO>> {
    const product = await this.productQueryService.detail(payload.slug);
    if (!product) return fail(AppErrors.notFound("Product", payload.slug));
    return ok(product);
  }
}

export class ListProductsHandler implements QueryHandler<
  ListProductsInput,
  { items: ProductListItemDTO[]; pagination: PaginationDTO }
> {
  readonly type = "catalog.products.list";

  constructor(private readonly productQueryService: ProductQueryService) {}

  async handle(
    payload: ListProductsInput,
    _ctx: RequestContext
  ): Promise<QueryResult<{ items: ProductListItemDTO[]; pagination: PaginationDTO }>> {
    const result = await this.productQueryService.list(payload as never);
    return ok(result);
  }
}

export class GetCartHandler implements QueryHandler<GetCartInput, CartDTO | null> {
  readonly type = "cart.get";

  constructor(private readonly cartQueryService: CartQueryService) {}

  async handle(payload: GetCartInput, _ctx: RequestContext): Promise<QueryResult<CartDTO | null>> {
    const cart = await this.cartQueryService.active(
      payload.customerId ? asCustomerId(payload.customerId) : undefined,
      payload.sessionId
    );
    return ok(cart);
  }
}
