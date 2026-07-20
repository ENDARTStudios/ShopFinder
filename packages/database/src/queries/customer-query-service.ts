/**
 * @workspace/database/queries/customer-query-service
 */
import type { CustomerQueryService } from "@workspace/domain/queries";
import type { CustomerId } from "@workspace/domain/shared";
import type { CustomerDTO, OrderListItemDTO, PaginationDTO } from "@workspace/contracts/dto";
import type { TransactionClient } from "../types";
import { withMetrics } from "../metrics";

export class PrismaCustomerQueryService implements CustomerQueryService {
  constructor(private readonly prisma: TransactionClient) {}

  async profile(id: CustomerId): Promise<CustomerDTO | null> {
    return withMetrics("CustomerQueryService", "profile", async () => {
      const c = await this.prisma.customer.findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true,
          email: true,
          name: true,
          locale: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          addresses: {
            select: {
              id: true,
              label: true,
              line1: true,
              line2: true,
              city: true,
              state: true,
              postalCode: true,
              country: true,
              isDefault: true
            }
          }
        }
      });
      if (!c) return null;
      return {
        id: c.id,
        email: c.email,
        name: c.name,
        locale: c.locale,
        status: c.status as CustomerDTO["status"],
        createdAt: c.createdAt.toISOString(),
        lastLoginAt: c.lastLoginAt?.toISOString(),
        addresses: c.addresses.map((a) => ({
          id: a.id,
          label: a.label,
          line1: a.line1,
          line2: a.line2 ?? undefined,
          city: a.city,
          state: a.state ?? undefined,
          postalCode: a.postalCode,
          country: a.country,
          isDefault: a.isDefault
        }))
      };
    });
  }

  async list(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<{ items: CustomerDTO[]; pagination: PaginationDTO }> {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    return withMetrics("CustomerQueryService", "list", async () => {
      const where = {
        deletedAt: null,
        ...(params.search ? { name: { contains: params.search } } : {})
      };
      const [items, total] = await Promise.all([
        this.prisma.customer.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            locale: true,
            status: true,
            createdAt: true,
            lastLoginAt: true,
            addresses: true
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" }
        }),
        this.prisma.customer.count({ where })
      ]);
      return {
        items: items.map((c) => ({
          id: c.id,
          email: c.email,
          name: c.name,
          locale: c.locale,
          status: c.status as CustomerDTO["status"],
          createdAt: c.createdAt.toISOString(),
          lastLoginAt: c.lastLoginAt?.toISOString(),
          addresses: []
        })),
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
      };
    });
  }

  async orderHistory(customerId: CustomerId, limit: number = 10): Promise<OrderListItemDTO[]> {
    return withMetrics("CustomerQueryService", "orderHistory", async () => {
      const orders = await this.prisma.order.findMany({
        where: { customerId, deletedAt: null },
        select: {
          id: true,
          number: true,
          status: true,
          grandTotalMinorUnits: true,
          currency: true,
          placedAt: true,
          _count: { select: { items: true } }
        },
        orderBy: { placedAt: "desc" },
        take: limit
      });
      return orders.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        grandTotal: { amount: Number(o.grandTotalMinorUnits), currency: o.currency },
        itemCount: o._count.items,
        placedAt: o.placedAt.toISOString()
      }));
    });
  }
}
