/**
 * @workspace/database/repositories/checkout-session-repository
 */

import type { CheckoutSessionRepository as ICheckoutSessionRepository } from "@workspace/domain/repositories";
import type { CheckoutSession } from "@workspace/domain/checkout";
import type { CheckoutSessionId } from "@workspace/domain/shared";
import type { TransactionClient } from "../types";
import type { EventCollector } from "../unit-of-work/event-collector";
import { BaseRepository, NotFoundError, OptimisticLockError } from "../base/base-repository";
import { asCheckoutSessionId, asCartId } from "@workspace/domain/shared";

interface CheckoutSessionPrismaModel {
  id: string;
  storeId: string;
  cartId: string;
  customerId: string | null;
  currency: string;
  shippingAddress: unknown;
  billingAddress: unknown;
  shippingMethod: unknown;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const toAggregate = (p: CheckoutSessionPrismaModel): CheckoutSession => ({
  id: asCheckoutSessionId(p.id),
  cartId: asCartId(p.cartId),
  customerId: p.customerId ? (p.customerId as never) : undefined,
  currency: p.currency,
  shippingAddress: (p.shippingAddress as never) ?? undefined,
  billingAddress: (p.billingAddress as never) ?? undefined,
  shippingMethod: (p.shippingMethod as never) ?? undefined,
  status: p.status as CheckoutSession["status"],
  version: p.version,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  domainEvents: [],
  markEventsAsCommitted() {}
});

export class PrismaCheckoutSessionRepository
  extends BaseRepository<CheckoutSession>
  implements ICheckoutSessionRepository
{
  constructor(tx: TransactionClient, collector: EventCollector) {
    super({ tx, collector });
  }

  protected getModelName(): string {
    return "CheckoutSession";
  }

  protected getInclude() {
    return {};
  }

  async findById(id: CheckoutSessionId): Promise<CheckoutSession | null> {
    const prisma = await this.tx.checkoutSession.findFirst({
      where: { id, ...this.softDeleteFilter }
    });
    return prisma ? toAggregate(prisma as CheckoutSessionPrismaModel) : null;
  }

  async findByCartId(cartId: string): Promise<CheckoutSession | null> {
    const prisma = await this.tx.checkoutSession.findFirst({
      where: { cartId, ...this.softDeleteFilter }
    });
    return prisma ? toAggregate(prisma as CheckoutSessionPrismaModel) : null;
  }

  async save(session: CheckoutSession): Promise<CheckoutSession> {
    const existing = await this.tx.checkoutSession.findUnique({
      where: { id: session.id },
      select: { id: true, version: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      const created = await this.tx.checkoutSession.create({
        data: {
          id: session.id,
          store: { connect: { id: "" } },
          cart: { connect: { id: session.cartId } },
          customerId: session.customerId ?? undefined,
          currency: session.currency,
          shippingAddress: session.shippingAddress as never,
          billingAddress: session.billingAddress as never,
          shippingMethod: session.shippingMethod as never,
          status: session.status,
          version: 1
        }
      });
      this.collectEvents(session);
      return toAggregate(created as CheckoutSessionPrismaModel);
    }

    const updated = await this.tx.checkoutSession.updateMany({
      where: this.getOptimisticLockFilter(session.id, session.version),
      data: {
        shippingAddress: session.shippingAddress as never,
        billingAddress: session.billingAddress as never,
        shippingMethod: session.shippingMethod as never,
        status: session.status,
        version: { increment: 1 }
      }
    });
    if (updated.count === 0) throw new OptimisticLockError(session.id, session.version);

    const result = await this.tx.checkoutSession.findUnique({ where: { id: session.id } });
    this.collectEvents(session);
    return toAggregate(result as CheckoutSessionPrismaModel);
  }

  async delete(id: CheckoutSessionId): Promise<void> {
    const result = await this.tx.checkoutSession.updateMany({
      where: { id, ...this.softDeleteFilter },
      data: { deletedAt: new Date() }
    });
    if (result.count === 0) throw new NotFoundError("CheckoutSession", id);
  }
}
