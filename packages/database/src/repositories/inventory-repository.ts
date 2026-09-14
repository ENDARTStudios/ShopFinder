/**
 * @workspace/database/repositories/inventory-repository
 * Per Rec 2: centralized soft delete + optimistic lock via BaseRepository.
 * Per Rec 4: reserve/commit/release are atomic operations.
 */

import type { InventoryRepository as IInventoryRepository } from "@workspace/domain/repositories";
import type { Inventory } from "@workspace/domain/catalog";
import type { VariantId } from "@workspace/domain/shared";
import type { TransactionClient } from "../types";
import type { EventCollector } from "../unit-of-work/event-collector";
import { BaseEntityRepository, NotFoundError, OptimisticLockError } from "../base/base-repository";

interface InventoryPrismaModel {
  id: string;
  variantId: string;
  productOfferId: string | null;
  available: number;
  reserved: number;
  committed: number;
  reorderedAt: Date | null;
  version: number;
}

const toAggregate = (p: InventoryPrismaModel): Inventory => ({
  id: p.id,
  variantId: p.variantId as never,
  productOfferId: p.productOfferId ?? undefined,
  available: p.available,
  reserved: p.reserved,
  committed: p.committed,
  reorderedAt: p.reorderedAt ?? undefined,
  version: p.version
});

export class PrismaInventoryRepository
  extends BaseEntityRepository<Inventory>
  implements IInventoryRepository
{
  constructor(tx: TransactionClient, collector: EventCollector) {
    super({ tx, collector });
  }

  protected getModelName(): string {
    return "Inventory";
  }

  async findByVariantId(variantId: VariantId): Promise<Inventory | null> {
    const prisma = await this.tx.inventory.findFirst({
      where: { variantId, ...this.softDeleteFilter }
    });
    return prisma ? toAggregate(prisma as InventoryPrismaModel) : null;
  }

  async findByVariantAndOffer(variantId: VariantId, offerId: string): Promise<Inventory | null> {
    const prisma = await this.tx.inventory.findFirst({
      where: { variantId, productOfferId: offerId, ...this.softDeleteFilter }
    });
    return prisma ? toAggregate(prisma as InventoryPrismaModel) : null;
  }

  async save(inventory: Inventory): Promise<Inventory> {
    const existing = await this.tx.inventory.findUnique({
      where: { id: inventory.id },
      select: { id: true, version: true }
    });

    if (!existing) {
      const created = await this.tx.inventory.create({
        data: {
          id: inventory.id,
          variantId: inventory.variantId,
          productOfferId: inventory.productOfferId,
          available: inventory.available,
          reserved: inventory.reserved,
          committed: inventory.committed,
          reorderedAt: inventory.reorderedAt,
          version: 1
        }
      });
      return toAggregate(created as InventoryPrismaModel);
    }

    const updated = await this.tx.inventory.updateMany({
      where: this.getOptimisticLockFilter(inventory.id, inventory.version),
      data: {
        available: inventory.available,
        reserved: inventory.reserved,
        committed: inventory.committed,
        reorderedAt: inventory.reorderedAt,
        version: { increment: 1 }
      }
    });
    if (updated.count === 0) throw new OptimisticLockError(inventory.id, inventory.version);

    const result = await this.tx.inventory.findUnique({ where: { id: inventory.id } });
    return toAggregate(result as InventoryPrismaModel);
  }

  async reserve(variantId: VariantId, quantity: number): Promise<Inventory> {
    // Atomic: decrement available, increment reserved. Fails if insufficient stock.
    const result = await this.tx.inventory.updateMany({
      where: { variantId, available: { gte: quantity }, ...this.softDeleteFilter },
      data: { available: { decrement: quantity }, reserved: { increment: quantity } }
    });
    if (result.count === 0) {
      const inv = await this.findByVariantId(variantId);
      if (!inv) throw new NotFoundError("Inventory", variantId);
      throw new Error(
        `Insufficient stock for variant ${variantId}: available ${inv.available}, requested ${quantity}`
      );
    }
    return (await this.findByVariantId(variantId))!;
  }

  async commit(variantId: VariantId, quantity: number): Promise<Inventory> {
    const result = await this.tx.inventory.updateMany({
      where: { variantId, reserved: { gte: quantity }, ...this.softDeleteFilter },
      data: { reserved: { decrement: quantity }, committed: { increment: quantity } }
    });
    if (result.count === 0) {
      const inv = await this.findByVariantId(variantId);
      if (!inv) throw new NotFoundError("Inventory", variantId);
      throw new Error(
        `Insufficient reserved stock for variant ${variantId}: reserved ${inv.reserved}, requested ${quantity}`
      );
    }
    return (await this.findByVariantId(variantId))!;
  }

  async release(variantId: VariantId, quantity: number): Promise<Inventory> {
    const result = await this.tx.inventory.updateMany({
      where: { variantId, reserved: { gte: quantity }, ...this.softDeleteFilter },
      data: { reserved: { decrement: quantity }, available: { increment: quantity } }
    });
    if (result.count === 0) {
      const inv = await this.findByVariantId(variantId);
      if (!inv) throw new NotFoundError("Inventory", variantId);
      throw new Error(
        `Insufficient reserved stock for variant ${variantId}: reserved ${inv.reserved}, requested ${quantity}`
      );
    }
    return (await this.findByVariantId(variantId))!;
  }
}
