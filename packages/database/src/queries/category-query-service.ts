/**
 * @workspace/database/queries/category-query-service
 */
import type { CategoryQueryService } from "@workspace/domain/queries";
import type { CategoryId } from "@workspace/domain/shared";
import type { CategoryDTO } from "@workspace/contracts/dto";
import type { TransactionClient } from "../types";
import { withMetrics } from "../metrics";

export class PrismaCategoryQueryService implements CategoryQueryService {
  constructor(private readonly prisma: TransactionClient) {}

  async list(): Promise<CategoryDTO[]> {
    return withMetrics("CategoryQueryService", "list", async () => {
      const cats = await this.prisma.category.findMany({
        where: { deletedAt: null },
        select: { id: true, slug: true, name: true, parentId: true },
        orderBy: { name: "asc" }
      });
      return cats.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        parentId: c.parentId ?? undefined
      }));
    });
  }

  async tree(): Promise<CategoryDTO[]> {
    return this.list();
  }

  async findBySlug(slug: string): Promise<CategoryDTO | null> {
    return withMetrics("CategoryQueryService", "findBySlug", async () => {
      const c = await this.prisma.category.findFirst({
        where: { slug, deletedAt: null },
        select: { id: true, slug: true, name: true, parentId: true }
      });
      return c ? { id: c.id, slug: c.slug, name: c.name, parentId: c.parentId ?? undefined } : null;
    });
  }
}
