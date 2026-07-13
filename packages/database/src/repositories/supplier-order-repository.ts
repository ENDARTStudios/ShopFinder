/**
 * @workspace/database/repositories/supplier-order-repository
 */

import type { SupplierOrderRepository as ISupplierOrderRepository } from "@workspace/domain/repositories";
import type { SupplierOrder } from "@workspace/domain/supplier";
import type { SupplierOrderId } from "@workspace/domain/shared";
import type { TransactionClient } from "../types";
import type { EventCollector } from "../unit-of-work/event-collector";
import { BaseRepository, NotFoundError, OptimisticLockError } from "../base/base-repository";
import { asSupplierOrderId, asSupplierId, asOrderId } from "@workspace/domain/shared";

interface SupplierOrderPrismaModel {
  id: string;
  supplierId: string;
  orderId: string;
  supplierOrderRef: string | null;
  totalCostMinorUnits: bigint;
  totalCostCurrencyCode: string;
  status: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  placedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const toAggregate = (p: SupplierOrderPrismaModel): SupplierOrder => ({
  id: asSupplierOrderId(p.id),
  supplierId: asSupplierId(p.supplierId),
  orderId: asOrderId(p.orderId),
  supplierOrderRef: p.supplierOrderRef ?? undefined,
  items: [],
  totalCost: { amount: Number(p.totalCostMinorUnits), currency: p.totalCostCurrencyCode },
  status: p.status as SupplierOrder["status"],
  trackingNumber: p.trackingNumber ?? undefined,
  trackingUrl: p.trackingUrl ?? undefined,
  placedAt: p.placedAt ?? undefined,
  shippedAt: p.shippedAt ?? undefined,
  deliveredAt: p.deliveredAt ?? undefined,
  version: p.version,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  domainEvents: [],
  markEventsAsCommitted() {}
});

export class PrismaSupplierOrderRepository
  extends BaseRepository<SupplierOrder>
  implements ISupplierOrderRepository
{
  constructor(tx: TransactionClient, collector: EventCollector) {
    super({ tx, collector });
  }

  protected getModelName(): string {
    return "SupplierOrder";
  }

  protected getInclude() {
    return { items: true };
  }

  async findById(id: SupplierOrderId): Promise<SupplierOrder | null> {
    const prisma = await this.tx.supplierOrder.findFirst({
      where: { id, ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma ? toAggregate(prisma as SupplierOrderPrismaModel) : null;
  }

  async findByOrderId(orderId: string): Promise<SupplierOrder[]> {
    const prisma = await this.tx.supplierOrder.findMany({
      where: { orderId, ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma.map((o) => toAggregate(o as SupplierOrderPrismaModel));
  }

  async findBySupplierId(
    supplierId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<SupplierOrder[]> {
    const prisma = await this.tx.supplierOrder.findMany({
      where: { supplierId, ...this.softDeleteFilter },
      include: this.getInclude(),
      take: opts?.limit ?? 20,
      skip: opts?.offset ?? 0,
      orderBy: { createdAt: "desc" }
    });
    return prisma.map((o) => toAggregate(o as SupplierOrderPrismaModel));
  }

  async save(order: SupplierOrder): Promise<SupplierOrder> {
    const existing = await this.tx.supplierOrder.findUnique({
      where: { id: order.id },
      select: { id: true, version: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      const created = await this.tx.supplierOrder.create({
        data: {
          id: order.id,
          supplier: { connect: { id: order.supplierId } },
          order: { connect: { id: order.orderId } },
          supplierOrderRef: order.supplierOrderRef,
          totalCostMinorUnits: BigInt(order.totalCost.amount),
          totalCostCurrencyCode: order.totalCost.currency,
          status: order.status,
          trackingNumber: order.trackingNumber,
          trackingUrl: order.trackingUrl,
          placedAt: order.placedAt,
          shippedAt: order.shippedAt,
          deliveredAt: order.deliveredAt,
          version: 1
        },
        include: this.getInclude()
      });
      this.collectEvents(order);
      return toAggregate(created as SupplierOrderPrismaModel);
    }

    const updated = await this.tx.supplierOrder.updateMany({
      where: this.getOptimisticLockFilter(order.id, order.version),
      data: {
        supplierOrderRef: order.supplierOrderRef,
        status: order.status,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        placedAt: order.placedAt,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
        version: { increment: 1 }
      }
    });
    if (updated.count === 0) throw new OptimisticLockError(order.id, order.version);

    const result = await this.tx.supplierOrder.findUnique({
      where: { id: order.id },
      include: this.getInclude()
    });
    this.collectEvents(order);
    return toAggregate(result as SupplierOrderPrismaModel);
  }

  async delete(id: SupplierOrderId): Promise<void> {
    const result = await this.tx.supplierOrder.updateMany({
      where: { id, ...this.softDeleteFilter },
      data: { deletedAt: new Date() }
    });
    if (result.count === 0) throw new NotFoundError("SupplierOrder", id);
  }
}
