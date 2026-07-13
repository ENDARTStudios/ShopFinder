/**
 * @workspace/database/mappers/category-mapper
 */

import type { Category } from "@workspace/domain/catalog";
import { asCategoryId } from "@workspace/domain/shared";
import type { Prisma } from "@prisma/client";

export interface CategoryPrismaModel {
  id: string;
  storeId: string;
  slug: string;
  name: string;
  parentId: string | null;
  description: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export const CategoryMapper = {
  toAggregate(prisma: CategoryPrismaModel): Category {
    return {
      id: asCategoryId(prisma.id),
      slug: { value: prisma.slug },
      name: prisma.name,
      parentId: prisma.parentId ? asCategoryId(prisma.parentId) : undefined,
      description: prisma.description ?? undefined,
      version: prisma.version,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
      domainEvents: [],
      markEventsAsCommitted() {}
    };
  },

  toPrismaInput(aggregate: Category): Prisma.CategoryCreateInput {
    return {
      id: aggregate.id,
      store: { connect: { id: "" } },
      slug: aggregate.slug.value,
      name: aggregate.name,
      parent: aggregate.parentId ? { connect: { id: aggregate.parentId } } : undefined,
      description: aggregate.description,
      version: 1
    };
  },

  toPrismaUpdateInput(aggregate: Category): Prisma.CategoryUpdateInput {
    return {
      slug: aggregate.slug.value,
      name: aggregate.name,
      description: aggregate.description,
      version: { increment: 1 }
    };
  }
};
