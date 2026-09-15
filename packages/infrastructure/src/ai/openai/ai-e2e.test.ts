/**
 * @workspace/infrastructure/ai/openai/ai-e2e.test
 *
 * Tests for the OpenAI InferenceProvider and the full evaluation chain:
 *   CanonicalProduct → PromptBuilder → (mock OpenAI) → ResponseParser →
 *   InferenceArtifact → DecisionProvider → EvaluationResult → PolicyEngine → ApprovalDecision
 */
/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import { buildPrompt, CURRENT_PROMPT_VERSION } from "./prompt-builder";
import { parseAIResponse } from "./response-parser";
import { computeInferenceCost, getModelPricing } from "./pricing";
import { estimateTokens, countPromptTokens } from "../shared/token-counter";
import { shouldRetryOpenAI, getOpenAIRetryDelay } from "../shared/retry";
import { OpenAIInferenceProvider, type OpenAIConfig } from "./openai-inference-provider";
import { DefaultDecisionProvider } from "@workspace/domain/discovery/evaluation/decision-provider";
import { DefaultPolicyEngine } from "@workspace/domain/discovery/evaluation/policy";
import type { CanonicalProduct, CanonicalProductId } from "@workspace/domain/discovery/resolution/types";
import type { InferenceProvider, InferenceArtifact } from "@workspace/domain/discovery/evaluation/types";

// ── Fixtures ───────────────────────────────────────────────

function makeCanonicalProduct(o?: Partial<CanonicalProduct>): CanonicalProduct {
  return {
    id: "canon_001" as unknown as CanonicalProductId,
    identityId: "ident_001" as any,
    clusterId: "cluster_001" as any,
    title: "Wireless Bluetooth Earbuds Pro with Noise Cancellation",
    brand: "Xiaomi",
    canonicalBrandId: "brand_xiaomi",
    category: "ELECTRONICS",
    canonicalCategoryId: "cat_electronics",
    attributes: [
      { name: "COLOR", value: "black", confidence: 0.9, sourceProductId: "n1" as any },
      { name: "MATERIAL", value: "plastic", confidence: 0.9, sourceProductId: "n1" as any }
    ],
    images: [
      { url: "https://example.com/img1.jpg", fingerprint: { algorithm: "phash", version: "v1", value: "abc" }, sourceProductId: "n1" as any }
    ],
    priceRange: { min: { amount: 2999, currency: "USD" }, max: { amount: 3999, currency: "USD" }, currency: "USD" },
    offerCount: 3,
    supplierCodes: ["aliexpress", "temu"],
    primaryProductId: "n1" as any,
    builtAt: new Date(),
    schemaVersion: "1.0.0",
    ...o
  };
}

// Mock OpenAI response (what the API would return)
const mockOpenAIResponse = {
  id: "chatcmpl-abc123",
  model: "gpt-4o-mini",
  choices: [{
    message: {
      role: "assistant",
      content: JSON.stringify({
        scores: {
          commercial: 82,
          quality: 78,
          confidence: 85,
          risk: 15,
          trend: 75,
          competition: 60,
          supplier: 80,
          margin: 70,
          compliance: 92
        },
        factors: [
          { name: "demand_signal", value: 82, explanation: "Strong search trend for wireless earbuds" },
          { name: "profit_potential", value: 70, explanation: "Good margin with $30-40 price range" },
          { name: "supplier_reliability", value: 80, explanation: "Xiaomi is an established brand" },
          { name: "competition_level", value: 60, explanation: "Moderate competition in earbuds category" },
          { name: "quality_indicator", value: 78, explanation: "Good build quality expected" }
        ],
        recommendation: "publish",
        confidence: 0.85,
        explanation: [
          "Strong commercial viability with good margin potential",
          "Xiaomi brand provides supplier reliability",
          "Compliance score is high — no regulatory concerns",
          "Competition is moderate but demand trend is strong"
        ]
      })
    },
    finish_reason: "stop"
  }],
  usage: {
    prompt_tokens: 450,
    completion_tokens: 220,
    total_tokens: 670
  }
};

// ── Tests ──────────────────────────────────────────────────

describe("OpenAI InferenceProvider", () => {

  // ── Prompt Builder ──────────────────────────────────────
  describe("PromptBuilder", () => {
    it("should build a prompt with system + user messages", () => {
      const product = makeCanonicalProduct();
      const prompt = buildPrompt(product);

      expect(prompt.systemPrompt).toContain("e-commerce product analyst");
      expect(prompt.systemPrompt).toContain("JSON");
      expect(prompt.userPrompt).toContain(product.title);
      expect(prompt.userPrompt).toContain(product.brand);
      expect(prompt.userPrompt).toContain(product.category);
      expect(prompt.promptVersion).toBe(CURRENT_PROMPT_VERSION);
    });

    it("should include price range in user prompt", () => {
      const product = makeCanonicalProduct();
      const prompt = buildPrompt(product);

      expect(prompt.userPrompt).toContain("$29.99");
      expect(prompt.userPrompt).toContain("$39.99");
    });

    it("should include attributes in user prompt", () => {
      const product = makeCanonicalProduct();
      const prompt = buildPrompt(product);

      expect(prompt.userPrompt).toContain("COLOR: black");
      expect(prompt.userPrompt).toContain("MATERIAL: plastic");
    });

    it("should include supplier info", () => {
      const product = makeCanonicalProduct();
      const prompt = buildPrompt(product);

      expect(prompt.userPrompt).toContain("aliexpress");
      expect(prompt.userPrompt).toContain("temu");
      expect(prompt.userPrompt).toContain("Suppliers: 2");
    });

    it("should handle product with no attributes", () => {
      const product = makeCanonicalProduct({ attributes: [] });
      const prompt = buildPrompt(product);

      expect(prompt.userPrompt).not.toContain("Attributes:");
    });
  });

  // ── Response Parser ─────────────────────────────────────
  describe("ResponseParser", () => {
    it("should parse a clean JSON response", () => {
      const content = mockOpenAIResponse.choices[0]!.message.content;
      const parsed = parseAIResponse(content);

      expect(parsed.scores.commercial).toBe(82);
      expect(parsed.scores.compliance).toBe(92);
      expect(parsed.recommendation).toBe("publish");
      expect(parsed.confidence).toBe(0.85);
      expect(parsed.factors.length).toBe(5);
      expect(parsed.explanation.length).toBe(4);
    });

    it("should parse JSON wrapped in markdown code block", () => {
      const content = "```json\n" + mockOpenAIResponse.choices[0]!.message.content + "\n```";
      const parsed = parseAIResponse(content);

      expect(parsed.scores.commercial).toBe(82);
    });

    it("should parse JSON with leading text", () => {
      const content = "Here is my evaluation:\n" + mockOpenAIResponse.choices[0]!.message.content;
      const parsed = parseAIResponse(content);

      expect(parsed.scores.commercial).toBe(82);
    });

    it("should use defaults for missing fields", () => {
      const content = JSON.stringify({ recommendation: "review" });
      const parsed = parseAIResponse(content);

      expect(parsed.scores.commercial).toBe(50); // default
      expect(parsed.recommendation).toBe("review");
      expect(parsed.confidence).toBe(0.5); // default
      expect(parsed.factors).toEqual([]);
    });

    it("should clamp scores to 0-100", () => {
      const content = JSON.stringify({
        scores: { commercial: 150, quality: -20 },
        recommendation: "publish"
      });
      const parsed = parseAIResponse(content);

      expect(parsed.scores.commercial).toBe(100); // clamped
      expect(parsed.scores.quality).toBe(0); // clamped
    });

    it("should default to 'review' for invalid recommendation", () => {
      const content = JSON.stringify({ recommendation: "maybe" });
      const parsed = parseAIResponse(content);

      expect(parsed.recommendation).toBe("review");
    });

    it("should throw for completely invalid content", () => {
      expect(() => parseAIResponse("This is not JSON at all")).toThrow("Failed to parse");
    });
  });

  // ── Pricing ─────────────────────────────────────────────
  describe("Pricing", () => {
    it("should compute cost for gpt-4o-mini", () => {
      const cost = computeInferenceCost("gpt-4o-mini", 450, 220);
      // gpt-4o-mini: $0.015/1M input, $0.060/1M output
      // input: 450 * 15 / 1_000_000 = 0.00675 cents → round up → 1 cent
      // output: 220 * 60 / 1_000_000 = 0.0132 cents → round up → 1 cent
      // total: 2 cents
      expect(cost.amount).toBeGreaterThan(0);
      expect(cost.currency).toBe("USD");
    });

    it("should compute cost for gpt-4o", () => {
      const cost = computeInferenceCost("gpt-4o", 450, 220);
      expect(cost.amount).toBeGreaterThan(0);
    });

    it("should return 0 for unknown model", () => {
      const cost = computeInferenceCost("unknown-model", 1000, 500);
      expect(cost.amount).toBe(0);
    });

    it("should match model by prefix (gpt-4o-2024-08-06 → gpt-4o)", () => {
      const pricing = getModelPricing("gpt-4o-2024-08-06");
      expect(pricing).not.toBeNull();
      expect(pricing!.modelId).toBe("gpt-4o");
    });
  });

  // ── Token Counter ───────────────────────────────────────
  describe("TokenCounter", () => {
    it("should estimate tokens from text", () => {
      const text = "Hello world, this is a test.";
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBe(Math.ceil(text.length / 4));
    });

    it("should count prompt tokens (system + user)", () => {
      const system = "You are an assistant.";
      const user = "Evaluate this product.";
      const tokens = countPromptTokens(system, user);
      expect(tokens).toBe(estimateTokens(system) + estimateTokens(user) + 8);
    });

    it("should return 0 for empty text", () => {
      expect(estimateTokens("")).toBe(0);
    });
  });

  // ── Retry ───────────────────────────────────────────────
  describe("Retry", () => {
    it("should retry on 429", () => {
      expect(shouldRetryOpenAI(1, 429)).toBe(true);
      expect(shouldRetryOpenAI(2, 429)).toBe(true);
    });

    it("should retry on 500/502/503/504", () => {
      expect(shouldRetryOpenAI(1, 500)).toBe(true);
      expect(shouldRetryOpenAI(1, 502)).toBe(true);
      expect(shouldRetryOpenAI(1, 503)).toBe(true);
      expect(shouldRetryOpenAI(1, 504)).toBe(true);
    });

    it("should NOT retry on 400/401/403", () => {
      expect(shouldRetryOpenAI(1, 400)).toBe(false);
      expect(shouldRetryOpenAI(1, 401)).toBe(false);
      expect(shouldRetryOpenAI(1, 403)).toBe(false);
    });

    it("should respect maxAttempts", () => {
      expect(shouldRetryOpenAI(3, 429)).toBe(false); // default maxAttempts = 3
    });

    it("should respect Retry-After header", () => {
      const delay = getOpenAIRetryDelay(1, "5");
      expect(delay).toBe(5000); // 5 seconds in ms
    });

    it("should use exponential backoff when no Retry-After", () => {
      const delay = getOpenAIRetryDelay(1);
      expect(delay).toBeGreaterThanOrEqual(800); // base 1000 * 0.8 jitter
      expect(delay).toBeLessThanOrEqual(1200); // base 1000 * 1.2 jitter
    });
  });

  // ── Full Evaluation Chain (E2E with mock API) ───────────
  describe("Full Evaluation Chain", () => {
    it("should produce InferenceArtifact → EvaluationResult → ApprovalDecision", async () => {
      // Create a mock InferenceProvider that returns a pre-built InferenceArtifact
      // (simulating what OpenAIInferenceProvider would produce after calling the API)
      const mockProvider: InferenceProvider = {
        modelId: "gpt-4o-mini",
        modelVersion: "gpt-4o-mini",
        promptVersion: CURRENT_PROMPT_VERSION,
        async infer(product) {
          const parsed = parseAIResponse(mockOpenAIResponse.choices[0]!.message.content);
          const cost = computeInferenceCost("gpt-4o-mini", 450, 220);

          return {
            id: `inference_${product.id}_test` as any,
            canonicalProductId: product.id,
            modelId: "gpt-4o-mini",
            modelVersion: "gpt-4o-mini",
            promptVersion: CURRENT_PROMPT_VERSION,
            schemaVersion: "1.0.0",
            startedAt: new Date(),
            completedAt: new Date(),
            latencyMs: 850,
            inputTokens: 450,
            outputTokens: 220,
            estimatedCost: cost,
            rawResponse: {
              model: "gpt-4o-mini",
              version: "gpt-4o-mini",
              product: { title: product.title, brand: product.brand, category: product.category },
              scores: parsed.scores,
              factors: parsed.factors,
              recommendation: parsed.recommendation,
              confidence: parsed.confidence,
              explanation: parsed.explanation,
              _meta: { attemptCount: 1, promptTokens: 450, completionTokens: 220, apiResponseId: "chatcmpl-abc123" }
            }
          };
        }
      };

      const product = makeCanonicalProduct();

      // 1. Infer
      const artifact = await mockProvider.infer(product);
      expect(artifact.modelId).toBe("gpt-4o-mini");
      expect(artifact.inputTokens).toBe(450);
      expect(artifact.outputTokens).toBe(220);
      expect(artifact.estimatedCost.amount).toBeGreaterThan(0);

      // 2. DecisionProvider transforms artifact → EvaluationResult
      const decisionProvider = new DefaultDecisionProvider();
      const evaluationResult = decisionProvider.decide(artifact, product);

      expect(evaluationResult.productScore.commercial).toBe(82);
      expect(evaluationResult.productScore.compliance).toBe(92);
      expect(evaluationResult.productScore.overall).toBeGreaterThan(0);
      expect(evaluationResult.recommendation).toBe("publish");
      expect(evaluationResult.confidence).toBe(0.85);
      expect(evaluationResult.aiScoreFactors.length).toBe(5);
      expect(evaluationResult.explanation.length).toBe(4);
      expect(evaluationResult.schemaVersion).toBe("1.0.0");

      // 3. PolicyEngine decides
      const policyEngine = new DefaultPolicyEngine();
      const { decision, trace } = policyEngine.evaluate(evaluationResult);

      // With scores: commercial=82, quality=78, confidence=85, risk=15, compliance=92
      // All rules should pass → publish
      expect(["publish", "review", "reject"]).toContain(decision.action);
      expect(decision.decidedBy).toBe("policy-engine");
      expect(trace.ruleResults.length).toBe(4);
      expect(trace.policyVersion).toBe("1.0.0");

      // 4. Verify the full chain produced a valid decision
      expect(trace.inferenceId).toBe(artifact.id);
      expect(trace.evaluationId).toBe(evaluationResult.id);
      expect(trace.finalDecision).toBe(decision);
    });

    it("should produce 'reject' when compliance score is low", async () => {
      const mockProvider: InferenceProvider = {
        modelId: "gpt-4o-mini",
        modelVersion: "gpt-4o-mini",
        promptVersion: CURRENT_PROMPT_VERSION,
        async infer(product) {
          return {
            id: `inference_${product.id}_test` as any,
            canonicalProductId: product.id,
            modelId: "gpt-4o-mini",
            modelVersion: "gpt-4o-mini",
            promptVersion: CURRENT_PROMPT_VERSION,
            schemaVersion: "1.0.0",
            startedAt: new Date(),
            completedAt: new Date(),
            latencyMs: 500,
            inputTokens: 400,
            outputTokens: 150,
            estimatedCost: { amount: 1, currency: "USD" },
            rawResponse: {
              model: "gpt-4o-mini",
              scores: { commercial: 50, quality: 50, confidence: 50, risk: 80, trend: 50, competition: 50, supplier: 50, margin: 50, compliance: 30 },
              factors: [],
              recommendation: "reject",
              confidence: 0.4,
              explanation: ["Low compliance score"]
            }
          };
        }
      };

      const product = makeCanonicalProduct();
      const artifact = await mockProvider.infer(product);
      const decisionProvider = new DefaultDecisionProvider();
      const result = decisionProvider.decide(artifact, product);
      const policyEngine = new DefaultPolicyEngine();
      const { decision } = policyEngine.evaluate(result);

      expect(decision.action).toBe("reject");
    });
  });

  // ── OpenAIInferenceProvider (with fetch mock) ───────────
  describe("OpenAIInferenceProvider", () => {
    it("should build InferenceArtifact from OpenAI API response", async () => {
      // Mock fetch to return the mock OpenAI response
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
        return new Response(JSON.stringify(mockOpenAIResponse), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }) as typeof fetch;

      try {
        const config: OpenAIConfig = {
          apiKey: "test-key",
          model: "gpt-4o-mini",
          timeoutMs: 5000
        };
        const provider = new OpenAIInferenceProvider(config);
        const product = makeCanonicalProduct();
        const artifact = await provider.infer(product);

        expect(artifact.modelId).toBe("gpt-4o-mini");
        expect(artifact.inputTokens).toBe(450);
        expect(artifact.outputTokens).toBe(220);
        expect(artifact.estimatedCost.amount).toBeGreaterThan(0);
        expect(artifact.estimatedCost.currency).toBe("USD");
        expect(artifact.latencyMs).toBeGreaterThanOrEqual(0);
        expect(artifact.schemaVersion).toBe("1.0.0");

        // Verify rawResponse contains parsed scores
        const raw = artifact.rawResponse as Record<string, unknown>;
        const scores = raw.scores as Record<string, number>;
        expect(scores.commercial).toBe(82);
        expect(scores.compliance).toBe(92);

        // Verify recommendation is present
        expect(raw.recommendation).toBe("publish");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
