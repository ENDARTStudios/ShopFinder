/**
 * @workspace/database/repositories/order-repository
 */

import type { OrderRepository as IOrderRepository } from "@workspace/domain/repositories";
import type { Order } from "@workspace/domain/order";
import type { OrderId } from "@workspace/domain/shared";
import type { TransactionClient } from "../types";
import type { EventCollector } from "../unit-of-work/event-collector";
import { BaseRepository, NotFoundError, OptimisticLockError } from "../base/base-repository";
import { OrderMapper, type OrderPrismaModel } from "../mappers/order-mapper";

export class PrismaOrderRepository extends BaseRepository<Order> implements IOrderRepository {
  constructor(tx: TransactionClient, collector: EventCollector) {
    super({ tx, collector });
  }

  protected getModelName(): string {
    return "Order";
  }

  protected getInclude() {
    return {
      items: true,
      fulfillments: true
    };
  }

  async findById(id: OrderId): Promise<Order | null> {
    const prisma = await this.tx.order.findFirst({
      where: { id, ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma ? OrderMapper.toAggregate(prisma as OrderPrismaModel) : null;
  }

  async findByNumber(number: string): Promise<Order | null> {
    const prisma = await this.tx.order.findFirst({
      where: { number, ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma ? OrderMapper.toAggregate(prisma as OrderPrismaModel) : null;
  }

  async findByCustomerId(
    customerId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<Order[]> {
    const prisma = await this.tx.order.findMany({
      where: { customerId, ...this.softDeleteFilter },
      include: this.getInclude(),
      take: opts?.limit ?? 20,
      skip: opts?.offset ?? 0,
      orderBy: { placedAt: "desc" }
    });
    return prisma.map((o) => OrderMapper.toAggregate(o as OrderPrismaModel));
  }

  async save(order: Order): Promise<Order> {
    const existing = await this.tx.order.findUnique({
      where: { id: order.id },
      select: { id: true, version: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      const created = await this.tx.order.create({
        data: OrderMapper.toPrismaInput(order),
        include: this.getInclude()
      });
      this.collectEvents(order);
      return OrderMapper.toAggregate(created as OrderPrismaModel);
    }

    const updated = await this.tx.order.updateMany({
      where: this.getOptimisticLockFilter(order.id, order.version),
      data: OrderMapper.toPrismaUpdateInput(order)
    });
    if (updated.count === 0) throw new OptimisticLockError(order.id, order.version);

    const result = await this.tx.order.findUnique({
      where: { id: order.id },
      include: this.getInclude()
    });
    this.collectEvents(order);
    return OrderMapper.toAggregate(result as OrderPrismaModel);
  }

  async delete(id: OrderId): Promise<void> {
    const result = await this.tx.order.updateMany({
      where: { id, ...this.softDeleteFilter },
      data: { deletedAt: new Date() }
    });
    if (result.count === 0) throw new NotFoundError("Order", id);
  }
}
