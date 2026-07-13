/**
 * @workspace/database/mappers/customer-mapper
 */

import type { Customer } from "@workspace/domain/customer";
import { asCustomerId, asCustomerAddressId } from "@workspace/domain/shared";
import type { Prisma } from "@prisma/client";

export interface CustomerPrismaModel {
  id: string;
  storeId: string;
  userId: string | null;
  email: string;
  name: string;
  locale: string;
  status: string;
  lastLoginAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  addresses?: Array<{
    id: string;
    customerId: string;
    label: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export const CustomerMapper = {
  toAggregate(prisma: CustomerPrismaModel): Customer {
    return {
      id: asCustomerId(prisma.id),
      email: { value: prisma.email },
      name: prisma.name,
      locale: prisma.locale,
      status: prisma.status as Customer["status"],
      addresses: (prisma.addresses ?? []).map((a) => ({
        id: asCustomerAddressId(a.id),
        label: a.label,
        address: {
          line1: a.line1,
          line2: a.line2 ?? undefined,
          city: a.city,
          state: a.state ?? undefined,
          postalCode: a.postalCode,
          country: a.country
        },
        isDefault: a.isDefault,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt
      })),
      wishlist: {
        id: `wish_${prisma.id}`,
        customerId: asCustomerId(prisma.id),
        items: [],
        createdAt: prisma.createdAt,
        updatedAt: prisma.updatedAt
      },
      lastLoginAt: prisma.lastLoginAt ?? undefined,
      version: prisma.version,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
      domainEvents: [],
      markEventsAsCommitted() {}
    };
  },

  toPrismaInput(aggregate: Customer): Prisma.CustomerCreateInput {
    return {
      id: aggregate.id,
      store: { connect: { id: "" } },
      email: aggregate.email.value,
      name: aggregate.name,
      locale: aggregate.locale,
      status: aggregate.status,
      version: 1
    };
  },

  toPrismaUpdateInput(aggregate: Customer): Prisma.CustomerUpdateInput {
    return {
      name: aggregate.name,
      locale: aggregate.locale,
      status: aggregate.status,
      version: { increment: 1 }
    };
  }
};
