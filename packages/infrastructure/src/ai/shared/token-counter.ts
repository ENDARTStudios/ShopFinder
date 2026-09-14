/**
 * @workspace/infrastructure/ai/shared/token-counter
 *
 * Token estimation for OpenAI models.
 * Uses a simple heuristic (4 chars ≈ 1 token) as a fallback.
 * Production should swap in tiktoken for exact counts.
 */
import type { ModelPricing } from "../openai/pricing";

export interface TokenCount {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

/**
 * Estimate token count from text.
 * Heuristic: ~4 characters per token (OpenAI's own approximation).
 * This is accurate enough for cost estimation and budget control.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Count tokens for a prompt (system + user messages).
 */
export function countPromptTokens(systemPrompt: string, userPrompt: string): number {
  return estimateTokens(systemPrompt) + estimateTokens(userPrompt) + 8; // +8 for message framing
}

/**
 * Count tokens for a response.
 */
export function countResponseTokens(responseText: string): number {
  return estimateTokens(responseText);
}
