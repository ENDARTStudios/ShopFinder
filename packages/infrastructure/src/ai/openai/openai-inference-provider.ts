/**
 * @workspace/infrastructure/ai/openai/openai-inference-provider
 *
 * OpenAIInferenceProvider — implements the domain's InferenceProvider
 * interface using the OpenAI Chat Completions API.
 *
 * Flow:
 *   CanonicalProduct → PromptBuilder → OpenAI API → ResponseParser → InferenceArtifact
 *
 * The provider ONLY does HTTP + orchestration. All transformation lives in:
 *   - prompt-builder.ts: CanonicalProduct → structured prompt
 *   - response-parser.ts: raw JSON → ParsedAIResponse
 *   - pricing.ts: token counts → estimated cost
 *   - token-counter.ts: text → token estimation
 *   - retry.ts: retry policy for 429/5xx
 *
 * The domain's DecisionProvider parses InferenceArtifact.rawResponse
 * (which contains the ParsedAIResponse) — nothing changes in the domain.
 */
import type {
  InferenceProvider,
  InferenceArtifact,
  InferenceId
} from "@workspace/domain/discovery/evaluation/types";
import type { CanonicalProduct } from "@workspace/domain/discovery/resolution/types";
import type { Money } from "@workspace/domain/shared";
import { buildPrompt } from "./prompt-builder";
import { parseAIResponse, type ParsedAIResponse } from "./response-parser";
import { computeInferenceCost } from "./pricing";
import { estimateTokens, countPromptTokens, countResponseTokens } from "../shared/token-counter";
import { shouldRetryOpenAI, getOpenAIRetryDelay, sleep, type OpenAIRetryConfig, DefaultOpenAIRetry } from "../shared/retry";

export interface OpenAIConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly retryConfig?: OpenAIRetryConfig;
}

/**
 * OpenAI Chat Completions API request shape.
 */
interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
}

/**
 * OpenAI Chat Completions API response shape (simplified).
 */
interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIInferenceProvider implements InferenceProvider {
  readonly modelId: string;
  readonly modelVersion: string;
  readonly promptVersion: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly temperature: number;
  private readonly maxTokens: number | undefined;
  private readonly retryConfig: OpenAIRetryConfig;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.modelId = config.model;
    this.modelVersion = config.model; // OpenAI uses model name as version
    this.baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
    this.timeoutMs = config.timeoutMs ?? 30000;
    this.temperature = config.temperature ?? 0.3;
    this.maxTokens = config.maxTokens;
    this.retryConfig = config.retryConfig ?? DefaultOpenAIRetry;

    // promptVersion is hardcoded from the PromptBuilder
    this.promptVersion = "v1"; // must match CURRENT_PROMPT_VERSION in prompt-builder.ts
  }

  async infer(product: CanonicalProduct): Promise<InferenceArtifact> {
    const startedAt = new Date();

    // 1. Build prompt
    const prompt = buildPrompt(product);
    const inputTokenEstimate = countPromptTokens(prompt.systemPrompt, prompt.userPrompt);

    // 2. Call OpenAI API with retry
    const { response, attemptCount } = await this.callWithRetry(prompt);

    const completedAt = new Date();

    // 3. Parse response
    const content = response.choices[0]?.message?.content ?? "";
    const parsedResponse = parseAIResponse(content);

    // 4. Count tokens (prefer API-reported usage, fallback to estimate)
    const inputTokens = response.usage?.prompt_tokens ?? inputTokenEstimate;
    const outputTokens = response.usage?.completion_tokens ?? countResponseTokens(content);

    // 5. Compute cost
    const estimatedCost = computeInferenceCost(this.modelId, inputTokens, outputTokens);

    // 6. Build InferenceArtifact
    const inferenceId = `inference_${product.id}_${Date.now()}` as unknown as InferenceId;

    return {
      id: inferenceId,
      canonicalProductId: product.id,
      modelId: this.modelId,
      modelVersion: this.modelVersion,
      promptVersion: prompt.promptVersion,
      schemaVersion: "1.0.0",
      startedAt,
      completedAt,
      latencyMs: completedAt.getTime() - startedAt.getTime(),
      inputTokens,
      outputTokens,
      estimatedCost,
      rawResponse: {
        model: this.modelId,
        version: this.modelVersion,
        product: {
          title: product.title,
          brand: product.brand,
          category: product.category
        },
        scores: parsedResponse.scores,
        factors: parsedResponse.factors,
        recommendation: parsedResponse.recommendation,
        confidence: parsedResponse.confidence,
        explanation: parsedResponse.explanation,
        _meta: {
          attemptCount,
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          apiResponseId: response.id
        }
      }
    };
  }

  /**
   * Call the OpenAI API with retry logic.
   */
  private async callWithRetry(prompt: ReturnType<typeof buildPrompt>): Promise<{
    response: ChatCompletionResponse;
    attemptCount: number;
  }> {
    let attempt = 0;

    while (true) {
      attempt++;
      try {
        const response = await this.callOpenAI(prompt);
        return { response, attemptCount: attempt };
      } catch (error) {
        const statusCode = (error as { status?: number }).status ?? 0;

        if (shouldRetryOpenAI(attempt, statusCode, this.retryConfig)) {
          const retryAfter = (error as { headers?: { get: (key: string) => string | null } })
            ?.headers?.get?.("retry-after") ?? undefined;
          const delay = getOpenAIRetryDelay(attempt, retryAfter, this.retryConfig);
          await sleep(delay);
          continue;
        }

        throw error;
      }
    }
  }

  /**
   * Make a single call to the OpenAI Chat Completions API.
   */
  private async callOpenAI(prompt: ReturnType<typeof buildPrompt>): Promise<ChatCompletionResponse> {
    const requestBody: ChatCompletionRequest = {
      model: this.modelId,
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: prompt.userPrompt }
      ],
      temperature: this.temperature,
      response_format: { type: "json_object" }
    };

    if (this.maxTokens) {
      requestBody.max_tokens = this.maxTokens;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.timeoutMs)
    });

    if (!response.ok) {
      const body = await response.text();
      const error = new Error(`OpenAI API error ${response.status}: ${body.slice(0, 200)}`) as Error & {
        status: number;
        headers: Headers;
      };
      error.status = response.status;
      error.headers = response.headers;
      throw error;
    }

    return response.json() as Promise<ChatCompletionResponse>;
  }
}

// ── Factory ────────────────────────────────────────────────

export function createOpenAIInferenceProvider(config: OpenAIConfig): InferenceProvider {
  return new OpenAIInferenceProvider(config);
}
