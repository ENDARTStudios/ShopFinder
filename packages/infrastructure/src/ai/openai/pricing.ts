/**
 * @workspace/infrastructure/ai/openai/pricing
 *
 * OpenAI model pricing per 1M tokens (in cents).
 * Used to compute estimatedCost for InferenceArtifact.
 *
 * Source: https://openai.com/pricing (as of 2025)
 * Prices are in USD cents per 1M tokens (to avoid floating-point).
 */
import type { Money } from "@workspace/domain/shared";

export interface ModelPricing {
  readonly modelId: string;
  readonly inputCostPer1M: number; // cents per 1M input tokens
  readonly outputCostPer1M: number; // cents per 1M output tokens
}

/**
 * Known model pricing (cents per 1M tokens).
 * Update when OpenAI changes prices.
 */
const PRICING_TABLE: Readonly<Record<string, ModelPricing>> = {
  "gpt-4o": { modelId: "gpt-4o", inputCostPer1M: 250, outputCostPer1M: 1000 },
  "gpt-4o-mini": { modelId: "gpt-4o-mini", inputCostPer1M: 15, outputCostPer1M: 60 },
  "gpt-4-turbo": { modelId: "gpt-4-turbo", inputCostPer1M: 1000, outputCostPer1M: 3000 },
  "gpt-4": { modelId: "gpt-4", inputCostPer1M: 3000, outputCostPer1M: 6000 },
  "gpt-3.5-turbo": { modelId: "gpt-3.5-turbo", inputCostPer1M: 50, outputCostPer1M: 150 },
  "o1": { modelId: "o1", inputCostPer1M: 1500, outputCostPer1M: 6000 },
  "o1-mini": { modelId: "o1-mini", inputCostPer1M: 300, outputCostPer1M: 1200 },
  "o3-mini": { modelId: "o3-mini", inputCostPer1M: 110, outputCostPer1M: 440 },
};

/**
 * Get pricing for a model. Returns null for unknown models.
 */
export function getModelPricing(modelId: string): ModelPricing | null {
  // Exact match
  if (PRICING_TABLE[modelId]) return PRICING_TABLE[modelId];

  // Prefix match (e.g., "gpt-4o-2024-08-06" matches "gpt-4o")
  for (const [key, pricing] of Object.entries(PRICING_TABLE)) {
    if (modelId.startsWith(key)) return pricing;
  }

  return null;
}

/**
 * Compute the estimated cost of an inference call.
 * Returns cost in cents (Money with amount in cents).
 */
export function computeInferenceCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): Money {
  const pricing = getModelPricing(modelId);

  if (!pricing) {
    // Unknown model — return 0 cost (will be logged for investigation)
    return { amount: 0, currency: "USD" };
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPer1M;
  const totalCents = Math.ceil(inputCost + outputCost); // round up to nearest cent

  return { amount: totalCents, currency: "USD" };
}

/**
 * List all known model IDs.
 */
export function getKnownModels(): ReadonlyArray<string> {
  return Object.keys(PRICING_TABLE);
}
