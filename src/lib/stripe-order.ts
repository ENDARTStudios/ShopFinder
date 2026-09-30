import type Stripe from "stripe";

/**
 * Fonte da verdade do pedido = Checkout Session Stripe (J-004, auditoria 30/09).
 * Os OrderItems são reconstruídos dos line_items efetivamente cobrados,
 * nunca dos preços atuais do catálogo.
 */

export interface SessionItemMeta {
  sku: string;
  qty: number;
}

export interface OrderItemDraft {
  productId: string | null;
  sku: string;
  title: string;
  quantity: number;
  unitPriceMinorUnits: bigint;
  unitPriceCurrencyCode: string;
  lineTotalMinorUnits: bigint;
}

/**
 * Monta os drafts de OrderItem a partir da sessão expandida
 * (`stripe.checkout.sessions.retrieve(id, { expand: ["line_items"] })`).
 *
 * - `itemsMeta` (metadata `items` gravado no checkout) fornece o sku de cada
 *   line_item, pela ordem em que foram criados no checkout-session.
 * - `skuToProductId` liga o item ao catálogo; produto ausente/removido ⇒
 *   `productId: null` (coluna nullable) — o pedido registra o pago de todo modo.
 *
 * Lança quando a sessão não tem itens, quando a contagem diverge do metadata
 * ou quando um line_item não tem preço/moeda — o chamador responde 500 e o
 * Stripe retenta (J-005).
 */
export function buildOrderItemsFromSession(
  lineItems: Pick<Stripe.ApiList<Stripe.LineItem>, "data"> | null | undefined,
  itemsMeta: SessionItemMeta[],
  skuToProductId: ReadonlyMap<string, string>
): OrderItemDraft[] {
  const data = lineItems?.data ?? [];
  if (data.length === 0) {
    throw new Error("Sessão paga sem line_items");
  }
  if (itemsMeta.length !== data.length) {
    throw new Error(
      `Divergência entre metadata e line_items (${itemsMeta.length} × ${data.length})`
    );
  }
  return data.map((li, i) => {
    const meta = itemsMeta[i];
    const qty = Math.max(1, Math.trunc(li.quantity ?? meta.qty));
    const rawUnit = li.price?.unit_amount ?? (qty > 0 ? (li.amount_subtotal ?? 0) / qty : 0);
    const unit = Math.trunc(rawUnit ?? 0);
    if (!Number.isFinite(unit) || unit < 0) {
      throw new Error(`Preço inválido na sessão (sku=${meta.sku})`);
    }
    const currency = (li.currency ?? "").toUpperCase();
    if (!currency) {
      throw new Error(`Moeda ausente na sessão (sku=${meta.sku})`);
    }
    const totalRaw = li.amount_subtotal ?? unit * qty;
    const total = Math.trunc(totalRaw ?? 0);
    return {
      productId: skuToProductId.get(meta.sku) ?? null,
      sku: meta.sku,
      title: (li.description ?? meta.sku).slice(0, 200),
      quantity: qty,
      unitPriceMinorUnits: BigInt(unit),
      unitPriceCurrencyCode: currency,
      lineTotalMinorUnits: BigInt(total)
    };
  });
}
