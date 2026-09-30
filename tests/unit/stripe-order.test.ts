import { describe, expect, test } from "bun:test";
import type Stripe from "stripe";
import { buildOrderItemsFromSession } from "../../src/lib/stripe-order";

function li(over: Record<string, unknown> = {}): Stripe.LineItem {
  return {
    id: "li_1",
    object: "item",
    amount_subtotal: 1000,
    amount_total: 1000,
    currency: "usd",
    description: "Produto X",
    price: { id: "price_1", object: "price", currency: "usd", unit_amount: 500 },
    quantity: 2,
    ...over
  } as unknown as Stripe.LineItem;
}

function apiList(items: Stripe.LineItem[]) {
  return { object: "list", data: items, has_more: false, total_count: items.length };
}

describe("buildOrderItemsFromSession (J-004)", () => {
  test("usa os valores cobrados pela sessão, não do catálogo", () => {
    const items = buildOrderItemsFromSession(
      apiList([li()]),
      [{ sku: "SKU-1", qty: 2 }],
      new Map()
    );
    expect(items.length).toBe(1);
    expect(items[0].unitPriceMinorUnits).toBe(500n);
    expect(items[0].quantity).toBe(2);
    expect(items[0].lineTotalMinorUnits).toBe(1000n);
    expect(items[0].unitPriceCurrencyCode).toBe("USD");
    expect(items[0].title).toBe("Produto X");
  });

  test("liga productId quando o sku existe no catálogo", () => {
    const map = new Map([["SKU-1", "prod_abc"]]);
    const items = buildOrderItemsFromSession(apiList([li()]), [{ sku: "SKU-1", qty: 2 }], map);
    expect(items[0].productId).toBe("prod_abc");
  });

  test("produto ausente do catálogo ⇒ productId null, item preservado (não skip)", () => {
    const items = buildOrderItemsFromSession(
      apiList([li()]),
      [{ sku: "SUMIU", qty: 2 }],
      new Map()
    );
    expect(items[0].productId).toBeNull();
    expect(items[0].sku).toBe("SUMIU");
    expect(items[0].lineTotalMinorUnits).toBe(1000n);
  });

  test("divergência metadata × line_items lança (fail loudly → 500 → retry Stripe)", () => {
    expect(() =>
      buildOrderItemsFromSession(
        apiList([li()]),
        [
          { sku: "A", qty: 1 },
          { sku: "B", qty: 1 }
        ],
        new Map()
      )
    ).toThrow(/Divergência/);
  });

  test("sessão sem line_items lança", () => {
    expect(() => buildOrderItemsFromSession({ data: [] }, [], new Map())).toThrow(/sem line_items/);
  });

  test("fallback de preço por amount_subtotal/qty quando unit_amount ausente", () => {
    const noUnit = li({
      price: { id: "price_1", object: "price", currency: "usd", unit_amount: null }
    });
    const items = buildOrderItemsFromSession(
      apiList([noUnit]),
      [{ sku: "SKU-1", qty: 2 }],
      new Map()
    );
    expect(items[0].unitPriceMinorUnits).toBe(500n);
  });

  test("moeda ausente lança", () => {
    const noCur = li({
      currency: null,
      price: { id: "p", object: "price", currency: null, unit_amount: 500 }
    });
    expect(() =>
      buildOrderItemsFromSession(apiList([noCur]), [{ sku: "SKU-1", qty: 2 }], new Map())
    ).toThrow(/Moeda ausente/);
  });
});
