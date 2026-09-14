/**
 * @workspace/database/repositories/customer-repository
 */

import type { CustomerRepository as ICustomerRepository } from "@workspace/domain/repositories";
import type { Customer } from "@workspace/domain/customer";
import type { CustomerId } from "@workspace/domain/shared";
import type { TransactionClient } from "../types";
import type { EventCollector } from "../unit-of-work/event-collector";
import { BaseRepository, NotFoundError, OptimisticLockError } from "../base/base-repository";
import { CustomerMapper, type CustomerPrismaModel } from "../mappers/customer-mapper";

export class PrismaCustomerRepository
  extends BaseRepository<Customer>
  implements ICustomerRepository
{
  constructor(tx: TransactionClient, collector: EventCollector) {
    super({ tx, collector });
  }

  protected getModelName(): string {
    return "Customer";
  }

  protected getInclude() {
    return { addresses: true };
  }

  async findById(id: CustomerId): Promise<Customer | null> {
    const prisma = await this.tx.customer.findFirst({
      where: { id, ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma ? CustomerMapper.toAggregate(prisma as CustomerPrismaModel) : null;
  }

  async findByIdIncludingDeleted(id: CustomerId): Promise<Customer | null> {
    const prisma = await this.tx.customer.findUnique({
      where: { id },
      include: this.getInclude()
    });
    return prisma ? CustomerMapper.toAggregate(prisma as CustomerPrismaModel) : null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const prisma = await this.tx.customer.findFirst({
      where: { email, ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma ? CustomerMapper.toAggregate(prisma as CustomerPrismaModel) : null;
  }

  async save(customer: Customer): Promise<Customer> {
    const existing = await this.tx.customer.findUnique({
      where: { id: customer.id },
      select: { id: true, version: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      const created = await this.tx.customer.create({
        data: CustomerMapper.toPrismaInput(customer),
        include: this.getInclude()
      });
      this.collectEvents(customer);
      return CustomerMapper.toAggregate(created as CustomerPrismaModel);
    }

    const updated = await this.tx.customer.updateMany({
      where: this.getOptimisticLockFilter(customer.id, customer.version),
      data: CustomerMapper.toPrismaUpdateInput(customer)
    });
    if (updated.count === 0) throw new OptimisticLockError(customer.id, customer.version);

    const result = await this.tx.customer.findUnique({
      where: { id: customer.id },
      include: this.getInclude()
    });
    this.collectEvents(customer);
    return CustomerMapper.toAggregate(result as CustomerPrismaModel);
  }

  async delete(id: CustomerId): Promise<void> {
    const result = await this.tx.customer.updateMany({
      where: { id, ...this.softDeleteFilter },
      data: { deletedAt: new Date() }
    });
    if (result.count === 0) throw new NotFoundError("Customer", id);
  }

  async restore(id: CustomerId): Promise<void> {
    await this.tx.customer.updateMany({
      where: { id },
      data: { deletedAt: null }
    });
  }
}
