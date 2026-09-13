/**
 * @workspace/database/repositories/user-repository
 *
 * Per Epic 1.1.1 feedback #2: eliminate ctx.tx.user.create() from handlers.
 * User is identity infrastructure, not a domain aggregate, but still gets
 * a repository so handlers never touch Prisma directly.
 */

import type { UserRepository, UserRecord } from "@workspace/domain/repositories";
import type { UserId } from "@workspace/domain/shared";
import type { TransactionClient } from "../types";
import type { EventCollector } from "../unit-of-work/event-collector";
import { BaseEntityRepository, NotFoundError } from "../base/base-repository";

interface UserPrismaModel {
  id: string;
  email: string;
  passwordHash: string;
  roles: string;
  storeId: string | null;
  supplierId: string | null;
  status: string;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  customer?: { id: string } | null;
}

export class PrismaUserRepository
  extends BaseEntityRepository<UserRecord>
  implements UserRepository
{
  constructor(tx: TransactionClient, collector: EventCollector) {
    super({ tx, collector });
  }

  protected getModelName(): string {
    return "User";
  }

  private toRecord(prisma: UserPrismaModel): UserRecord {
    let roles: string[] = ["customer"];
    try {
      roles = JSON.parse(prisma.roles);
    } catch {
      roles = ["customer"];
    }
    return {
      id: prisma.id as UserId,
      email: prisma.email,
      passwordHash: prisma.passwordHash,
      roles,
      storeId: prisma.storeId ?? undefined,
      customerId: prisma.customer?.id,
      supplierId: prisma.supplierId ?? undefined,
      status: prisma.status,
      emailVerifiedAt: prisma.emailVerifiedAt ?? undefined,
      lastLoginAt: prisma.lastLoginAt ?? undefined,
      version: prisma.version,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt
    };
  }

  async findById(id: UserId): Promise<UserRecord | null> {
    const user = await this.tx.user.findFirst({
      where: { id, deletedAt: null },
      include: { customer: { select: { id: true } } }
    });
    return user ? this.toRecord(user as UserPrismaModel) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.tx.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: { customer: { select: { id: true } } }
    });
    return user ? this.toRecord(user as UserPrismaModel) : null;
  }

  async save(user: UserRecord): Promise<UserRecord> {
    const existing = await this.tx.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { id: true, version: true, deletedAt: true }
    });

    if (!existing || existing.deletedAt) {
      const created = await this.tx.user.create({
        data: {
          id: user.id,
          email: user.email.toLowerCase(),
          passwordHash: user.passwordHash,
          roles: JSON.stringify(user.roles),
          storeId: user.storeId ?? null,
          supplierId: user.supplierId ?? null,
          status: user.status,
          emailVerifiedAt: user.emailVerifiedAt,
          version: 1
        },
        include: { customer: { select: { id: true } } }
      });

      // Link Customer to User via Customer.userId (FK is on Customer side)
      if (user.customerId) {
        await this.tx.customer.update({
          where: { id: user.customerId },
          data: { userId: created.id }
        });
      }

      return this.toRecord({ ...created, customer: { id: user.customerId! } } as UserPrismaModel);
    }

    const updated = await this.tx.user.updateMany({
      where: this.getOptimisticLockFilter(existing.id, user.version),
      data: {
        passwordHash: user.passwordHash,
        roles: JSON.stringify(user.roles),
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        version: { increment: 1 }
      }
    });

    if (updated.count === 0) {
      throw new Error(`Optimistic lock failed for User: ${user.id}`);
    }

    const result = await this.tx.user.findUnique({
      where: { id: existing.id },
      include: { customer: { select: { id: true } } }
    });
    return this.toRecord(result as UserPrismaModel);
  }

  async delete(id: UserId): Promise<void> {
    const result = await this.tx.user.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), status: "deleted" }
    });
    if (result.count === 0) throw new NotFoundError("User", id);
  }
}
