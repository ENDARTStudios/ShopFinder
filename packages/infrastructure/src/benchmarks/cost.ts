/**
 * @workspace/infrastructure/benchmarks/cost
 *
 * Measures AI inference cost per product.
 */
import type { CostResult } from "./types";
import type { Money } from "@workspace/domain/shared";
import { computeInferenceCost, getModelPricing } from "../ai/openai/pricing";
import { formatMoney } from "./stats";

export class CostBenchmark {
  private inputTokens = 0;
  private outputTokens = 0;
  private productsEvaluated = 0;
  private model: string;

  constructor(model: string = "gpt-4o-mini") {
    this.model = model;
  }

  recordEvaluation(inputTokens: number, outputTokens: number): void {
    this.inputTokens += inputTokens;
    this.outputTokens += outputTokens;
    this.productsEvaluated++;
  }

  getResult(): CostResult {
    const totalCost = computeInferenceCost(this.model, this.inputTokens, this.outputTokens);
    const costPerProduct: Money = this.productsEvaluated > 0
      ? { amount: Math.ceil(totalCost.amount / this.productsEvaluated), currency: totalCost.currency }
      : { amount: 0, currency: totalCost.currency };
    const costPer1k: Money = { amount: costPerProduct.amount * 1000, currency: totalCost.currency };

    return {
      totalInputTokens: this.inputTokens,
      totalOutputTokens: this.outputTokens,
      totalCost,
      productsEvaluated: this.productsEvaluated,
      costPerProduct,
      costPer1kProducts: costPer1k,
      model: this.model,
    };
  }

  printReport(): void {
    const result = this.getResult();
    console.log("\n🤖 AI Cost:");
    console.log(`  Model: ${result.model}`);
    console.log(`  Products evaluated: ${result.productsEvaluated}`);
    console.log(`  Input tokens: ${result.totalInputTokens.toLocaleString()}`);
    console.log(`  Output tokens: ${result.totalOutputTokens.toLocaleString()}`);
    console.log(`  Total cost: ${formatMoney(result.totalCost.amount, result.totalCost.currency)}`);
    console.log(`  Cost per product: ${formatMoney(result.costPerProduct.amount, result.costPerProduct.currency)}`);
    console.log(`  Cost per 1k products: ${formatMoney(result.costPer1kProducts.amount, result.costPer1kProducts.currency)}`);
  }

  reset(): void {
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.productsEvaluated = 0;
  }
}
