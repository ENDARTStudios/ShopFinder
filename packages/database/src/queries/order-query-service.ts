/**
 * @workspace/database/queries/order-query-service
 */
import type { OrderQueryService } from "@workspace/domain/queries";
import type { CustomerId, OrderId } from "@workspace/domain/shared";
import type { OrderListItemDTO, OrderDetailDTO, PaginationDTO } from "@workspace/contracts/dto";
import type { TransactionClient } from "../types";
import { withMetrics } from "../metrics";

export class PrismaOrderQueryService implements OrderQueryService {
  constructor(private readonly prisma: TransactionClient) {}

  async detail(id: OrderId): Promise<OrderDetailDTO | null> {
    return withMetrics("OrderQueryService", "detail", async () => {
      const o = await this.prisma.order.findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true,
          number: true,
          status: true,
          customerId: true,
          currency: true,
          subtotalMinorUnits: true,
          shippingTotalMinorUnits: true,
          taxTotalMinorUnits: true,
          discountTotalMinorUnits: true,
          grandTotalMinorUnits: true,
          shippingAddress: true,
          billingAddress: true,
          placedAt: true,
          items: {
            select: {
              id: true,
              productId: true,
              variantId: true,
              sku: true,
              title: true,
              quantity: true,
              unitPriceMinorUnits: true,
              unitPriceCurrencyCode: true,
              lineTotalMinorUnits: true
            }
          },
          fulfillments: {
            select: {
              id: true,
              supplierId: true,
              status: true,
              trackingNumber: true,
              trackingUrl: true,
              shippedAt: true,
              deliveredAt: true
            }
          },
          _count: { select: { items: true } }
        }
      });
      if (!o) return null;
      return {
        id: o.id,
        number: o.number,
        status: o.status,
        customerId: o.customerId,
        grandTotal: { amount: Number(o.grandTotalMinorUnits), currency: o.currency },
        itemCount: o._count.items,
        placedAt: o.placedAt.toISOString(),
        items: o.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          variantId: i.variantId ?? undefined,
          sku: i.sku,
          title: i.title,
          quantity: i.quantity,
          unitPrice: { amount: Number(i.unitPriceMinorUnits), currency: i.unitPriceCurrencyCode },
          lineTotal: { amount: Number(i.lineTotalMinorUnits), currency: o.currency }
        })),
        subtotal: { amount: Number(o.subtotalMinorUnits), currency: o.currency },
        shippingTotal: { amount: Number(o.shippingTotalMinorUnits), currency: o.currency },
        taxTotal: { amount: Number(o.taxTotalMinorUnits), currency: o.currency },
        discountTotal: { amount: Number(o.discountTotalMinorUnits), currency: o.currency },
        shippingAddress: o.shippingAddress as never,
        billingAddress: o.billingAddress as never,
        fulfillments: o.fulfillments.map((f) => ({
          id: f.id,
          supplierId: f.supplierId,
          status: f.status,
          trackingNumber: f.trackingNumber ?? undefined,
          trackingUrl: f.trackingUrl ?? undefined,
          shippedAt: f.shippedAt?.toISOString(),
          deliveredAt: f.deliveredAt?.toISOString()
        }))
      };
    });
  }

  async detailByNumber(number: string): Promise<OrderDetailDTO | null> {
    return withMetrics("OrderQueryService", "detailByNumber", async () => {
      const o = await this.prisma.order.findFirst({
        where: { number, deletedAt: null },
        select: { id: true }
      });
      return o ? this.detail(o.id as OrderId) : null;
    });
  }

  async list(params: {
    customerId?: CustomerId;
    status?: string;
    page?: number;
    pageSize?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ items: OrderListItemDTO[]; pagination: PaginationDTO }> {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    return withMetrics("OrderQueryService", "list", async () => {
      const where = {
        deletedAt: null,
        ...(params.customerId ? { customerId: params.customerId } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.dateFrom || params.dateTo
          ? {
              placedAt: {
                ...(params.dateFrom ? { gte: params.dateFrom } : {}),
                ...(params.dateTo ? { lte: params.dateTo } : {})
              }
            }
          : {})
      };
      const [items, total] = await Promise.all([
        this.prisma.order.findMany({
          where,
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
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        this.prisma.order.count({ where })
      ]);
      return {
        items: items.map((o) => ({
          id: o.id,
          number: o.number,
          status: o.status,
          grandTotal: { amount: Number(o.grandTotalMinorUnits), currency: o.currency },
          itemCount: o._count.items,
          placedAt: o.placedAt.toISOString()
        })),
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
      };
    });
  }

  async countByStatus(): Promise<Record<string, number>> {
    return withMetrics("OrderQueryService", "countByStatus", async () => {
      const result = await this.prisma.order.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _count: { status: true }
      });
      return Object.fromEntries(result.map((r) => [r.status, r._count.status]));
    });
  }

  async revenueSummary(params: {
    dateFrom: Date;
    dateTo: Date;
  }): Promise<{ total: number; count: number; averageOrderValue: number }> {
    return withMetrics("OrderQueryService", "revenueSummary", async () => {
      const result = await this.prisma.order.aggregate({
        where: {
          deletedAt: null,
          status: { not: "cancelled" },
          placedAt: { gte: params.dateFrom, lte: params.dateTo }
        },
        _sum: { grandTotalMinorUnits: true },
        _count: { id: true },
        _avg: { grandTotalMinorUnits: true }
      });
      return {
        total: Number(result._sum.grandTotalMinorUnits ?? 0),
        count: result._count.id,
        averageOrderValue: Number(result._avg.grandTotalMinorUnits ?? 0)
      };
    });
  }
}
