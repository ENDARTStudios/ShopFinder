/**
 * @workspace/infrastructure/ai
 *
 * AI provider implementations for the evaluation pipeline.
 *
 * Currently implements:
 *   - OpenAIInferenceProvider (GPT-4o, GPT-4o-mini, etc.)
 *
 * Future:
 *   - OllamaInferenceProvider (local models)
 *   - GeminiInferenceProvider
 *   - VLLMInferenceProvider (self-hosted)
 *
 * All implement the domain's InferenceProvider interface.
 */

// Shared
export { estimateTokens, countPromptTokens, countResponseTokens, type TokenCount } from "./shared/token-counter";
export { shouldRetryOpenAI, getOpenAIRetryDelay, sleep, type OpenAIRetryConfig, DefaultOpenAIRetry } from "./shared/retry";

// OpenAI
export { buildPrompt, CURRENT_PROMPT_VERSION, type BuiltPrompt } from "./openai/prompt-builder";
export { parseAIResponse, type ParsedAIResponse } from "./openai/response-parser";
export { computeInferenceCost, getModelPricing, getKnownModels, type ModelPricing } from "./openai/pricing";
export { OpenAIInferenceProvider, createOpenAIInferenceProvider, type OpenAIConfig } from "./openai/openai-inference-provider";
