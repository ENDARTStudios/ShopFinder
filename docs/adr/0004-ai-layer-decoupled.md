# ADR-0004: Decoupled AI provider layer

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The platform will use LLMs for several features: product description generation, multilingual copy, customer-support chat, semantic search reranking, and product-tag extraction. The market for LLM providers is volatile: pricing, context windows, and quality change monthly. Locking the codebase to a single provider would be both a financial and a technical risk.

## Decision

Build a **decoupled AI layer** in `@workspace/ai` that exposes a single `LLMProvider` interface and one or more adapters:

```
@workspace/ai
├── src/
│   ├── index.ts              ← public API
│   ├── types.ts              ← LLMProvider, LLMMessage, LLMResponse, ...
│   ├── provider.ts           ← getProvider(name?) resolver
│   ├── adapters/
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   ├── zai.ts            ← uses z-ai-web-dev-sdk
│   │   └── local.ts          ← optional local model
│   └── prompts/              ← versioned prompt templates per use-case
└── tests/
```

Calling code (modules in `apps/web`) interacts only with the `LLMProvider` interface:

```ts
import { getProvider } from "@workspace/ai";

const llm = getProvider(); // resolves from AI_DEFAULT_PROVIDER env
const out = await llm.complete({
  messages: [{ role: "user", content: "..." }],
  temperature: 0.4
});
```

The active provider is selected via the `AI_DEFAULT_PROVIDER` env var. Per-call override is supported by passing an explicit name to `getProvider("anthropic")`.

The sandbox already ships `z-ai-web-dev-sdk`, so the `zai` adapter is the default in dev. In production, OpenAI/Anthropic/Z.ai can be swapped without touching call sites.

## Consequences

**Positive**

- Provider swaps are a config change, not a code change.
- A/B testing providers per use-case becomes possible (e.g., product description → OpenAI, support chat → Anthropic).
- Cost optimization: cheap providers for trivial tasks, premium providers for high-value tasks.
- The `z-ai-web-dev-sdk` constraint (server-side only) is enforced at the adapter boundary, not scattered across modules.

**Negative**

- Adapter maintenance: each provider has slightly different APIs (streaming, tool calls, vision). Adapters must be kept in sync.
- Feature lag: if a new provider API exposes a capability our interface doesn't model, we either extend the interface or skip the feature.

## Alternatives Considered

- **Vercel AI SDK** — viable and adopted as an option inside the adapters. The interface still decouples us from the SDK itself; if we want to swap SDKs later, only the adapters change.
- **Single-provider (OpenAI)** — rejected: financial and supply risk.
- **LangChain** — rejected: too many abstractions for our needs; we control prompt engineering directly.

## References

- Backlog item 18 (IA)
- `z-ai-web-dev-sdk` (sandbox-provided)
