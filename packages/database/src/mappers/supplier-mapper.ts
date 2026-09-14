/**
 * @workspace/database/mappers/supplier-mapper
 */

import type { Supplier } from "@workspace/domain/supplier";
import { asSupplierId, asSupplierIntegrationId } from "@workspace/domain/shared";
import type { Prisma } from "@prisma/client";

export interface SupplierPrismaModel {
  id: string;
  code: string;
  name: string;
  defaultCurrency: string;
  shipsFromCountry: string;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  integrations?: Array<{
    id: string;
    type: string;
    name: string;
    supplierId: string | null;
    providerCode: string;
    status: string;
    config: unknown;
    lastSyncAt: Date | null;
    lastError: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export const SupplierMapper = {
  toAggregate(prisma: SupplierPrismaModel): Supplier {
    const integration = prisma.integrations?.[0];
    return {
      id: asSupplierId(prisma.id),
      code: prisma.code as Supplier["code"],
      name: prisma.name,
      defaultCurrency: prisma.defaultCurrency,
      shipsFromCountry: prisma.shipsFromCountry,
      status: prisma.status as "active" | "inactive",
      version: prisma.version,
      integration: integration
        ? {
            id: asSupplierIntegrationId(integration.id),
            supplierId: asSupplierId(integration.supplierId ?? prisma.id),
            code: integration.providerCode as Supplier["code"],
            status: integration.status as "connected" | "disconnected" | "error",
            lastSyncAt: integration.lastSyncAt ?? undefined,
            syncError: integration.lastError ?? undefined,
            createdAt: integration.createdAt,
            updatedAt: integration.updatedAt
          }
        : {
            id: asSupplierIntegrationId(`int_${prisma.id}`),
            supplierId: asSupplierId(prisma.id),
            code: prisma.code as Supplier["code"],
            status: "disconnected",
            createdAt: prisma.createdAt,
            updatedAt: prisma.updatedAt
          },
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
      domainEvents: [],
      markEventsAsCommitted() {}
    };
  },

  toPrismaInput(aggregate: Supplier): Prisma.SupplierCreateInput {
    return {
      id: aggregate.id,
      code: aggregate.code,
      name: aggregate.name,
      defaultCurrency: aggregate.defaultCurrency,
      shipsFromCountry: aggregate.shipsFromCountry,
      status: aggregate.status,
      version: 1
    };
  },

  toPrismaUpdateInput(aggregate: Supplier): Prisma.SupplierUpdateInput {
    return {
      name: aggregate.name,
      defaultCurrency: aggregate.defaultCurrency,
      shipsFromCountry: aggregate.shipsFromCountry,
      status: aggregate.status,
      version: { increment: 1 }
    };
  }
};
