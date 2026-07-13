/**
 * @workspace/database/repositories/supplier-repository
 */

import type { SupplierRepository as ISupplierRepository } from "@workspace/domain/repositories";
import type { Supplier } from "@workspace/domain/supplier";
import type { SupplierId } from "@workspace/domain/shared";
import type { TransactionClient } from "../types";
import type { EventCollector } from "../unit-of-work/event-collector";
import { BaseRepository, NotFoundError, OptimisticLockError } from "../base/base-repository";
import { SupplierMapper, type SupplierPrismaModel } from "../mappers/supplier-mapper";

export class PrismaSupplierRepository
  extends BaseRepository<Supplier>
  implements ISupplierRepository
{
  constructor(tx: TransactionClient, collector: EventCollector) {
    super({ tx, collector });
  }

  protected getModelName(): string {
    return "Supplier";
  }

  protected getInclude() {
    return {
      integrations: { take: 1 }
    };
  }

  async findById(id: SupplierId): Promise<Supplier | null> {
    const prisma = await this.tx.supplier.findFirst({
      where: { id, ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma ? SupplierMapper.toAggregate(prisma as SupplierPrismaModel) : null;
  }

  async findByIdIncludingDeleted(id: SupplierId): Promise<Supplier | null> {
    const prisma = await this.tx.supplier.findUnique({
      where: { id },
      include: this.getInclude()
    });
    return prisma ? SupplierMapper.toAggregate(prisma as SupplierPrismaModel) : null;
  }

  async findByCode(code: string): Promise<Supplier | null> {
    const prisma = await this.tx.supplier.findFirst({
      where: { code, ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma ? SupplierMapper.toAggregate(prisma as SupplierPrismaModel) : null;
  }

  async findAll(opts?: { limit?: number; offset?: number }): Promise<Supplier[]> {
    const prisma = await this.tx.supplier.findMany({
      where: { ...this.softDeleteFilter },
      include: this.getInclude(),
      take: opts?.limit ?? 20,
      skip: opts?.offset ?? 0,
      orderBy: { name: "asc" }
    });
    return prisma.map((s) => SupplierMapper.toAggregate(s as SupplierPrismaModel));
  }

  async save(supplier: Supplier): Promise<Supplier> {
    const existing = await this.tx.supplier.findUnique({
      where: { id: supplier.id },
      select: { id: true, version: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      const created = await this.tx.supplier.create({
        data: SupplierMapper.toPrismaInput(supplier),
        include: this.getInclude()
      });
      this.collectEvents(supplier);
      return SupplierMapper.toAggregate(created as SupplierPrismaModel);
    }

    const updated = await this.tx.supplier.updateMany({
      where: this.getOptimisticLockFilter(supplier.id, supplier.version),
      data: SupplierMapper.toPrismaUpdateInput(supplier)
    });
    if (updated.count === 0) throw new OptimisticLockError(supplier.id, supplier.version);

    const result = await this.tx.supplier.findUnique({
      where: { id: supplier.id },
      include: this.getInclude()
    });
    this.collectEvents(supplier);
    return SupplierMapper.toAggregate(result as SupplierPrismaModel);
  }

  async delete(id: SupplierId): Promise<void> {
    const result = await this.tx.supplier.updateMany({
      where: { id, ...this.softDeleteFilter },
      data: { deletedAt: new Date() }
    });
    if (result.count === 0) throw new NotFoundError("Supplier", id);
  }

  async restore(id: SupplierId): Promise<void> {
    await this.tx.supplier.updateMany({
      where: { id },
      data: { deletedAt: null }
    });
  }
}
