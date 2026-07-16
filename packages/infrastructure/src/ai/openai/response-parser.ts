/**
 * @workspace/infrastructure/ai/openai/response-parser
 *
 * ResponseParser — parses the raw OpenAI Chat Completions API response
 * into the structured format that DecisionProvider expects.
 *
 * The parser handles:
 *   - JSON extraction from markdown code blocks (```json ... ```)
 *   - Malformed JSON (best-effort parsing)
 *   - Missing fields (defaults to neutral scores)
 *   - Multiple response formats (function calling vs plain text)
 *
 * The parser does NOT create InferenceArtifact — that's the provider's job.
 * The parser returns a clean ParsedAIResponse that the provider wraps.
 */
export interface ParsedAIResponse {
  scores: {
    commercial: number;
    quality: number;
    confidence: number;
    risk: number;
    trend: number;
    competition: number;
    supplier: number;
    margin: number;
    compliance: number;
  };
  factors: Array<{
    name: string;
    value: number;
    explanation: string;
  }>;
  recommendation: "publish" | "review" | "reject";
  confidence: number;
  explanation: string[];
}

const NEUTRAL_SCORES = {
  commercial: 50,
  quality: 50,
  confidence: 50,
  risk: 50,
  trend: 50,
  competition: 50,
  supplier: 50,
  margin: 50,
  compliance: 50
};

/**
 * Parse the content of an OpenAI response into a ParsedAIResponse.
 *
 * @param responseContent - The `choices[0].message.content` string from the API
 * @throws Error if the content cannot be parsed at all
 */
export function parseAIResponse(responseContent: string): ParsedAIResponse {
  const json = extractJson(responseContent);
  return mapToParsedResponse(json);
}

/**
 * Extract JSON from a string that may contain:
 *   - Plain JSON
 *   - JSON wrapped in ```json ... ``` markdown
 *   - JSON with leading/trailing text
 */
function extractJson(content: string): unknown {
  // Try direct parse
  try {
    return JSON.parse(content);
  } catch {
    // Continue to other strategies
  }

  // Try extracting from markdown code block
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]!.trim());
    } catch {
      // Continue
    }
  }

  // Try extracting the first { ... } block
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Continue
    }
  }

  throw new Error(`Failed to parse AI response as JSON: ${content.slice(0, 200)}...`);
}

/**
 * Map a parsed JSON object to ParsedAIResponse with defaults.
 */
function mapToParsedResponse(json: unknown): ParsedAIResponse {
  const obj = json as Record<string, unknown>;

  const scoresRaw = (obj.scores ?? {}) as Record<string, unknown>;
  const scores = {
    commercial: clampScore(scoresRaw.commercial),
    quality: clampScore(scoresRaw.quality),
    confidence: clampScore(scoresRaw.confidence),
    risk: clampScore(scoresRaw.risk),
    trend: clampScore(scoresRaw.trend),
    competition: clampScore(scoresRaw.competition),
    supplier: clampScore(scoresRaw.supplier),
    margin: clampScore(scoresRaw.margin),
    compliance: clampScore(scoresRaw.compliance)
  };

  const factorsRaw = Array.isArray(obj.factors) ? obj.factors : [];
  const factors = factorsRaw.map((f: unknown) => {
    const factor = f as Record<string, unknown>;
    return {
      name: String(factor.name ?? "unknown"),
      value: clampScore(factor.value),
      explanation: String(factor.explanation ?? "")
    };
  });

  const recommendation = (obj.recommendation === "publish" || obj.recommendation === "review" || obj.recommendation === "reject")
    ? obj.recommendation
    : "review";

  const confidence = typeof obj.confidence === "number"
    ? Math.max(0, Math.min(1, obj.confidence))
    : 0.5;

  const explanationRaw = Array.isArray(obj.explanation) ? obj.explanation : [];
  const explanation = explanationRaw.map((e: unknown) => String(e));

  return { scores, factors, recommendation, confidence, explanation };
}

/**
 * Clamp a value to 0-100 range, defaulting to 50 if invalid.
 */
function clampScore(value: unknown): number {
  if (typeof value !== "number" || isNaN(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}
