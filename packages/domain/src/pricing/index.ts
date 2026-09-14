/** @workspace/domain/pricing — Pricing Engine */
import type { Money } from "../shared";
export interface Price {
  readonly amount: Money;
  readonly includesTax: boolean;
  readonly validFrom: Date;
}
export interface PriceRule {
  readonly id: string;
  readonly type: "markup" | "margin" | "fixed" | "dynamic";
  readonly value: number;
  readonly active: boolean;
}
export interface Margin {
  readonly cost: Money;
  readonly sellingPrice: Money;
  readonly absolute: Money;
  readonly percentage: number;
}
export interface Promotion {
  readonly id: string;
  readonly type: "percentage" | "fixed" | "flash_sale";
  readonly value: number;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly active: boolean;
}
export interface CompetitorPrice {
  readonly productId: string;
  readonly competitor: string;
  readonly price: Money;
}
export interface PricingEngine {
  calculate(params: {
    productId: string;
    cost: Money;
    region: string;
  }): Promise<{ suggestedPrice: Price; margin: Margin }>;
}
