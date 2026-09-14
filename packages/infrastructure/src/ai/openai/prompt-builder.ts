/**
 * @workspace/infrastructure/ai/openai/prompt-builder
 *
 * PromptBuilder — converts a CanonicalProduct into a structured prompt
 * for the OpenAI Chat Completions API.
 *
 * The prompt asks the model to evaluate the product and return a
 * structured JSON response with 9 score components, 5 AI factors,
 * a recommendation, confidence, and explanation.
 *
 * Separating the prompt from the provider allows:
 *   - Versioning prompts without changing the provider
 *   - Testing prompts independently
 *   - Swapping to a different model family without prompt changes
 */
import type { CanonicalProduct } from "@workspace/domain/discovery/resolution/types";

export interface BuiltPrompt {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly promptVersion: string;
  readonly modelHint: string;
}

export const CURRENT_PROMPT_VERSION = "v1";

const SYSTEM_PROMPT = `You are an expert e-commerce product analyst. Evaluate the following product for marketplace publication.

Return a JSON object with this exact structure:
{
  "scores": {
    "commercial": <0-100>,
    "quality": <0-100>,
    "confidence": <0-100>,
    "risk": <0-100, higher = more risky>,
    "trend": <0-100>,
    "competition": <0-100>,
    "supplier": <0-100>,
    "margin": <0-100>,
    "compliance": <0-100>
  },
  "factors": [
    { "name": "<string>", "value": <0-100>, "explanation": "<string>" }
  ],
  "recommendation": "publish" | "review" | "reject",
  "confidence": <0.0-1.0>,
  "explanation": ["<string>", "<string>"]
}

Guidelines:
- commercial: Market demand and sales potential
- quality: Product build quality and expected durability
- confidence: How confident you are in this evaluation
- risk: Likelihood of issues (counterfeit, safety, legal, returns)
- trend: Current market trend alignment
- competition: Level of competition (higher = more competitive)
- supplier: Supplier reliability based on available info
- margin: Profit potential after fees and shipping
- compliance: Regulatory and policy compliance
- recommendation: "publish" if all scores are good, "review" if uncertain, "reject" if risky
- Provide 3-5 factors with clear explanations
- Provide 2-4 explanation strings summarizing the evaluation

Return ONLY the JSON object. No markdown, no explanation outside the JSON.`;

/**
 * Build the evaluation prompt for a CanonicalProduct.
 */
export function buildPrompt(product: CanonicalProduct): BuiltPrompt {
  const userPrompt = buildUserPrompt(product);

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    promptVersion: CURRENT_PROMPT_VERSION,
    modelHint: "json"
  };
}

function buildUserPrompt(product: CanonicalProduct): string {
  const lines: string[] = [];

  lines.push("Evaluate this product for marketplace publication:");
  lines.push("");

  // Basic info
  lines.push(`Title: ${product.title}`);
  lines.push(`Brand: ${product.brand}`);
  lines.push(`Category: ${product.category}`);

  if (product.canonicalBrandId) {
    lines.push(`Brand ID: ${product.canonicalBrandId}`);
  }
  if (product.canonicalCategoryId) {
    lines.push(`Category ID: ${product.canonicalCategoryId}`);
  }

  // Price range
  lines.push(`Price Range: ${formatMoney(product.priceRange.min)} - ${formatMoney(product.priceRange.max)} ${product.priceRange.currency}`);

  // Suppliers
  lines.push(`Suppliers: ${product.supplierCodes.length} (${product.supplierCodes.join(", ")})`);
  lines.push(`Total Offers: ${product.offerCount}`);

  // Attributes
  if (product.attributes.length > 0) {
    lines.push("");
    lines.push("Attributes:");
    for (const attr of product.attributes.slice(0, 15)) {
      lines.push(`  ${attr.name}: ${attr.value}`);
    }
  }

  // Images
  if (product.images.length > 0) {
    lines.push("");
    lines.push(`Images: ${product.images.length} image(s) available`);
    lines.push(`Primary Image: ${product.images[0]!.url}`);
  }

  // Evaluation summary (if available from the catalog materializer)
  if (product.evaluationSummary) {
    lines.push("");
    lines.push("Previous Evaluation:");
    lines.push(`  Overall Score: ${product.evaluationSummary.overallScore}`);
    lines.push(`  Recommendation: ${product.evaluationSummary.recommendation}`);
    lines.push(`  Confidence: ${product.evaluationSummary.confidence}`);
  }

  lines.push("");
  lines.push("Provide your evaluation as the JSON object described in the system prompt.");

  return lines.join("\n");
}

function formatMoney(m: { amount: number; currency: string }): string {
  return `$${(m.amount / 100).toFixed(2)}`;
}
