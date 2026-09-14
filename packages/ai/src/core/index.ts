/**
 * @workspace/ai/core
 *
 * The LLMProvider interface that every adapter implements. Calling code
 * depends only on this interface — never on a specific provider SDK.
 */

export const PACKAGE_NAME = "@workspace/ai" as const;
export const PACKAGE_VERSION = "0.1.0" as const;

// ── Types ───────────────────────────────────────────────────

export type LLMRole = "system" | "user" | "assistant" | "tool";

export interface LLMMessage {
  role: LLMRole;
  content: string;
  toolCallId?: string;
}

export interface LLMCompleteRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number; // 0-2
  maxTokens?: number;
  stop?: string[];
  tools?: LLMTool[];
}

export interface LLMCompleteResponse {
  content: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  finishReason: "stop" | "length" | "tool_call" | "content_filter";
  toolCalls?: LLMToolCall[];
}

export interface LLMTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

export interface LLMToolCall {
  id: string;
  function: { name: string; arguments: string };
}

// ── Provider interface ──────────────────────────────────────

export interface LLMProvider {
  readonly name: string;
  complete(req: LLMCompleteRequest): Promise<LLMCompleteResponse>;
  stream?(req: LLMCompleteRequest): AsyncIterable<LLMStreamChunk>;
}

export interface LLMStreamChunk {
  contentDelta: string;
  finishReason?: "stop" | "length" | "tool_call";
}

// ── Provider registry ───────────────────────────────────────

export type ProviderName = "openai" | "anthropic" | "zai" | "local";

const registry = new Map<ProviderName, () => LLMProvider>();

export function registerProvider(name: ProviderName, factory: () => LLMProvider): void {
  registry.set(name, factory);
}

export function getProvider(name?: ProviderName): LLMProvider {
  const resolved = name ?? (process.env.AI_DEFAULT_PROVIDER as ProviderName | undefined) ?? "zai";
  const factory = registry.get(resolved);
  if (!factory) {
    throw new Error(`AI provider not registered: ${resolved}. Call registerProvider() first.`);
  }
  return factory();
}
