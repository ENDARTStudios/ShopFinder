/**
 * @workspace/database/repositories/variant-repository
 */

import type { VariantRepository as IVariantRepository } from "@workspace/domain/repositories";
import type { Variant } from "@workspace/domain/catalog";
import type { VariantId } from "@workspace/domain/shared";
import type { TransactionClient } from "../types";
import type { EventCollector } from "../unit-of-work/event-collector";
import { BaseEntityRepository, NotFoundError, OptimisticLockError } from "../base/base-repository";
import { asVariantId } from "@workspace/domain/shared";
import type { Prisma } from "@prisma/client";

interface VariantPrismaModel {
  id: string;
  productId: string;
  sku: string;
  priceMinorUnits: bigint;
  priceCurrencyCode: string;
  compareAtPriceMinorUnits: bigint | null;
  compareAtPriceCurrencyCode: string | null;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const toAggregate = (p: VariantPrismaModel): Variant => ({
  id: asVariantId(p.id),
  sku: { value: p.sku },
  attributes: {},
  price: { amount: Number(p.priceMinorUnits), currency: p.priceCurrencyCode },
  compareAtPrice: p.compareAtPriceMinorUnits
    ? { amount: Number(p.compareAtPriceMinorUnits), currency: p.compareAtPriceCurrencyCode! }
    : undefined,
  isActive: p.isActive,
  version: p.version,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt
});

export class PrismaVariantRepository
  extends BaseEntityRepository<Variant>
  implements IVariantRepository
{
  constructor(tx: TransactionClient, collector: EventCollector) {
    super({ tx, collector });
  }

  protected getModelName(): string {
    return "Variant";
  }

  async findById(id: VariantId): Promise<Variant | null> {
    const prisma = await this.tx.variant.findFirst({
      where: { id, ...this.softDeleteFilter }
    });
    return prisma ? toAggregate(prisma as VariantPrismaModel) : null;
  }

  async findByProductId(productId: string): Promise<Variant[]> {
    const prisma = await this.tx.variant.findMany({
      where: { productId, ...this.softDeleteFilter }
    });
    return prisma.map((p) => toAggregate(p as VariantPrismaModel));
  }

  async findBySku(sku: string): Promise<Variant | null> {
    const prisma = await this.tx.variant.findFirst({
      where: { sku, ...this.softDeleteFilter }
    });
    return prisma ? toAggregate(prisma as VariantPrismaModel) : null;
  }

  async save(variant: Variant): Promise<Variant> {
    const existing = await this.tx.variant.findUnique({
      where: { id: variant.id },
      select: { id: true, version: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      const data: Prisma.VariantCreateInput = {
        id: variant.id,
        product: { connect: { id: "" } },
        sku: variant.sku.value,
        priceMinorUnits: BigInt(variant.price.amount),
        priceCurrencyCode: variant.price.currency,
        compareAtPriceMinorUnits: variant.compareAtPrice
          ? BigInt(variant.compareAtPrice.amount)
          : undefined,
        compareAtPriceCurrencyCode: variant.compareAtPrice?.currency,
        isActive: variant.isActive,
        version: 1
      };
      const created = await this.tx.variant.create({ data });

      return toAggregate(created as VariantPrismaModel);
    }

    const updated = await this.tx.variant.updateMany({
      where: this.getOptimisticLockFilter(variant.id, variant.version),
      data: {
        priceMinorUnits: BigInt(variant.price.amount),
        priceCurrencyCode: variant.price.currency,
        isActive: variant.isActive,
        version: { increment: 1 }
      }
    });
    if (updated.count === 0) throw new OptimisticLockError(variant.id, variant.version);

    const result = await this.tx.variant.findUnique({ where: { id: variant.id } });
    return toAggregate(result as VariantPrismaModel);
  }

  async delete(id: VariantId): Promise<void> {
    const result = await this.tx.variant.updateMany({
      where: { id, ...this.softDeleteFilter },
      data: { deletedAt: new Date() }
    });
    if (result.count === 0) throw new NotFoundError("Variant", id);
  }
}
