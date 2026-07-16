/**
 * @workspace/database/queries/supplier-query-service
 */
import type { SupplierQueryService } from "@workspace/domain/queries";
import type { SupplierId, ProductId } from "@workspace/domain/shared";
import type { SupplierDTO } from "@workspace/contracts/dto";
import type { TransactionClient } from "../types";
import { withMetrics } from "../metrics";

export class PrismaSupplierQueryService implements SupplierQueryService {
  constructor(private readonly prisma: TransactionClient) {}

  async list(): Promise<SupplierDTO[]> {
    return withMetrics("SupplierQueryService", "list", async () => {
      const suppliers = await this.prisma.supplier.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          defaultCurrency: true,
          shipsFromCountry: true,
          integrations: { select: { status: true, lastSyncAt: true }, take: 1 }
        },
        orderBy: { name: "asc" }
      });
      return suppliers.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        status: s.status,
        defaultCurrency: s.defaultCurrency,
        shipsFromCountry: s.shipsFromCountry,
        integration: {
          status: s.integrations[0]?.status ?? "disconnected",
          lastSyncAt: s.integrations[0]?.lastSyncAt?.toISOString()
        }
      }));
    });
  }

  async detail(id: SupplierId): Promise<SupplierDTO | null> {
    return withMetrics("SupplierQueryService", "detail", async () => {
      const s = await this.prisma.supplier.findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          defaultCurrency: true,
          shipsFromCountry: true,
          integrations: { select: { status: true, lastSyncAt: true }, take: 1 }
        }
      });
      if (!s) return null;
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        status: s.status,
        defaultCurrency: s.defaultCurrency,
        shipsFromCountry: s.shipsFromCountry,
        integration: {
          status: s.integrations[0]?.status ?? "disconnected",
          lastSyncAt: s.integrations[0]?.lastSyncAt?.toISOString()
        }
      };
    });
  }

  async forProduct(productId: ProductId): Promise<SupplierDTO[]> {
    return withMetrics("SupplierQueryService", "forProduct", async () => {
      const offers = await this.prisma.productOffer.findMany({
        where: { productId, isActive: true, deletedAt: null, supplier: { deletedAt: null } },
        select: {
          supplier: {
            select: {
              id: true,
              code: true,
              name: true,
              status: true,
              defaultCurrency: true,
              shipsFromCountry: true,
              integrations: { select: { status: true, lastSyncAt: true }, take: 1 }
            }
          }
        },
        distinct: ["supplierId"]
      });
      return offers.map((o) => ({
        id: o.supplier.id,
        code: o.supplier.code,
        name: o.supplier.name,
        status: o.supplier.status,
        defaultCurrency: o.supplier.defaultCurrency,
        shipsFromCountry: o.supplier.shipsFromCountry,
        integration: {
          status: o.supplier.integrations[0]?.status ?? "disconnected",
          lastSyncAt: o.supplier.integrations[0]?.lastSyncAt?.toISOString()
        }
      }));
    });
  }
}
