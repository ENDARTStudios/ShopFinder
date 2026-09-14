/**
 * @workspace/database/repositories/product-offer-repository
 */

import type { ProductOfferRepository as IProductOfferRepository } from "@workspace/domain/repositories";
import type { ProductOffer } from "@workspace/domain/supplier";
import type { TransactionClient } from "../types";
import type { EventCollector } from "../unit-of-work/event-collector";
import { BaseRepository, NotFoundError, OptimisticLockError } from "../base/base-repository";
import { ProductOfferMapper, type ProductOfferPrismaModel } from "../mappers/product-offer-mapper";

export class PrismaProductOfferRepository
  extends BaseRepository<ProductOffer>
  implements IProductOfferRepository
{
  constructor(tx: TransactionClient, collector: EventCollector) {
    super({ tx, collector });
  }

  protected getModelName(): string {
    return "ProductOffer";
  }

  protected getInclude() {
    return {};
  }

  async findById(id: string): Promise<ProductOffer | null> {
    const prisma = await this.tx.productOffer.findFirst({
      where: { id, ...this.softDeleteFilter }
    });
    return prisma ? ProductOfferMapper.toAggregate(prisma as ProductOfferPrismaModel) : null;
  }

  async findByProduct(productId: string): Promise<ProductOffer[]> {
    const prisma = await this.tx.productOffer.findMany({
      where: { productId, ...this.softDeleteFilter, isActive: true },
      orderBy: { priceMinorUnits: "asc" }
    });
    return prisma.map((o) => ProductOfferMapper.toAggregate(o as ProductOfferPrismaModel));
  }

  async findByProductAndVariant(productId: string, variantId?: string): Promise<ProductOffer[]> {
    const prisma = await this.tx.productOffer.findMany({
      where: {
        productId,
        variantId: variantId ?? null,
        ...this.softDeleteFilter,
        isActive: true
      },
      orderBy: { priceMinorUnits: "asc" }
    });
    return prisma.map((o) => ProductOfferMapper.toAggregate(o as ProductOfferPrismaModel));
  }

  async findBySupplier(
    supplierId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<ProductOffer[]> {
    const prisma = await this.tx.productOffer.findMany({
      where: { supplierId, ...this.softDeleteFilter },
      take: opts?.limit ?? 20,
      skip: opts?.offset ?? 0,
      orderBy: { lastSyncedAt: "desc" }
    });
    return prisma.map((o) => ProductOfferMapper.toAggregate(o as ProductOfferPrismaModel));
  }

  async findBestOffer(
    productId: string,
    variantId?: string,
    rule?: "cheapest" | "fastest"
  ): Promise<ProductOffer | null> {
    const orderBy =
      rule === "fastest"
        ? { fulfillmentDaysMin: "asc" as const }
        : { priceMinorUnits: "asc" as const };

    const prisma = await this.tx.productOffer.findFirst({
      where: {
        productId,
        variantId: variantId ?? null,
        ...this.softDeleteFilter,
        isActive: true,
        inventory: { gt: 0 }
      },
      orderBy
    });
    return prisma ? ProductOfferMapper.toAggregate(prisma as ProductOfferPrismaModel) : null;
  }

  async save(offer: ProductOffer): Promise<ProductOffer> {
    const existing = await this.tx.productOffer.findUnique({
      where: { id: offer.id },
      select: { id: true, version: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      const created = await this.tx.productOffer.create({
        data: ProductOfferMapper.toPrismaInput(offer)
      });
      this.collectEvents(offer);
      return ProductOfferMapper.toAggregate(created as ProductOfferPrismaModel);
    }

    const updated = await this.tx.productOffer.updateMany({
      where: this.getOptimisticLockFilter(offer.id, offer.version),
      data: ProductOfferMapper.toPrismaUpdateInput(offer)
    });
    if (updated.count === 0) throw new OptimisticLockError(offer.id, offer.version);

    const result = await this.tx.productOffer.findUnique({ where: { id: offer.id } });
    this.collectEvents(offer);
    return ProductOfferMapper.toAggregate(result as ProductOfferPrismaModel);
  }

  async delete(id: string): Promise<void> {
    const result = await this.tx.productOffer.updateMany({
      where: { id, ...this.softDeleteFilter },
      data: { deletedAt: new Date() }
    });
    if (result.count === 0) throw new NotFoundError("ProductOffer", id);
  }
}
