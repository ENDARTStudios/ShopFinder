/**
 * @workspace/database/repositories/payment-repository
 */

import type { PaymentRepository as IPaymentRepository } from "@workspace/domain/repositories";
import type { Payment } from "@workspace/domain/payment";
import type { PaymentId } from "@workspace/domain/shared";
import type { TransactionClient } from "../types";
import type { EventCollector } from "../unit-of-work/event-collector";
import { BaseRepository, NotFoundError, OptimisticLockError } from "../base/base-repository";
import { PaymentMapper, type PaymentPrismaModel } from "../mappers/payment-mapper";

export class PrismaPaymentRepository extends BaseRepository<Payment> implements IPaymentRepository {
  constructor(tx: TransactionClient, collector: EventCollector) {
    super({ tx, collector });
  }

  protected getModelName(): string {
    return "Payment";
  }

  protected getInclude() {
    return {
      transactions: { orderBy: { createdAt: "desc" as const } },
      refunds: { orderBy: { createdAt: "desc" as const } }
    };
  }

  async findById(id: PaymentId): Promise<Payment | null> {
    const prisma = await this.tx.payment.findFirst({
      where: { id, ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma ? PaymentMapper.toAggregate(prisma as PaymentPrismaModel) : null;
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const prisma = await this.tx.payment.findFirst({
      where: { orderId, ...this.softDeleteFilter },
      include: this.getInclude()
    });
    return prisma ? PaymentMapper.toAggregate(prisma as PaymentPrismaModel) : null;
  }

  async save(payment: Payment): Promise<Payment> {
    const existing = await this.tx.payment.findUnique({
      where: { id: payment.id },
      select: { id: true, version: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      const created = await this.tx.payment.create({
        data: PaymentMapper.toPrismaInput(payment),
        include: this.getInclude()
      });
      this.collectEvents(payment);
      return PaymentMapper.toAggregate(created as PaymentPrismaModel);
    }

    const updated = await this.tx.payment.updateMany({
      where: this.getOptimisticLockFilter(payment.id, payment.version),
      data: PaymentMapper.toPrismaUpdateInput(payment)
    });
    if (updated.count === 0) throw new OptimisticLockError(payment.id, payment.version);

    const result = await this.tx.payment.findUnique({
      where: { id: payment.id },
      include: this.getInclude()
    });
    this.collectEvents(payment);
    return PaymentMapper.toAggregate(result as PaymentPrismaModel);
  }

  async delete(id: PaymentId): Promise<void> {
    const result = await this.tx.payment.updateMany({
      where: { id, ...this.softDeleteFilter },
      data: { deletedAt: new Date() }
    });
    if (result.count === 0) throw new NotFoundError("Payment", id);
  }
}
