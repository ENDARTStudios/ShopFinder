/**
 * @workspace/database/queries/cart-query-service
 */
import type { CartQueryService } from "@workspace/domain/queries";
import type { CustomerId } from "@workspace/domain/shared";
import type { CartDTO } from "@workspace/contracts/dto";
import type { TransactionClient } from "../types";
import { withMetrics } from "../metrics";

export class PrismaCartQueryService implements CartQueryService {
  constructor(private readonly prisma: TransactionClient) {}

  async active(customerId?: CustomerId, sessionId?: string): Promise<CartDTO | null> {
    return withMetrics("CartQueryService", "active", async () => {
      const where = {
        status: "active",
        deletedAt: null,
        ...(customerId ? { customerId } : {}),
        ...(sessionId ? { sessionId } : {})
      };
      const cart = await this.prisma.cart.findFirst({
        where,
        select: {
          id: true,
          currency: true,
          items: {
            select: {
              id: true,
              productId: true,
              variantId: true,
              quantity: true,
              unitPriceMinorUnits: true,
              unitPriceCurrencyCode: true
            }
          }
        }
      });
      if (!cart) return null;
      const subtotal = cart.items.reduce(
        (sum, i) => sum + Number(i.unitPriceMinorUnits) * i.quantity,
        0
      );
      return {
        id: cart.id,
        currency: cart.currency,
        items: cart.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          variantId: i.variantId ?? undefined,
          sku: "",
          title: "",
          quantity: i.quantity,
          unitPrice: { amount: Number(i.unitPriceMinorUnits), currency: i.unitPriceCurrencyCode },
          lineTotal: {
            amount: Number(i.unitPriceMinorUnits) * i.quantity,
            currency: i.unitPriceCurrencyCode
          }
        })),
        subtotal: { amount: subtotal, currency: cart.currency },
        itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0)
      };
    });
  }

  async itemCount(customerId?: CustomerId, sessionId?: string): Promise<number> {
    return withMetrics("CartQueryService", "itemCount", async () => {
      const cart = await this.active(customerId, sessionId);
      return cart?.itemCount ?? 0;
    });
  }
}
