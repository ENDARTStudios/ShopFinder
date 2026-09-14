/**
 * @workspace/database/repositories/product-repository
 *
 * Per Rec 1: only this file knows Prisma's Product shape (via ProductMapper).
 * Per Rec 2: extends BaseRepository for centralized soft delete + optimistic lock.
 * Per Rec 6: always uses explicit include — no lazy loading (anti-N+1).
 */

import type { ProductRepository as IProductRepository } from "@workspace/domain/repositories";
import type { Product } from "@workspace/domain/catalog";
import type { ProductId } from "@workspace/domain/shared";
import type { TransactionClient } from "../types";
import type { EventCollector } from "../unit-of-work/event-collector";
import { BaseRepository, NotFoundError, OptimisticLockError } from "../base/base-repository";
import { ProductMapper, type ProductPrismaModel } from "../mappers/product-mapper";

export class PrismaProductRepository extends BaseRepository<Product> implements IProductRepository {
  constructor(tx: TransactionClient, collector: EventCollector) {
    super({ tx, collector });
  }

  protected getModelName(): string {
    return "Product";
  }

  protected getInclude() {
    return {
      variants: { where: { deletedAt: null } },
      media: { orderBy: { position: "asc" as const } },
      attributes: true
    };
  }

  async findById(id: ProductId): Promise<Product | null> {
    const prisma = await this.tx.product.findFirst({
      where: { id, ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma ? ProductMapper.toAggregate(prisma as ProductPrismaModel) : null;
  }

  async findByIdIncludingDeleted(id: ProductId): Promise<Product | null> {
    const prisma = await this.tx.product.findUnique({
      where: { id },
      include: this.getInclude()
    });
    return prisma ? ProductMapper.toAggregate(prisma as ProductPrismaModel) : null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const prisma = await this.tx.product.findFirst({
      where: { slug, ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma ? ProductMapper.toAggregate(prisma as ProductPrismaModel) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const prisma = await this.tx.product.findFirst({
      where: { sku, ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma ? ProductMapper.toAggregate(prisma as ProductPrismaModel) : null;
  }

  async findByCategory(
    categoryId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<Product[]> {
    const prisma = await this.tx.product.findMany({
      where: { categoryId, ...this.softDeleteFilter },
      include: this.getInclude(),
      take: opts?.limit ?? 20,
      skip: opts?.offset ?? 0,
      orderBy: { createdAt: "desc" }
    });
    return prisma.map((p) => ProductMapper.toAggregate(p as ProductPrismaModel));
  }

  async save(product: Product): Promise<Product> {
    const existing = await this.tx.product.findUnique({
      where: { id: product.id },
      select: { id: true, version: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      // Create new (or restore + update)
      const created = await this.tx.product.create({
        data: ProductMapper.toPrismaInput(product),
        include: this.getInclude()
      });
      this.collectEvents(product);
      return ProductMapper.toAggregate(created as ProductPrismaModel);
    }

    // Update with optimistic lock
    const updated = await this.tx.product.updateMany({
      where: this.getOptimisticLockFilter(product.id, product.version),
      data: ProductMapper.toPrismaUpdateInput(product)
    });

    if (updated.count === 0) {
      throw new OptimisticLockError(product.id, product.version);
    }

    const result = await this.tx.product.findUnique({
      where: { id: product.id },
      include: this.getInclude()
    });
    this.collectEvents(product);
    return ProductMapper.toAggregate(result as ProductPrismaModel);
  }

  async delete(id: ProductId): Promise<void> {
    const result = await this.tx.product.updateMany({
      where: { id, ...this.softDeleteFilter },
      data: { deletedAt: new Date() }
    });
    if (result.count === 0) throw new NotFoundError("Product", id);
  }

  async restore(id: ProductId): Promise<void> {
    await this.tx.product.updateMany({
      where: { id },
      data: { deletedAt: null }
    });
  }
}
