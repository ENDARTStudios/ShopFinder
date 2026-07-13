/**
 * @workspace/database/repositories/cart-repository
 */

import type { CartRepository as ICartRepository } from "@workspace/domain/repositories";
import type { Cart } from "@workspace/domain/cart";
import type { CartId } from "@workspace/domain/shared";
import type { TransactionClient } from "../types";
import type { EventCollector } from "../unit-of-work/event-collector";
import { BaseRepository, NotFoundError, OptimisticLockError } from "../base/base-repository";
import { CartMapper, type CartPrismaModel } from "../mappers/cart-mapper";

export class PrismaCartRepository extends BaseRepository<Cart> implements ICartRepository {
  constructor(tx: TransactionClient, collector: EventCollector) {
    super({ tx, collector });
  }

  protected getModelName(): string {
    return "Cart";
  }

  protected getInclude() {
    return {
      items: { orderBy: { createdAt: "asc" as const } }
    };
  }

  async findById(id: CartId): Promise<Cart | null> {
    const prisma = await this.tx.cart.findFirst({
      where: { id, ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma ? CartMapper.toAggregate(prisma as CartPrismaModel) : null;
  }

  async findByCustomerId(customerId: string): Promise<Cart | null> {
    const prisma = await this.tx.cart.findFirst({
      where: { customerId, status: "active", ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma ? CartMapper.toAggregate(prisma as CartPrismaModel) : null;
  }

  async findBySessionId(sessionId: string): Promise<Cart | null> {
    const prisma = await this.tx.cart.findFirst({
      where: { sessionId, status: "active", ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma ? CartMapper.toAggregate(prisma as CartPrismaModel) : null;
  }

  async save(cart: Cart): Promise<Cart> {
    const existing = await this.tx.cart.findUnique({
      where: { id: cart.id },
      select: { id: true, version: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      const created = await this.tx.cart.create({
        data: CartMapper.toPrismaInput(cart),
        include: this.getInclude()
      });
      this.collectEvents(cart);
      return CartMapper.toAggregate(created as CartPrismaModel);
    }

    const updated = await this.tx.cart.updateMany({
      where: this.getOptimisticLockFilter(cart.id, cart.version),
      data: CartMapper.toPrismaUpdateInput(cart)
    });
    if (updated.count === 0) throw new OptimisticLockError(cart.id, cart.version);

    const result = await this.tx.cart.findUnique({
      where: { id: cart.id },
      include: this.getInclude()
    });
    this.collectEvents(cart);
    return CartMapper.toAggregate(result as CartPrismaModel);
  }

  async delete(id: CartId): Promise<void> {
    const result = await this.tx.cart.updateMany({
      where: { id, ...this.softDeleteFilter },
      data: { deletedAt: new Date() }
    });
    if (result.count === 0) throw new NotFoundError("Cart", id);
  }
}
