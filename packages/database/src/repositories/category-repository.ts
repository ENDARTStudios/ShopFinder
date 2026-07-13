/**
 * @workspace/database/repositories/category-repository
 */

import type { CategoryRepository as ICategoryRepository } from "@workspace/domain/repositories";
import type { Category } from "@workspace/domain/catalog";
import type { CategoryId } from "@workspace/domain/shared";
import type { TransactionClient } from "../types";
import type { EventCollector } from "../unit-of-work/event-collector";
import { BaseRepository, NotFoundError, OptimisticLockError } from "../base/base-repository";
import { CategoryMapper, type CategoryPrismaModel } from "../mappers/category-mapper";

export class PrismaCategoryRepository
  extends BaseRepository<Category>
  implements ICategoryRepository
{
  constructor(tx: TransactionClient, collector: EventCollector) {
    super({ tx, collector });
  }

  protected getModelName(): string {
    return "Category";
  }

  protected getInclude() {
    return {};
  }

  async findById(id: CategoryId): Promise<Category | null> {
    const prisma = await this.tx.category.findFirst({
      where: { id, ...this.softDeleteFilter }
    });
    return prisma ? CategoryMapper.toAggregate(prisma as CategoryPrismaModel) : null;
  }

  async findByIdIncludingDeleted(id: CategoryId): Promise<Category | null> {
    const prisma = await this.tx.category.findUnique({ where: { id } });
    return prisma ? CategoryMapper.toAggregate(prisma as CategoryPrismaModel) : null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const prisma = await this.tx.category.findFirst({
      where: { slug, ...this.softDeleteFilter }
    });
    return prisma ? CategoryMapper.toAggregate(prisma as CategoryPrismaModel) : null;
  }

  async findChildren(parentId: CategoryId): Promise<Category[]> {
    const prisma = await this.tx.category.findMany({
      where: { parentId, ...this.softDeleteFilter },
      orderBy: { name: "asc" }
    });
    return prisma.map((c) => CategoryMapper.toAggregate(c as CategoryPrismaModel));
  }

  async save(category: Category): Promise<Category> {
    const existing = await this.tx.category.findUnique({
      where: { id: category.id },
      select: { id: true, version: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      const created = await this.tx.category.create({
        data: CategoryMapper.toPrismaInput(category)
      });
      this.collectEvents(category);
      return CategoryMapper.toAggregate(created as CategoryPrismaModel);
    }

    const updated = await this.tx.category.updateMany({
      where: this.getOptimisticLockFilter(category.id, category.version),
      data: CategoryMapper.toPrismaUpdateInput(category)
    });

    if (updated.count === 0) {
      throw new OptimisticLockError(category.id, category.version);
    }

    const result = await this.tx.category.findUnique({ where: { id: category.id } });
    this.collectEvents(category);
    return CategoryMapper.toAggregate(result as CategoryPrismaModel);
  }

  async delete(id: CategoryId): Promise<void> {
    const result = await this.tx.category.updateMany({
      where: { id, ...this.softDeleteFilter },
      data: { deletedAt: new Date() }
    });
    if (result.count === 0) throw new NotFoundError("Category", id);
  }

  async restore(id: CategoryId): Promise<void> {
    await this.tx.category.updateMany({
      where: { id },
      data: { deletedAt: null }
    });
  }
}
